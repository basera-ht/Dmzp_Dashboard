import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { reportController } from '../controllers/index.js'
import { uploadFileToS3, getPublicUrl } from '../services/s3Service.js'
import { config } from '../config/index.js'
import { positiveIdParam, pagination, asyncHandler } from '../middleware/index.js'

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
})

const router = Router()
router.param('id', positiveIdParam())

const reportSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(255),
  date: z.string().optional(),
  status: z.enum(['Ready', 'Processing', 'Failed']).optional(),
  fileUrl: z.string().trim().max(500).optional().nullable(),
}).strict()

const reportUpdateSchema = reportSchema.partial()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.aws.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  },
})

router.get('/', asyncHandler(async (req, res) => {
  const pageInfo = pagination(req)
  if (!pageInfo) return res.status(400).json({ success: false, error: 'Invalid pagination' })
  const result = await reportController.getAll(pageInfo.page, pageInfo.limit)
  res.json(result)
}))

router.get('/stats', asyncHandler(async (_req, res) => {
  const result = await reportController.getStats()
  res.json(result)
}))

router.get('/types/unique', asyncHandler(async (_req, res) => {
  const result = await reportController.getUniqueTypes()
  res.json(result)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await reportController.getById(id)
  res.json(result)
}))

router.post('/', asyncHandler(async (req, res) => {
  const parsed = reportSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid report data' })
  const result = await reportController.create(parsed.data as any)
  res.status(201).json(result)
}))

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const parsed = reportUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid report data' })
  const result = await reportController.update(id, parsed.data as any)
  res.json(result)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await reportController.delete(id)
  res.json(result)
}))

router.post('/:id/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' })
  }

  const id = parseInt(req.params.id as string)
  const result = await reportController.getById(id)
  
  if (!result.success || !result.data) {
    return res.status(404).json({ success: false, error: 'Report not found' })
  }

  const uploadResult = await uploadFileToS3(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  )

  if (!uploadResult.success || !uploadResult.url) {
    return res.status(500).json({ success: false, error: 'Upload failed' })
  }

  const updateResult = await reportController.update(id, { fileUrl: uploadResult.url })
  res.json(updateResult)
}))

router.get('/:id/download', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await reportController.getById(id)

  if (!result.success || !result.data?.fileUrl) {
    return res.status(404).json({ success: false, error: 'Report or file not found' })
  }

  const fileUrl = result.data.fileUrl as string
  const reportName = (result.data.name as string) || 'report'
  const safeFilename = `${reportName.replace(/[^a-z0-9_\-\s]/gi, '_')}.pdf`

  // Extract the S3 key from the stored URL
  // URL format: https://<bucket>.s3.<region>.amazonaws.com/<key>
  const urlObj = new URL(fileUrl)
  const key = decodeURIComponent(urlObj.pathname.replace(/^\//, '')) // strip leading slash + decode %20 etc.

  const command = new GetObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
  })

  const s3Response = await s3.send(command)

  if (!s3Response.Body) {
    return res.status(404).json({ success: false, error: 'File not found in storage' })
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`)
  if (s3Response.ContentLength) {
    res.setHeader('Content-Length', s3Response.ContentLength)
  }

  // Stream body to response
  const readable = s3Response.Body as Readable
  readable.pipe(res)
  readable.on('error', (err) => {
    console.error('S3 stream error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to stream file' })
    }
  })
}))

export default router
