import type { RequestHandler } from 'express'

// Express 4 does not forward rejected async handlers by itself.
export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
