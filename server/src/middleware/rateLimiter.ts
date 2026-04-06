import { Request, Response, NextFunction } from 'express'

export interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 100
const BLOCK_DURATION_MS = 15 * 60 * 1000

const blockedIPs: { [key: string]: number } = {}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  
  if (blockedIPs[ip] && Date.now() < blockedIPs[ip]) {
    const remainingTime = Math.ceil((blockedIPs[ip] - Date.now()) / 1000)
    res.status(429).json({
      success: false,
      error: `Too many requests. Try again in ${remainingTime} seconds.`,
      code: 'RATE_LIMITED',
    })
    return
  }

  const now = Date.now()
  const key = ip

  if (!store[key] || now > store[key].resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    }
    next()
    return
  }

  store[key].count++

  if (store[key].count > MAX_REQUESTS) {
    blockedIPs[ip] = Date.now() + BLOCK_DURATION_MS
    delete store[key]
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP. You have been temporarily blocked.',
      code: 'IP_BLOCKED',
    })
    return
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString())
  res.setHeader('X-RateLimit-Remaining', (MAX_REQUESTS - store[key].count).toString())
  res.setHeader('X-RateLimit-Reset', store[key].resetTime.toString())

  next()
}

export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const loginKey = `login:${ip}`
  const now = Date.now()

  if (!store[loginKey] || now > store[loginKey].resetTime) {
    store[loginKey] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    }
    next()
    return
  }

  store[loginKey].count++

  if (store[loginKey].count > 5) {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
      code: 'LOGIN_RATE_LIMITED',
    })
    return
  }

  next()
}
