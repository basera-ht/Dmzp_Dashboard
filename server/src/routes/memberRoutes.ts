import { Router } from 'express'
import { memberController } from '../controllers/index.js'

const router = Router()

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const search = req.query.search as string
  const result = await memberController.getAll(page, limit, search)
  res.json(result)
})

router.get('/stats', async (_req, res) => {
  const result = await memberController.getStats()
  res.json(result)
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await memberController.getById(id)
  res.json(result)
})

router.post('/', async (req, res) => {
  const result = await memberController.create(req.body)
  res.status(201).json(result)
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await memberController.update(id, req.body)
  res.json(result)
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await memberController.delete(id)
  res.json(result)
})

export default router
