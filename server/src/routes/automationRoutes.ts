import { Router } from 'express'
import { processAutomatedCards } from '../services/automationService.js'
import { fetchFormData } from '../services/googleSheets.js'
import { db } from '../database/index.js'
import { membershipCardLogs } from '../models/index.js'
import { inArray } from 'drizzle-orm'

const router = Router()

/**
 * Endpoint for Vercel Cron to trigger automated membership card processing.
 * Protected by a secret token to prevent unauthorized access.
 */
router.get('/cron-run', async (req, res) => {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  // Basic security check
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Automation] Unauthorized cron attempt:', {
      hasSecret: !!cronSecret,
      authHeaderReceived: authHeader ? 'present' : 'missing',
      authMatch: authHeader === `Bearer ${cronSecret}`
    })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  console.log('[Automation] Cron triggered processing...')
  
  try {
    // Run the processing logic
    const result = await processAutomatedCards()
    
    return res.json({ 
      success: true, 
      message: 'Automation process triggered successfully',
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error: any) {
    console.error('[Automation] Cron execution failed:', error)
    return res.status(500).json({ error: error.message })
  }
})

/**
 * Diagnostic endpoint — no auth required so you can check state anytime.
 * GET /api/automation/debug
 * Shows what the automation sees without actually sending emails.
 */
router.get('/debug', async (_req, res) => {
  try {
    const data = await fetchFormData(true)
    const entries = data.allEntries

    const emails = entries.map(e => e.email).filter((e): e is string => !!e)

    const sentLogs = emails.length > 0
      ? await db.select({ email: membershipCardLogs.email }).from(membershipCardLogs).where(inArray(membershipCardLogs.email, emails))
      : []

    const sentEmails = new Set(sentLogs.map(l => l.email))

    const breakdown = entries.map(e => ({
      name: e.name,
      email: e.email || '(no email)',
      fees: e.fees,
      paymentProofStatus: e.paymentProofStatus,
      alreadySent: e.email ? sentEmails.has(e.email) : false,
      willProcess: e.email && !sentEmails.has(e.email) && e.fees === 'yes',
    }))

    const summary = {
      totalInSheet: entries.length,
      totalWithEmail: emails.length,
      alreadySentCount: sentLogs.length,
      pendingPayment: breakdown.filter(e => e.fees !== 'yes' && !e.alreadySent).length,
      readyToSend: breakdown.filter(e => e.willProcess).length,
      alreadySentEmails: sentLogs.map(l => l.email),
    }

    return res.json({ summary, breakdown })
  } catch (error: any) {
    console.error('[Automation/Debug] Error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
