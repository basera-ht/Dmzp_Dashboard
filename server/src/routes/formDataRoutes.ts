import { Router } from 'express'
import { formDataController } from '../controllers/formDataController.js'

const router = Router()

router.get('/stats', async (_req, res) => {
  const result = await formDataController.getStats()
  res.status(result.success ? 200 : 500).json(result)
})

router.get('/entries', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 50
  const result = await formDataController.getEntries(page, limit)
  res.status(result.success ? 200 : 500).json(result)
})

export default router