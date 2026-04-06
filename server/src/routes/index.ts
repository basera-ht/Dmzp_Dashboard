import { Router } from 'express'
import chapterRoutes from './chapterRoutes.js'
import memberRoutes from './memberRoutes.js'
import eventRoutes from './eventRoutes.js'
import reportRoutes from './reportRoutes.js'
import userRoutes from './userRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import authRoutes from './authRoutes.js'
import formDataRoutes from './formDataRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/chapters', chapterRoutes)
router.use('/members', memberRoutes)
router.use('/events', eventRoutes)
router.use('/reports', reportRoutes)
router.use('/users', userRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/form-data', formDataRoutes)

export default router
