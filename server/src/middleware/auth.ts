import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../database/index.js'
import { authSessions, users } from '../models/index.js'
import { config } from '../config/index.js'

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string; role: string }
}

const ACCESS_TTL_MS = 24 * 60 * 60 * 1000
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const ACCESS_COOKIE = 'dmzp_access'
export const REFRESH_COOKIE = 'dmzp_refresh'
type SessionType = 'access' | 'refresh'

function hashToken(token: string) {
  return crypto.createHmac('sha256', config.auth.tokenSecret).update(token).digest('hex')
}

function readCookies(req: Request): Record<string, string> {
  return (req.headers.cookie || '').split(';').reduce<Record<string, string>>((out, part) => {
    const index = part.indexOf('=')
    if (index > 0) out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
    return out
  }, {})
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax' as const, path: '/', maxAge }
}

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_TTL_MS))
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_TTL_MS))
}

export function clearAuthCookies(res: Response) {
  const options = { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax' as const, path: '/' }
  res.clearCookie(ACCESS_COOKIE, options)
  res.clearCookie(REFRESH_COOKIE, options)
}

async function issueToken(userId: number, type: SessionType, ttl: number) {
  const token = crypto.randomBytes(48).toString('base64url')
  await db.insert(authSessions).values({ tokenHash: hashToken(token), userId, type, expiresAt: new Date(Date.now() + ttl) })
  return token
}

export async function createSession(userId: number) {
  const [accessToken, refreshToken] = await Promise.all([issueToken(userId, 'access', ACCESS_TTL_MS), issueToken(userId, 'refresh', REFRESH_TTL_MS)])
  return { accessToken, refreshToken }
}

async function getSessionUser(token: string | undefined, type: SessionType) {
  if (!token) return null
  const result = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(authSessions).innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), eq(authSessions.type, type), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, new Date()))).limit(1)
  return result[0] || null
}

export async function rotateRefreshSession(refreshToken: string | undefined) {
  const user = await getSessionUser(refreshToken, 'refresh')
  if (!user || !refreshToken) return null
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.tokenHash, hashToken(refreshToken)))
  return { user, ...(await createSession(user.id)) }
}

export async function revokeSessionToken(token: string | undefined) {
  if (token) await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.tokenHash, hashToken(token)))
}

export async function revokeAllUserTokens(userId: number) {
  await db.update(authSessions).set({ revokedAt: new Date() }).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined
    const user = await getSessionUser(bearer || readCookies(req)[ACCESS_COOKIE], 'access')
    if (!user) return res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' })
    req.user = user
    next()
  } catch (error) { next(error) }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Insufficient permissions', code: 'FORBIDDEN' })
    next()
  }
}

export const requireAdmin = requireRole('Admin')
export function getRefreshToken(req: Request) { return readCookies(req)[REFRESH_COOKIE] }
export function getAccessToken(req: Request) {
  return req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : readCookies(req)[ACCESS_COOKIE]
}
