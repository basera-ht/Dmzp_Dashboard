import { Router } from 'express'
import { z } from 'zod'
import { chapterController } from '../controllers/index.js'
import { pagination, positiveIdParam, asyncHandler } from '../middleware/index.js'

const router = Router()
router.param('id', positiveIdParam())

const chapterSchema = z.object({
  name: z.string().trim().min(1).max(255),
  region: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().nullable(),
}).strict()

const chapterUpdateSchema = chapterSchema.partial()

router.get('/', asyncHandler(async (req, res) => {
  const pageInfo = pagination(req)
  if (!pageInfo) return res.status(400).json({ success: false, error: 'Invalid pagination' })
  const result = await chapterController.getAll(pageInfo.page, pageInfo.limit)
  res.json(result)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await chapterController.getById(id)
  res.json(result)
}))

router.post('/', asyncHandler(async (req, res) => {
  const parsed = chapterSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid chapter data' })
  const result = await chapterController.create(parsed.data as any)
  res.status(201).json(result)
}))

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const parsed = chapterUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid chapter data' })
  const result = await chapterController.update(id, parsed.data as any)
  res.json(result)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await chapterController.delete(id)
  res.json(result)
}))

export default router
