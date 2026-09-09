import { Router } from 'express'
import { dashboardController } from '../controllers/index.js'
import { asyncHandler } from '../middleware/index.js'

const router = Router()

router.get('/metrics', asyncHandler(async (_req, res) => {
  const result = await dashboardController.getMetrics()
  res.json(result)
}))

router.get('/demographics', asyncHandler(async (_req, res) => {
  const result = await dashboardController.getDemographics()
  res.json(result)
}))

router.get('/chapter-stats', asyncHandler(async (_req, res) => {
  const result = await dashboardController.getChapterStats()
  res.json(result)
}))

export default router
