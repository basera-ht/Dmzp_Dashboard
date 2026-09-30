import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { tourController } from '../controllers/tourController.js'
import { uploadFileToS3 } from '../services/s3Service.js'
import { positiveIdParam, pagination, asyncHandler } from '../middleware/index.js'

const router = Router()
router.param('id', positiveIdParam())

const tourCreateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid start date'),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid end date'),
  location: z.string().trim().min(1).max(255),
  capacity: z.number().int().min(0).optional(),
  isPaid: z.boolean().optional(),
  price: z.number().int().min(0).optional(),
  upiId: z.string().trim().max(255).nullable().optional(),
  upiQrImage: z.string().max(500).nullable().optional(),
  customFormFields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['text', 'select', 'textarea']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  coverImage: z.string().max(500).nullable().optional(),
})

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPG, PNG, WebP, and GIF images are allowed'))
  },
})

// ── General Image Upload (for place photo before/after tour creation) ──────

router.post('/upload-cover', imageUpload.single('cover'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })

  const uploadResult = await uploadFileToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'tours')
  if (!uploadResult.success || !uploadResult.url) {
    return res.status(500).json({ success: false, error: 'Upload failed' })
  }

  res.json({ success: true, data: { url: uploadResult.url } })
}))

// ── Tour CRUD (Admin) ────────────────────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const pageInfo = pagination(req)
  if (!pageInfo) return res.status(400).json({ success: false, error: 'Invalid pagination' })
  const result = await tourController.getAll(pageInfo.page, pageInfo.limit)
  res.json(result)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await tourController.getById(id)
  if (!result.success) return res.status(404).json(result)
  res.json(result)
}))

router.post('/', asyncHandler(async (req, res) => {
  const parsed = tourCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid payload' })

  const { startDate, endDate, ...rest } = parsed.data
  const result = await tourController.create({
    ...rest,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })
  res.status(201).json(result)
}))

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const parsed = tourCreateSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid payload' })

  const updateData: Record<string, any> = { ...parsed.data }
  if (parsed.data.startDate) updateData.startDate = new Date(parsed.data.startDate)
  if (parsed.data.endDate) updateData.endDate = new Date(parsed.data.endDate)

  const result = await tourController.update(id, updateData)
  if (!result.success) return res.status(404).json(result)
  res.json(result)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await tourController.delete(id)
  if (!result.success) return res.status(404).json(result)
  res.json(result)
}))

// ── Image upload for specific tour cover ──────────────────────────────────

router.post('/:id/cover', imageUpload.single('cover'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const existing = await tourController.getById(id)
  if (!existing.success) return res.status(404).json({ success: false, error: 'Tour not found' })

  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })

  const uploadResult = await uploadFileToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'tours')
  if (!uploadResult.success || !uploadResult.url) return res.status(500).json({ success: false, error: 'Upload failed' })

  const result = await tourController.update(id, { coverImage: uploadResult.url })
  res.json(result)
}))

// ── UPI QR image upload ──────────────────────────────────────────────────

router.post('/:id/qr-image', imageUpload.single('qrImage'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const existing = await tourController.getById(id)
  if (!existing.success) return res.status(404).json({ success: false, error: 'Tour not found' })

  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })

  const uploadResult = await uploadFileToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'tours/qr')
  if (!uploadResult.success || !uploadResult.url) return res.status(500).json({ success: false, error: 'Upload failed' })

  const result = await tourController.update(id, { upiQrImage: uploadResult.url })
  res.json(result)
}))

// ── Registration management (Admin) ──────────────────────────────────────

router.get('/:id/registrations', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const pageInfo = pagination(req)
  if (!pageInfo) return res.status(400).json({ success: false, error: 'Invalid pagination' })
  const result = await tourController.getRegistrations(id, pageInfo.page, pageInfo.limit)
  res.json(result)
}))

router.get('/:id/registrations/stats', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await tourController.getRegistrationStats(id)
  res.json(result)
}))

router.patch('/registrations/:id/approve', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await tourController.updatePaymentStatus(id, 'verified')
  if (!result.success) return res.status(404).json(result)
  res.json(result)
}))

router.patch('/registrations/:id/reject', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await tourController.updatePaymentStatus(id, 'rejected')
  if (!result.success) return res.status(404).json(result)
  res.json(result)
}))

export default router
