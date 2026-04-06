import { Router } from 'express'
import { authController } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimiter, loginRateLimiter } from '../middleware/rateLimiter.js'
import type { AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/login', rateLimiter, loginRateLimiter, async (req, res) => {
  const { email, password } = req.body
  const ip = req.ip || req.socket.remoteAddress
  
  const result = await authController.login(email, password, ip)
  res.status(result.success ? 200 : 401).json(result)
})

router.post('/register', rateLimiter, async (req, res) => {
  const { email, password, name } = req.body
  const result = await authController.register({ email, password, name })
  res.status(result.success ? 201 : 400).json(result)
})

router.get('/me', authMiddleware, async (req, res) => {
  const result = await authController.me(req as AuthRequest)
  res.status(result.success ? 200 : 401).json(result)
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  const result = await authController.refresh(refreshToken)
  res.status(result.success ? 200 : 401).json(result)
})

router.post('/logout', authMiddleware, async (req, res) => {
  const token = req.headers.authorization?.substring(7)
  const result = await authController.logout(token || '')
  res.status(result.success ? 200 : 500).json(result)
})

router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body
  const result = await authController.changePassword(req as AuthRequest, oldPassword, newPassword)
  res.status(result.success ? 200 : 400).json(result)
})

export default router
