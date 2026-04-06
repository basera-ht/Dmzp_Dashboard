import type { Request, Response, NextFunction } from 'express'

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      })
    }
    
    next()
  }
}
