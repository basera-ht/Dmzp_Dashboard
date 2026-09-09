import { Router } from 'express'
import { z } from 'zod'
import { userController } from '../controllers/index.js'
import { asyncHandler, requireAdmin } from '../middleware/index.js'
import type { AuthRequest } from '../middleware/auth.js'

const router = Router()
const profileSchema = z.object({ name: z.string().trim().min(2).max(255), email: z.string().trim().email().max(255) }).strict()
const settingsSchema = z.object({
  emailNotifications: z.boolean().optional(), newMemberAlerts: z.boolean().optional(), weeklyReports: z.boolean().optional(),
  chapterActivityUpdates: z.boolean().optional(), language: z.string().trim().min(1).max(50).optional(), timezone: z.string().trim().min(1).max(50).optional(), dateFormat: z.string().trim().min(1).max(50).optional(),
}).strict()

router.get('/profile/me', asyncHandler(async (req, res) => res.json(await userController.getProfile((req as AuthRequest).user!.id))))
router.put('/profile/me', asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid profile data' })
  res.json(await userController.updateProfile((req as AuthRequest).user!.id, parsed.data))
}))
router.get('/settings/me', asyncHandler(async (req, res) => res.json(await userController.getSettings((req as AuthRequest).user!.id))))
router.put('/settings/me', asyncHandler(async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid settings data' })
  res.json(await userController.updateSettings((req as AuthRequest).user!.id, parsed.data))
}))

// Administrative lookup remains explicitly privileged; generic user edits and role
// changes are intentionally not exposed through this API.
router.get('/profile/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: 'Invalid user id' })
  res.json(await userController.getProfile(id))
}))
export default router
