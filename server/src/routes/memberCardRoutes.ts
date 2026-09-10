import { Router } from 'express'
import { z } from 'zod'
import { eq, ilike } from 'drizzle-orm'
import { sendMembershipCard, generateMembershipCardPdfBuffer } from '../services/emailService.js'
import { db } from '../database/index.js'
import { members, membershipCardLogs } from '../models/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getUnifiedEntries } from '../services/memberDataService.js'

const router = Router()
const idSchema = z.coerce.number().int().positive()

interface CardMember {
  id: string
  name: string
  email: string
  fees?: string | null
  bloodGroup?: string | null
  address?: string | null
}

async function memberForCard(value: unknown): Promise<CardMember | null> {
  const parsed = idSchema.safeParse(value)
  if (!parsed.success) return null
  const [member] = await db.select().from(members).where(eq(members.id, parsed.data)).limit(1)
  if (!member) return null
  return {
    id: String(member.id),
    name: member.name,
    email: member.email,
    fees: member.fees,
    bloodGroup: member.bloodGroup,
    address: member.address,
  }
}

/**
 * Look up a member by email across DB first, then unified (Sheet + DB) entries.
 * Returns a shape compatible with the membership card sender.
 */
async function memberByEmail(email: string): Promise<CardMember | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  // Try DB first
  const [dbMember] = await db.select().from(members).where(ilike(members.email, normalized)).limit(1)
  if (dbMember) {
    return {
      id: String(dbMember.id),
      name: dbMember.name,
      email: dbMember.email,
      fees: dbMember.fees,
      bloodGroup: dbMember.bloodGroup,
      address: dbMember.address,
    }
  }

  // Fall back to unified entries (includes Google Sheet data)
  let entries = await getUnifiedEntries(false)
  let entry = entries.find(e => e.email?.trim().toLowerCase() === normalized)
  if (!entry) {
    entries = await getUnifiedEntries(true)
    entry = entries.find(e => e.email?.trim().toLowerCase() === normalized)
  }
  if (!entry) return null

  return {
    id: entry.id != null ? String(entry.id) : '',
    name: entry.name || '',
    email: entry.email || '',
    fees: entry.fees || 'no',
    bloodGroup: entry.bloodGroup || '',
    address: entry.address || '',
  }
}

/**
 * Resolve member prioritizing email if provided.
 * This is critical because Google Sheet entries have row index IDs (like '096')
 * that collide with database member IDs (like 96).
 */
async function resolveMember(identifier: { id?: unknown; email?: unknown }): Promise<CardMember | null> {
  const email = typeof identifier.email === 'string' ? identifier.email.trim() : ''
  if (email) {
    const member = await memberByEmail(email)
    if (member) return member
  }

  if (identifier.id != null) {
    const dbMember = await memberForCard(identifier.id)
    if (dbMember) return dbMember

    const entries = await getUnifiedEntries(false)
    const entry = entries.find(e => String(e.id) === String(identifier.id))
    if (entry) {
      return {
        id: entry.id != null ? String(entry.id) : '',
        name: entry.name || '',
        email: entry.email || '',
        fees: entry.fees || 'no',
        bloodGroup: entry.bloodGroup || '',
        address: entry.address || '',
      }
    }
  }

  return null
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
  const email = typeof req.query.email === 'string' ? req.query.email : undefined
  const member = await resolveMember({ id: req.params.id, email })
  if (!member) return res.status(404).json({ success: false, error: 'Member not found' })
  const pdfBuffer = await generateMembershipCardPdfBuffer({
    name: member.name,
    email: member.email,
    fees: member.fees || 'no',
    id: member.id,
    bloodGroup: member.bloodGroup || '',
    address: member.address || '',
  })
  const safeName = member.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=DMZP_Card_${safeName}.pdf`)
  res.send(pdfBuffer)
}))

router.post('/send', asyncHandler(async (req, res) => {
  const member = await resolveMember({ id: req.body?.memberId, email: req.body?.email })
  if (!member) return res.status(404).json({ success: false, error: 'Member not found' })
  if (member.fees?.toLowerCase() !== 'yes') {
    return res.status(403).json({ success: false, error: 'Membership card cannot be sent — payment is still pending.' })
  }
  const result = await sendMembershipCard({
    name: member.name,
    email: member.email,
    fees: member.fees,
    id: member.id,
    bloodGroup: member.bloodGroup || '',
    address: member.address || '',
  })
  if (result.success) {
    await db.insert(membershipCardLogs).values({ email: member.email.toLowerCase(), sentAt: new Date() }).catch(() => {})
  }
  res.status(result.success ? 200 : 503).json(
    result.success
      ? { success: true, message: 'Membership card sent', messageId: result.messageId }
      : { success: false, error: result.error || 'Unable to send membership card' }
  )
}))

export default router

