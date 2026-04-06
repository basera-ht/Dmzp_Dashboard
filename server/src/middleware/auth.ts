import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    name: string
    role: string
  }
  tokenVersion?: number
}

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000

const tokens: Map<string, { userId: number; expiresAt: number; tokenVersion: number }> = new Map()
const refreshTokens: Map<string, { userId: number; expiresAt: number }> = new Map()
const userTokenVersions: Map<number, number> = new Map()

export function generateTokens(userId: number, userData: { id: number; email: string; name: string; role: string }) {
  const tokenVersion = (userTokenVersions.get(userId) || 0) + 1
  userTokenVersions.set(userId, tokenVersion)

  const token = Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64url')
  const refreshToken = Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64url')

  tokens.set(token, {
    userId,
    expiresAt: Date.now() + TOKEN_EXPIRY,
    tokenVersion,
  })

  refreshTokens.set(refreshToken, {
    userId,
    expiresAt: Date.now() + REFRESH_TOKEN_EXPIRY,
  })

  return {
    token,
    refreshToken,
    expiresIn: TOKEN_EXPIRY,
    user: userData,
  }
}

export function verifyToken(token: string): AuthRequest['user'] | null {
  const tokenData = tokens.get(token)
  
  if (!tokenData) return null
  if (Date.now() > tokenData.expiresAt) {
    tokens.delete(token)
    return null
  }

  const currentVersion = userTokenVersions.get(tokenData.userId)
  if (currentVersion !== tokenData.tokenVersion) {
    tokens.delete(token)
    return null
  }

  return { id: tokenData.userId } as AuthRequest['user']
}

export function refreshAccessToken(refreshToken: string): { token: string; expiresIn: number } | null {
  const tokenData = refreshTokens.get(refreshToken)
  
  if (!tokenData) return null
  if (Date.now() > tokenData.expiresAt) {
    refreshTokens.delete(refreshToken)
    return null
  }

  const newToken = Buffer.from(`${tokenData.userId}:${Date.now()}:${Math.random()}`).toString('base64url')
  
  tokens.set(newToken, {
    userId: tokenData.userId,
    expiresAt: Date.now() + TOKEN_EXPIRY,
    tokenVersion: userTokenVersions.get(tokenData.userId) || 1,
  })

  return {
    token: newToken,
    expiresIn: TOKEN_EXPIRY,
  }
}

export function revokeToken(token: string): boolean {
  return tokens.delete(token)
}

export function revokeAllUserTokens(userId: number): void {
  for (const [token, data] of tokens.entries()) {
    if (data.userId === userId) {
      tokens.delete(token)
    }
  }
  for (const [refreshToken, data] of refreshTokens.entries()) {
    if (data.userId === userId) {
      refreshTokens.delete(refreshToken)
    }
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
      code: 'NO_TOKEN',
    })
  }

  const token = authHeader.substring(7)
  const user = verifyToken(token)

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    })
  }

  req.user = user
  next()
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (user) {
      req.user = user
    }
  }

  next()
}
