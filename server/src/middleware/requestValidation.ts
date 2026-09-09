import type { Request, Response, NextFunction } from 'express'

export function positiveIdParam(name = 'id') {
  return (req: Request, res: Response, next: NextFunction, value: string) => {
    const id = Number(value)
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: `Invalid ${name}` })
    next()
  }
}

export function pagination(req: Request, defaultLimit = 10, maxLimit = 100) {
  const page = Number(req.query.page ?? 1)
  const requestedLimit = Number(req.query.limit ?? defaultLimit)
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) return null
  return { page, limit: Math.min(requestedLimit, maxLimit) }
}
