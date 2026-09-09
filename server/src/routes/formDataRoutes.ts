import { Router } from 'express'
import { z } from 'zod'
import { formDataController } from '../controllers/formDataController.js'
import { clearCache } from '../services/googleSheets.js'
import { asyncHandler, pagination } from '../middleware/index.js'

const router = Router()

const emailSchema = z.string().trim().email().max(255)

router.get('/stats', asyncHandler(async (req, res) => {
  const refresh = !!req.query.refresh
  if (refresh) {
    clearCache()
  }
  const result = await formDataController.getStats(refresh)
  res.status(result.success ? 200 : 500).json(result)
}))

router.get('/entries', asyncHandler(async (req, res) => {
  const refresh = !!req.query.refresh
  if (refresh) {
    clearCache()
  }
  const pageInfo = pagination(req, 50)
  if (!pageInfo) return res.status(400).json({ success: false, error: 'Invalid pagination' })
  const result = await formDataController.getEntries(pageInfo.page, pageInfo.limit, refresh)
  res.status(result.success ? 200 : 500).json(result)
}))

router.post('/hide', asyncHandler(async (req, res) => {
  const parsed = emailSchema.safeParse(req.body?.email)
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'A valid email is required' })
  }
  const result = await formDataController.hideEmail(parsed.data)
  res.status(result.success ? 200 : 500).json(result)
}))

export default router