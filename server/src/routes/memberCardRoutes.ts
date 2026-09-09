import { Router } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sendMembershipCard, generateMembershipCardPdfBuffer } from '../services/emailService.js'
import { db } from '../database/index.js'
import { members } from '../models/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()
const idSchema = z.coerce.number().int().positive()

async function memberForCard(value: unknown) {
  const parsed = idSchema.safeParse(value)
  if (!parsed.success) return null
  const [member] = await db.select().from(members).where(eq(members.id, parsed.data)).limit(1)
  return member || null
}

// This is admin-protected by the parent router. It never takes a caller-supplied
// destination or card content; all values are sourced from the member record.
router.get('/test', asyncHandler(async (_req, res) => {
  const testEmail = process.env.SMTP_USER
  if (!testEmail) return res.status(503).json({ success: false, error: 'Email service is not configured' })
  const result = await sendMembershipCard({ name: 'Test Member', email: testEmail, fees: 'yes' })
  res.status(result.success ? 200 : 503).json({ success: result.success, message: result.success ? 'Test email sent' : 'Email service unavailable' })
}))

router.get('/preview/:id', asyncHandler(async (req, res) => {
  const member = await memberForCard(req.params.id)
  if (!member) return res.status(404).json({ success: false, error: 'Member not found' })
  const pdfBuffer = await generateMembershipCardPdfBuffer({ name: member.name, email: member.email, fees: member.fees || 'no', id: String(member.id), bloodGroup: member.bloodGroup || '', address: member.address || '' })
  const safeName = member.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=DMZP_Card_${safeName}.pdf`)
  res.send(pdfBuffer)
}))

router.post('/send', asyncHandler(async (req, res) => {
  const member = await memberForCard(req.body?.memberId)
  if (!member) return res.status(404).json({ success: false, error: 'Member not found' })
  if (member.fees?.toLowerCase() !== 'yes') return res.status(403).json({ success: false, error: 'Membership card cannot be sent — payment is still pending.' })
  const result = await sendMembershipCard({ name: member.name, email: member.email, fees: member.fees, id: String(member.id), bloodGroup: member.bloodGroup || '', address: member.address || '' })
  res.status(result.success ? 200 : 503).json(result.success ? { success: true, message: 'Membership card sent' } : { success: false, error: 'Unable to send membership card' })
}))

export default router
