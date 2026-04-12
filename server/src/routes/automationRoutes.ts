import { Router } from 'express'
import { processAutomatedCards } from '../services/automationService.js'

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
      authMatch: authHeader === `Bearer ${cronSecret}`
    })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  console.log('[Automation] Cron triggered processing...')
  
  try {
    // Run the processing logic
    await processAutomatedCards()
    
    return res.json({ 
      success: true, 
      message: 'Automation process triggered successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Automation] Cron execution failed:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
