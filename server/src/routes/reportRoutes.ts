import { Router } from 'express'
import multer from 'multer'
import { reportController } from '../controllers/index.js'
import { uploadFileToS3, getPublicUrl } from '../services/s3Service.js'
import { config } from '../config/index.js'

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

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await reportController.getById(id)
  res.json(result)
})

router.post('/', async (req, res) => {
  const result = await reportController.create(req.body)
  res.status(201).json(result)
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await reportController.update(id, req.body)
  res.json(result)
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await reportController.delete(id)
  res.json(result)
})

router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const id = parseInt(req.params.id)
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
    const id = parseInt(req.params.id)
    const result = await reportController.getById(id)
    
    if (!result.success || !result.data?.fileUrl) {
      return res.status(404).json({ success: false, error: 'Report or file not found' })
    }

    res.json({ success: true, data: { url: result.data.fileUrl } })
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({ success: false, error: 'Failed to get download URL' })
  }
})

export default router
