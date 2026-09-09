import { Router } from 'express'
import { z } from 'zod'
import { memberController } from '../controllers/index.js'
import { pagination, positiveIdParam, asyncHandler } from '../middleware/index.js'

const router = Router()
router.param('id', positiveIdParam())

const memberSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().nullable(),
  institution: z.string().trim().max(255).optional().nullable(),
  course: z.string().trim().max(255).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  bloodGroup: z.string().trim().max(20).optional().nullable(),
  fees: z.string().trim().max(20).optional().nullable(),
  chapterId: z.number().int().positive().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  memberType: z.enum(['Student', 'Professional', 'Organization']),
  status: z.enum(['Active', 'Pending', 'Inactive']).optional(),
}).strict()

const memberUpdateSchema = memberSchema.partial()

router.get('/', asyncHandler(async (req, res) => {
  const pageInfo = pagination(req)
  if (!pageInfo) return res.status(400).json({ success: false, error: 'Invalid pagination' })
  const search = req.query.search as string
  const result = await memberController.getAll(pageInfo.page, pageInfo.limit, search?.slice(0, 255))
  res.json(result)
}))

router.get('/stats', asyncHandler(async (_req, res) => {
  const result = await memberController.getStats()
  res.json(result)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await memberController.getById(id)
  res.json(result)
}))

router.post('/', asyncHandler(async (req, res) => {
  const parsed = memberSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid member data', details: parsed.error.issues.map(i => i.message) })
  const result = await memberController.create(parsed.data as any)
  res.status(201).json(result)
}))

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const parsed = memberUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid member data', details: parsed.error.issues.map(i => i.message) })
  const result = await memberController.update(id, parsed.data as any)
  res.json(result)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await memberController.delete(id)
  res.json(result)
}))

export default router
