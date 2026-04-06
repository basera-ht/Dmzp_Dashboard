import { Router } from 'express'
import { userController } from '../controllers/index.js'

const router = Router()

router.get('/profile/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await userController.getProfile(id)
  res.json(result)
})

router.put('/profile/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const result = await userController.updateProfile(id, req.body)
  res.json(result)
})

router.get('/settings/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId)
  const result = await userController.getSettings(userId)
  res.json(result)
})

router.put('/settings/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId)
  const result = await userController.updateSettings(userId, req.body)
  res.json(result)
})

export default router
