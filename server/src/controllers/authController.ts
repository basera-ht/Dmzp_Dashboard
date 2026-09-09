import { eq } from 'drizzle-orm'
import { db } from '../database/index.js'
import { users } from '../models/index.js'
import { hashPassword, sanitizeInput, isValidEmail, verifyPassword } from '../utils/security.js'
import { createSession, revokeAllUserTokens, rotateRefreshSession } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import type { ApiResponse } from '../types/index.js'

const passwordIsStrong = (password: unknown): password is string => typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
const userResponse = (user: { id: number; email: string; name: string; role: string }) => ({ id: user.id, email: user.email, name: user.name, role: user.role })

export const authController = {
  async login(email: unknown, password: unknown): Promise<ApiResponse<any>> {
    if (typeof email !== 'string' || typeof password !== 'string') return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
    const sanitizedEmail = sanitizeInput(email).toLowerCase()
    if (!isValidEmail(sanitizedEmail)) return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
    const result = await db.select().from(users).where(eq(users.email, sanitizedEmail)).limit(1)
    const user = result[0]
    if (!user) return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
    const [storedHash, salt] = user.password.split(':')
    if (!salt || !verifyPassword(password, storedHash, salt)) return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
    const session = await createSession(user.id)
    return { success: true, data: { user: userResponse(user), session } }
  },

  async register(data: { email?: unknown; password?: unknown; name?: unknown }): Promise<ApiResponse<any>> {
    if (typeof data.email !== 'string' || typeof data.name !== 'string' || !passwordIsStrong(data.password)) return { success: false, error: 'Use a valid email, name, and strong password', code: 'INVALID_REGISTRATION' }
    const email = sanitizeInput(data.email).toLowerCase()
    const name = sanitizeInput(data.name)
    if (!isValidEmail(email) || name.length < 2) return { success: false, error: 'Invalid registration details', code: 'INVALID_REGISTRATION' }
    if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)).length) return { success: false, error: 'Email already registered', code: 'EMAIL_EXISTS' }
    const { hash, salt } = hashPassword(data.password)
    const [user] = await db.insert(users).values({ email, name, password: `${hash}:${salt}`, role: 'User' }).returning()
    const session = await createSession(user.id)
    return { success: true, data: { user: userResponse(user), session } }
  },

  async me(req: AuthRequest): Promise<ApiResponse<any>> {
    return req.user ? { success: true, data: userResponse(req.user) } : { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  },

  async refresh(refreshToken: string | undefined): Promise<ApiResponse<any>> {
    const session = await rotateRefreshSession(refreshToken)
    if (!session) return { success: false, error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' }
    return { success: true, data: { user: userResponse(session.user), session: { accessToken: session.accessToken, refreshToken: session.refreshToken } } }
  },

  async changePassword(req: AuthRequest, oldPassword: unknown, newPassword: unknown): Promise<ApiResponse<any>> {
    if (!req.user || typeof oldPassword !== 'string' || !passwordIsStrong(newPassword)) return { success: false, error: 'Invalid password change request', code: 'INVALID_PASSWORD' }
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1)
    if (!user) return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
    const [storedHash, salt] = user.password.split(':')
    if (!salt || !verifyPassword(oldPassword, storedHash, salt)) return { success: false, error: 'Current password is incorrect', code: 'INVALID_PASSWORD' }
    const { hash, salt: newSalt } = hashPassword(newPassword)
    await db.update(users).set({ password: `${hash}:${newSalt}`, updatedAt: new Date() }).where(eq(users.id, user.id))
    await revokeAllUserTokens(user.id)
    return { success: true, message: 'Password changed successfully' }
  },
}
