import { Router } from 'express'
import { dashboardController } from '../controllers/index.js'

const router = Router()

router.get('/metrics', async (_req, res) => {
  const result = await dashboardController.getMetrics()
  res.json(result)
})

router.get('/demographics', async (_req, res) => {
  const result = await dashboardController.getDemographics()
  res.json(result)
})

router.get('/chapter-stats', async (_req, res) => {
  const result = await dashboardController.getChapterStats()
  res.json(result)
})

export default router
