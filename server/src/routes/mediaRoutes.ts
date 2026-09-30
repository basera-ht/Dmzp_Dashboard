import { Router } from 'express'
import type { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '../services/s3Service.js'
import { config } from '../config/index.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, '../../uploads')

const router = Router()

async function handleMedia(req: Request, res: Response, isProtected: boolean) {
  try {
    const rawKey = req.path.startsWith('/') ? req.path.slice(1) : req.path
    const localPath = path.resolve(uploadsDir, rawKey)
    const rel = path.relative(uploadsDir, localPath)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return res.status(403).json({ success: false, error: 'Invalid path' })
    }
    const safeKey = rel.replace(/\\/g, '/')

    const cacheHeader = isProtected ? 'private, no-store' : 'public, max-age=86400'

    // 1. Try local file storage first
    if (fs.existsSync(localPath)) {
      res.setHeader('Cache-Control', cacheHeader)
      return res.sendFile(localPath)
    }

    // 2. Fall back to private S3 bucket stream if configured
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      try {
        const command = new GetObjectCommand({
          Bucket: config.aws.bucketName,
          Key: safeKey.replace(/\\/g, '/'),
        })
        const s3Response = await s3Client.send(command)
        if (s3Response.ContentType) {
          res.setHeader('Content-Type', s3Response.ContentType)
        }
        if (s3Response.ContentLength) {
          res.setHeader('Content-Length', s3Response.ContentLength)
        }
        res.setHeader('Cache-Control', cacheHeader)

        const stream = s3Response.Body as any
        stream.on('error', (streamErr: any) => {
          console.error('S3 stream pipe error:', streamErr)
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Stream error' })
          } else {
            res.destroy()
          }
        })

        return stream.pipe(res)
      } catch (s3Error) {
        console.warn(`S3 fetch failed for key: ${safeKey}`)
      }
    }

    return res.status(404).json({ success: false, error: 'Media not found' })
  } catch (err: any) {
    console.error('Media serve error:', err)
    return res.status(500).json({ success: false, error: 'Failed to load media' })
  }
}

// ── Protected Media: receipts and financial/member reports ─────────────────
router.get('/tours/receipts/*', authMiddleware, requireAdmin, (req, res) => handleMedia(req, res, true))
router.get('/reports/*', authMiddleware, requireAdmin, (req, res) => handleMedia(req, res, true))

// ── Public Media: tour cover images, QR codes, and event posters ───────────
router.get('/tours/qr/*', (req, res) => handleMedia(req, res, false))
router.get('/tours/*', (req, res) => handleMedia(req, res, false))
router.get('/events/*', (req, res) => handleMedia(req, res, false))

// Deny other paths by default
router.get('/*', (req, res) => {
  res.status(403).json({ success: false, error: 'Access denied' })
})

export default router
