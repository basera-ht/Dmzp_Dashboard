import { Router } from 'express'
import { processAutomatedCards } from '../services/automationService.js'
import { getUnifiedEntries } from '../services/memberDataService.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

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
    return res.status(500).json({ error: 'Automation processing failed' })
  }
})

/**
 * Diagnostic endpoint — admin-only with production env-gating.
 * GET /api/automation/debug
 * Shows what the automation sees without actually sending emails.
 */
router.get('/debug', authMiddleware, requireAdmin, asyncHandler(async (_req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTOMATION_DEBUG !== 'true') {
    return res.status(404).json({ success: false, error: 'Not found' })
  }
  try {
    const entries = await getUnifiedEntries(true)

    const breakdown = entries.map(e => ({ source: e.source, alreadySent: e.cardSent, willProcess: Boolean(e.email && !e.cardSent && e.fees === 'yes') }))

    const summary = {
      totalUnified: entries.length,
      readyToSend: breakdown.filter(e => e.willProcess).length,
      alreadySentCount: breakdown.filter(e => e.alreadySent).length,
      pendingPayment: entries.filter(e => e.fees !== 'yes' && !e.cardSent).length,
    }

    return res.json({ summary, breakdown })
  } catch (error: any) {
    console.error('[Automation/Debug] Error:', error)
    return res.status(500).json({ success: false, error: 'Automation diagnostic failed' })
  }
}))

export default router
