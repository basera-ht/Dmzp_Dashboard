import { Router } from 'express'
import multer from 'multer'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { reportController } from '../controllers/index.js'
import { uploadFileToS3, getPublicUrl } from '../services/s3Service.js'
import { config } from '../config/index.js'

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
})

const router = Router()

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

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const result = await reportController.getAll(page, limit)
  res.json(result)
})

router.get('/stats', async (_req, res) => {
  const result = await reportController.getStats()
  res.json(result)
})

router.get('/types/unique', async (_req, res) => {
  const result = await reportController.getUniqueTypes()
  res.json(result)
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await reportController.getById(id)
  res.json(result)
})

router.post('/', async (req, res) => {
  const result = await reportController.create(req.body)
  res.status(201).json(result)
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await reportController.update(id, req.body)
  res.json(result)
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await reportController.delete(id)
  res.json(result)
})

router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
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
      return res.status(500).json({ success: false, error: uploadResult.error || 'Upload failed' })
    }

    const updateResult = await reportController.update(id, { fileUrl: uploadResult.url })
    res.json(updateResult)
  } catch (error: any) {
    console.error('Upload error:', error)
    res.status(500).json({ success: false, error: error.message || 'Upload failed' })
  }
})

router.get('/:id/download', async (req, res) => {
  try {
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
      console.error('S3 stream error:', err)
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream file' })
      }
    })
  } catch (error: any) {
    console.error('Download error:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to get file' })
  }
})

export default router
