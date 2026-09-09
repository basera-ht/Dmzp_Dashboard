import { Router } from 'express'
import { authController } from '../controllers/authController.js'
import { authMiddleware, clearAuthCookies, getAccessToken, getRefreshToken, revokeSessionToken, setAuthCookies } from '../middleware/auth.js'
import { loginRateLimiter, rateLimiter, asyncHandler } from '../middleware/index.js'
import type { AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const result = await authController.login(req.body?.email, req.body?.password)
  if (result.success && result.data?.session) setAuthCookies(res, result.data.session)
  if (result.success) delete result.data.session
  res.status(result.success ? 200 : 401).json(result)
}))

router.post('/register', rateLimiter, asyncHandler(async (req, res) => {
  const result = await authController.register(req.body || {})
  if (result.success && result.data?.session) setAuthCookies(res, result.data.session)
  if (result.success) delete result.data.session
  res.status(result.success ? 201 : 400).json(result)
}))

router.get('/me', authMiddleware, asyncHandler(async (req, res) => res.json(await authController.me(req as AuthRequest))))

router.post('/refresh', rateLimiter, asyncHandler(async (req, res) => {
  const result = await authController.refresh(getRefreshToken(req))
  if (result.success && result.data?.session) setAuthCookies(res, result.data.session)
  if (result.success) delete result.data.session
  res.status(result.success ? 200 : 401).json(result)
}))

router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  await revokeSessionToken(getAccessToken(req))
  await revokeSessionToken(getRefreshToken(req))
  clearAuthCookies(res)
  res.json({ success: true, message: 'Logged out successfully' })
}))

router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authController.changePassword(req as AuthRequest, req.body?.oldPassword, req.body?.newPassword)
  clearAuthCookies(res)
  res.status(result.success ? 200 : 400).json(result)
}))

export default router
