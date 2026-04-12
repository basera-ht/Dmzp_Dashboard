import { Router } from 'express'
import { formDataController } from '../controllers/formDataController.js'
import { clearCache } from '../services/googleSheets.js'

const router = Router()

router.get('/stats', async (req, res) => {
  const refresh = !!req.query.refresh
  if (refresh) {
    clearCache()
  }
  const result = await formDataController.getStats(refresh)
  res.status(result.success ? 200 : 500).json(result)
})

router.get('/entries', async (req, res) => {
  const refresh = !!req.query.refresh
  if (refresh) {
    clearCache()
  }
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 50
  const result = await formDataController.getEntries(page, limit, refresh)
  res.status(result.success ? 200 : 500).json(result)
})

router.post('/hide', async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' })
  }
  const result = await formDataController.hideEmail(email)
  res.status(result.success ? 200 : 500).json(result)
})

export default router