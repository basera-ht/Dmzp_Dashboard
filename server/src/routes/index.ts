import { Router } from 'express'
import chapterRoutes from './chapterRoutes.js'
import memberRoutes from './memberRoutes.js'
import eventRoutes from './eventRoutes.js'
import reportRoutes from './reportRoutes.js'
import userRoutes from './userRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import authRoutes from './authRoutes.js'
import formDataRoutes from './formDataRoutes.js'
import memberCardRoutes from './memberCardRoutes.js'
import automationRoutes from './automationRoutes.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

router.use('/auth', authRoutes)
// Vercel cron uses its own bearer secret; every interactive API below uses a session.
router.use('/automation', automationRoutes)
router.use(authMiddleware)
router.use('/chapters', requireAdmin, chapterRoutes)
router.use('/members', requireAdmin, memberRoutes)
router.use('/events', requireAdmin, eventRoutes)
router.use('/reports', requireAdmin, reportRoutes)
router.use('/users', userRoutes)
router.use('/dashboard', requireAdmin, dashboardRoutes)
router.use('/form-data', requireAdmin, formDataRoutes)
router.use('/member-card', requireAdmin, memberCardRoutes)

export default router
