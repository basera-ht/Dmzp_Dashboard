import { Router } from 'express'
import { chapterController } from '../controllers/index.js'

const router = Router()

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const result = await chapterController.getAll(page, limit)
  res.json(result)
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await chapterController.getById(id)
  res.json(result)
})

router.post('/', async (req, res) => {
  const result = await chapterController.create(req.body)
  res.status(201).json(result)
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await chapterController.update(id, req.body)
  res.json(result)
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await chapterController.delete(id)
  res.json(result)
})

export default router
