// Vercel serverless entry point
// This file is automatically picked up by Vercel's @vercel/node runtime
import type { Request, Response } from 'express'
import app from '../server/src/app.js'
import { ensureTables } from '../server/src/database/ensure-tables.js'

let initPromise: Promise<void> | null = null

export default async function handler(req: Request, res: Response) {
  if (!initPromise) {
    initPromise = ensureTables().catch((err) => {
      console.error('ensureTables initialization error:', err)
    })
  }
  await initPromise
  return (app as any)(req, res)
}
