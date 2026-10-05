import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { tourController } from '../controllers/tourController.js'
import { uploadFileToS3 } from '../services/s3Service.js'
import { generateTourTicketPdfBuffer } from '../services/tourTicketService.js'
import { asyncHandler } from '../middleware/index.js'

const router = Router()

// ── IP-based rate limiting for public tour registrations ─────────────────────
const regRateLimitStore: Record<string, { count: number; resetTime: number }> = {}
const REG_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_REGISTRATIONS_PER_WINDOW = 20

function registrationRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()

  const entry = regRateLimitStore[ip]
  if (entry && now > entry.resetTime) {
    delete regRateLimitStore[ip]
  }

  if (!regRateLimitStore[ip]) {
    regRateLimitStore[ip] = { count: 1, resetTime: now + REG_WINDOW_MS }
    return next()
  }

  regRateLimitStore[ip].count++
  if (regRateLimitStore[ip].count > MAX_REGISTRATIONS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'Too many registration attempts from this IP. Please try again later.',
      code: 'REGISTRATION_RATE_LIMITED',
    })
  }
  next()
}

// Periodic cleanup of expired rate limit entries
const regCleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const ip in regRateLimitStore) {
    if (now > regRateLimitStore[ip].resetTime) {
      delete regRateLimitStore[ip]
    }
  }
}, REG_WINDOW_MS)
if (regCleanupTimer.unref) {
  regCleanupTimer.unref()
}

const registrationSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().trim().email('Invalid email').max(255),
  phoneNumber: z.string().trim().min(10, 'Phone number must be at least 10 digits').max(50),
  customResponses: z.record(z.string(), z.string()).optional(),
  upiTransactionId: z.string().trim().max(100).optional(),
  dmzpFeesPaid: z.enum(['yes', 'no']),
})

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPG, PNG, WebP, and GIF images are allowed'))
  },
}).fields([
  { name: 'paymentScreenshot', maxCount: 1 },
  { name: 'dmzpCard', maxCount: 1 },
])

// ── Public: Get published tour by slug ─────────────────────────────────────

router.get(['/:slug', '/t/:slug'], asyncHandler(async (req, res) => {
  const slug = req.params.slug as string
  const result = await tourController.getBySlug(slug)
  if (!result.success || !result.data) return res.status(404).json({ success: false, error: 'Tour not found' })

  // Only show published tours to the public
  if (result.data.status !== 'published') return res.status(404).json({ success: false, error: 'Tour not found' })

  res.json(result)
}))

// ── Public: Submit registration ────────────────────────────────────────────

router.post(
  ['/:slug/register', '/t/:slug/register'],
  registrationRateLimiter,
  screenshotUpload,
  asyncHandler(async (req, res) => {
    const slug = req.params.slug as string
    const tourResult = await tourController.getBySlug(slug)
    if (!tourResult.success || !tourResult.data) return res.status(404).json({ success: false, error: 'Tour not found' })
    if (tourResult.data.status !== 'published') return res.status(404).json({ success: false, error: 'Tour not available for registration' })

    const tour = tourResult.data

    // Anti-bot honeypot verification check
    if (req.body.hp || req.body.website || req.body.company_fax) {
      return res.status(400).json({ success: false, error: 'Verification failed' })
    }

    // Parse body — multer puts fields as strings
    let body: Record<string, any>
    try {
      body = {
        fullName: req.body.fullName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        customResponses: req.body.customResponses ? JSON.parse(req.body.customResponses) : {},
        upiTransactionId: req.body.upiTransactionId || undefined,
        dmzpFeesPaid: req.body.dmzpFeesPaid,
      }
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid form data' })
    }

    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid registration data' })

    // Requirement: Payment screenshot is MANDATORY for paid tours
    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const paymentFile = files?.paymentScreenshot?.[0]
    const dmzpCardFile = files?.dmzpCard?.[0]

    if (tour.isPaid && tour.price > 0) {
      if (!paymentFile) {
        return res.status(400).json({
          success: false,
          error: 'Payment screenshot is required for paid tour registration',
        })
      }
    }

    // Requirement: DMZP Card is required if participant selected 'yes' for DMZP fees paid
    if (parsed.data.dmzpFeesPaid === 'yes' && !dmzpCardFile) {
      return res.status(400).json({
        success: false,
        error: 'DMZP member card upload is required when selecting Yes for DMZP membership fees',
      })
    }

    // Process file upload ONLY if the tour is paid; skip storing file for free tours
    let paymentScreenshotUrl: string | undefined
    if (tour.isPaid && paymentFile) {
      const uploadResult = await uploadFileToS3(paymentFile.buffer, paymentFile.originalname, paymentFile.mimetype, 'tours/receipts')
      if (!uploadResult.success || !uploadResult.url) {
        return res.status(500).json({ success: false, error: 'Failed to process and store payment screenshot. Please try again.' })
      }
      paymentScreenshotUrl = uploadResult.url
    }

    // Process DMZP card or fee payment screenshot if provided
    let dmzpCardUrl: string | undefined
    if (dmzpCardFile) {
      const uploadResult = await uploadFileToS3(dmzpCardFile.buffer, dmzpCardFile.originalname, dmzpCardFile.mimetype, 'tours/dmzp-cards')
      if (!uploadResult.success || !uploadResult.url) {
        return res.status(500).json({ success: false, error: 'Failed to upload DMZP membership proof. Please try again.' })
      }
      dmzpCardUrl = uploadResult.url
    }
    const dmzpFeesPaid = parsed.data.dmzpFeesPaid === 'yes'

    // Amount paid is strictly authoritative based on tour.price and tour.isPaid (ignoring req.body.amountPaid)
    const authoritativeAmount = tour.isPaid ? tour.price : 0

    // Atomic capacity check and insertion using row lock in transaction
    const registrationResult = await tourController.registerWithCapacityCheck(tour.id, {
      tourId: tour.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phoneNumber: parsed.data.phoneNumber,
      customResponses: parsed.data.customResponses || {},
      amountPaid: authoritativeAmount,
      upiTransactionId: parsed.data.upiTransactionId || null,
      paymentScreenshotUrl: paymentScreenshotUrl || null,
      dmzpFeesPaid,
      dmzpCardUrl: dmzpCardUrl || null,
      paymentStatus: tour.isPaid ? 'pending_verification' : 'verified',
    })

    if (!registrationResult.success) {
      return res.status(400).json(registrationResult)
    }

    res.status(201).json(registrationResult)
  })
)

// ── Public: View Ticket Details ───────────────────────────────────────────

router.get('/registrations/t/:ticketCode/ticket', asyncHandler(async (req, res) => {
  const ticketCode = (req.params.ticketCode as string).trim()
  if (!ticketCode) return res.status(400).json({ success: false, error: 'Invalid ticket code' })

  const result = await tourController.getRegistrationByTicketCode(ticketCode)
  if (!result.success) return res.status(404).json(result)

  // Only allow ticket access for verified (approved) registrations
  if (result.data!.registration.paymentStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      error: 'Ticket is not available yet. Your registration is pending verification by the admin.',
      code: 'TICKET_NOT_APPROVED',
    })
  }

  res.json(result)
}))

// ── Public: Download Ticket PDF ───────────────────────────────────────────

router.get('/registrations/t/:ticketCode/ticket/pdf', asyncHandler(async (req, res) => {
  const ticketCode = (req.params.ticketCode as string).trim()
  if (!ticketCode) return res.status(400).json({ success: false, error: 'Invalid ticket code' })

  const result = await tourController.getRegistrationByTicketCode(ticketCode)
  if (!result.success || !result.data) return res.status(404).json({ success: false, error: 'Ticket not found' })

  // Only allow PDF download for verified (approved) registrations
  if (result.data.registration.paymentStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      error: 'Ticket PDF is not available until your registration is approved.',
      code: 'TICKET_NOT_APPROVED',
    })
  }

  const { tour, registration } = result.data
  const pdfBuffer = await generateTourTicketPdfBuffer(tour, registration)

  const safeTitle = tour.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
  const safeName = registration.fullName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="DMZP_Ticket_${safeTitle}_${safeName}.pdf"`)
  res.send(pdfBuffer)
}))

// ── Legacy Compatibility: View Ticket Details by ID ───────────────────────

router.get('/registrations/:id/ticket', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!id || isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid registration ID' })

  const result = await tourController.getRegistrationById(id)
  if (!result.success || !result.data) return res.status(404).json(result)

  // Only allow ticket access for verified (approved) registrations
  if (result.data.registration.paymentStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      error: 'Ticket is not available yet. Your registration is pending verification by the admin.',
      code: 'TICKET_NOT_APPROVED',
    })
  }

  if (result.data.registration.ticketCode) {
    return res.redirect(301, `${req.baseUrl}/registrations/t/${encodeURIComponent(result.data.registration.ticketCode)}/ticket`)
  }

  res.json(result)
}))

// ── Legacy Compatibility: Download Ticket PDF by ID ───────────────────────

router.get('/registrations/:id/ticket/pdf', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!id || isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid registration ID' })

  const result = await tourController.getRegistrationById(id)
  if (!result.success || !result.data) return res.status(404).json({ success: false, error: 'Ticket not found' })

  // Only allow PDF download for verified (approved) registrations
  if (result.data.registration.paymentStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      error: 'Ticket PDF is not available until your registration is approved.',
      code: 'TICKET_NOT_APPROVED',
    })
  }

  if (result.data.registration.ticketCode) {
    return res.redirect(301, `${req.baseUrl}/registrations/t/${encodeURIComponent(result.data.registration.ticketCode)}/ticket/pdf`)
  }

  const { tour, registration } = result.data
  const pdfBuffer = await generateTourTicketPdfBuffer(tour, registration)

  const safeTitle = tour.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
  const safeName = registration.fullName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="DMZP_Ticket_${safeTitle}_${safeName}.pdf"`)
  res.send(pdfBuffer)
}))

export default router
