import { Router } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sendMembershipCard, generateMembershipCardPdfBuffer } from '../services/emailService.js'
import { db } from '../database/index.js'
import { members, membershipCardLogs } from '../models/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getUnifiedEntries } from '../services/memberDataService.js'

const router = Router()
const idSchema = z.coerce.number().int().positive()

async function memberForCard(value: unknown) {
  const parsed = idSchema.safeParse(value)
  if (!parsed.success) return null
  const [member] = await db.select().from(members).where(eq(members.id, parsed.data)).limit(1)
  return member || null
}

/**
 * Look up a member by email across DB first, then unified (Sheet + DB) entries.
 * Returns a shape compatible with the membership card sender.
 */
async function memberByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  // Try DB first
  const [dbMember] = await db.select().from(members).where(eq(members.email, normalized)).limit(1)
  if (dbMember) return dbMember

  // Fall back to unified entries (includes Google Sheet data)
  const entries = await getUnifiedEntries(false)
  const entry = entries.find(e => e.email?.toLowerCase() === normalized)
  if (!entry) return null

  return {
    id: entry.id != null ? Number(entry.id) || 0 : 0,
    name: entry.name || '',
    email: entry.email || '',
    fees: entry.fees || 'no',
    bloodGroup: entry.bloodGroup || '',
    address: entry.address || '',
  }
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
  // Try ID-based lookup first, then fall back to email-based lookup.
  // This handles sheet-sourced entries whose 'id' is a row index, not a DB ID.
  let member: { id: number | string; name: string; email: string; fees?: string | null; bloodGroup?: string | null; address?: string | null } | null = await memberForCard(req.body?.memberId)
  if (!member && req.body?.email) {
    member = await memberByEmail(req.body.email)
  }
  if (!member) return res.status(404).json({ success: false, error: 'Member not found' })
  if (member.fees?.toLowerCase() !== 'yes') return res.status(403).json({ success: false, error: 'Membership card cannot be sent — payment is still pending.' })
  const result = await sendMembershipCard({ name: member.name, email: member.email, fees: member.fees, id: String(member.id), bloodGroup: member.bloodGroup || '', address: member.address || '' })
  if (result.success) {
    await db.insert(membershipCardLogs).values({ email: member.email.toLowerCase(), sentAt: new Date() }).catch(() => {})
  }
  res.status(result.success ? 200 : 503).json(result.success ? { success: true, message: 'Membership card sent' } : { success: false, error: 'Unable to send membership card' })
}))

export default router

