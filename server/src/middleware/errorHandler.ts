import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'

export function errorHandler(err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size must be less than 100KB',
    })
  }

  console.error('Request failed:', err.message)
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Internal Server Error' : err.message,
  })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
}
