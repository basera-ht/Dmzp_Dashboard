import { Router } from 'express'
import multer from 'multer'
import { eventController } from '../controllers/index.js'
import { uploadFileToS3 } from '../services/s3Service.js'
import { config } from '../config/index.js'
import {
  sendEventEmail,
  broadcastToAllMembers,
  cancelBroadcast,
  getBroadcastStatus,
  generateEventEmailHtml,
  isBroadcastRunning,
  getAllMembersForEmail,
} from '../services/emailBroadcastService.js'
import type { NewEvent } from '../models/index.js'

const router = Router()
const EVENT_STATUSES = new Set(['Upcoming', 'Ongoing', 'Completed', 'Cancelled'])

function normalizeEventPayload(payload: Record<string, any>, isUpdate = false): { data?: Partial<NewEvent>; error?: string } {
  const hasOwn = (key: string) => Object.prototype.hasOwnProperty.call(payload, key)
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const locationInput = typeof payload.location === 'string' ? payload.location.trim() : ''
  const timeInput = typeof payload.time === 'string' ? payload.time.trim() : ''
  const descriptionInput = typeof payload.description === 'string' ? payload.description.trim() : undefined

  if (!isUpdate || hasOwn('title')) {
    if (!title) return { error: 'Title is required' }
    if (title.length > 255) return { error: 'Title must be 255 characters or fewer' }
  }

  if (!isUpdate || hasOwn('date')) {
    const parsedDate = new Date(payload.date as string)
    if (Number.isNaN(parsedDate.getTime())) return { error: 'A valid date is required' }
  }

  if (!isUpdate || hasOwn('time')) {
    if (timeInput.length > 50) return { error: 'Time must be 50 characters or fewer' }
  }

  if (!isUpdate || hasOwn('location')) {
    if (locationInput.length > 255) return { error: 'Location must be 255 characters or fewer' }
  }

  if (!isUpdate || hasOwn('status')) {
    if (typeof payload.status !== 'string' || !EVENT_STATUSES.has(payload.status)) {
      return { error: 'Invalid event status' }
    }
  }

  const attendeesValue = payload.attendees === undefined ? undefined : Number.parseInt(String(payload.attendees), 10)
  if (attendeesValue !== undefined && (Number.isNaN(attendeesValue) || attendeesValue < 0)) {
    return { error: 'Attendees must be a non-negative number' }
  }

  const chapterIdValue = payload.chapterId === undefined || payload.chapterId === null || payload.chapterId === ''
    ? undefined
    : Number.parseInt(String(payload.chapterId), 10)
  if (chapterIdValue !== undefined && Number.isNaN(chapterIdValue)) {
    return { error: 'Invalid chapterId value' }
  }

  const data: Partial<NewEvent> = {}
  if (!isUpdate || hasOwn('title')) data.title = title
  if (!isUpdate || hasOwn('date')) data.date = new Date(payload.date as string)
  if (!isUpdate || hasOwn('time')) data.time = timeInput || 'TBD'
  if (!isUpdate || hasOwn('location')) data.location = locationInput || 'TBD'
  if (!isUpdate || hasOwn('status')) data.status = payload.status as NewEvent['status']
  if (hasOwn('description')) data.description = descriptionInput || null
  if (attendeesValue !== undefined) data.attendees = attendeesValue
  else if (!isUpdate) data.attendees = 0
  if (chapterIdValue !== undefined) data.chapterId = chapterIdValue

  return { data }
}

const posterUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.AWS_MAX_FILE_SIZE || '10485760', 10),
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPG, PNG, WebP, GIF, and PDF files are allowed'))
    }
  },
})

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const result = await eventController.getAll(page, limit)
  res.json(result)
})

router.get('/upcoming', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5
  const result = await eventController.getUpcoming(limit)
  res.json(result)
})

router.get('/members/list', async (_req, res) => {
  try {
    const members = await getAllMembersForEmail()
    res.json({ success: true, data: members })
  } catch (error: any) {
    console.error('[EventRoutes] Error getting members:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to get members' })
  }
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await eventController.getById(id)
  res.json(result)
})

router.post('/', async (req, res) => {
  try {
    const normalized = normalizeEventPayload(req.body as Record<string, any>)
    if (normalized.error || !normalized.data) {
      return res.status(400).json({ success: false, error: normalized.error || 'Invalid event payload' })
    }

    const result = await eventController.create(normalized.data as NewEvent)
    res.status(201).json(result)
  } catch (error: any) {
    console.error('[EventRoutes] Error creating event:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to create event' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)

    const existing = await eventController.getById(id)
    if (!existing.success) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    const normalized = normalizeEventPayload(req.body as Record<string, any>, true)
    if (normalized.error || !normalized.data) {
      return res.status(400).json({ success: false, error: normalized.error || 'Invalid event payload' })
    }

    const result = await eventController.update(id, normalized.data)
    res.json(result)
  } catch (error: any) {
    console.error('[EventRoutes] Error updating event:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to update event' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  const result = await eventController.delete(id)
  res.json(result)
})

router.post('/:id/poster', posterUpload.single('poster'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)

    const event = await eventController.getById(id)
    if (!event.success) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const folder = config.aws.eventsFolder
    const uploadResult = await uploadFileToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    )

    if (!uploadResult.success || !uploadResult.url) {
      return res.status(500).json({ success: false, error: uploadResult.error || 'Upload failed' })
    }

    const result = await eventController.upsertPoster(id, uploadResult.url)
    res.json(result)
  } catch (error: any) {
    console.error('[EventRoutes] Error uploading poster:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to upload poster' })
  }
})

router.get('/:id/poster', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const result = await eventController.getPosterUrl(id)

    if (result.success) {
      res.json(result)
    } else {
      res.json({ success: true, data: { posterUrl: null } })
    }
  } catch (error: any) {
    res.json({ success: true, data: { posterUrl: null } })
  }
})

router.delete('/:id/poster', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const result = await eventController.deletePoster(id)
    res.json(result)
  } catch (error: any) {
    console.error('[EventRoutes] Error deleting poster:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to delete poster' })
  }
})

async function getEventWithPoster(eventId: number) {
  const event = await eventController.getById(eventId)
  if (!event.success) return null

  const eventData = event.data as any
  const posterResult = await eventController.getPosterUrl(eventId)

  return {
    id: eventData.id,
    title: eventData.title,
    date: eventData.date,
    time: eventData.time,
    location: eventData.location,
    description: eventData.description,
    posterUrl: posterResult.data?.posterUrl || null,
  }
}

router.get('/:id/preview-email', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const eventData = await getEventWithPoster(id)

    if (!eventData) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    const html = generateEventEmailHtml(eventData)
    res.json({ success: true, data: { html } })
  } catch (error: any) {
    console.error('[EventRoutes] Error generating preview:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to generate preview' })
  }
})

router.post('/:id/send-test-email', async (req, res) => {
  try {
    const { testEmail } = req.body
    if (!testEmail) {
      return res.status(400).json({ success: false, error: 'testEmail is required' })
    }

    const id = parseInt(req.params.id as string)
    const eventData = await getEventWithPoster(id)

    if (!eventData) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    const result = await sendEventEmail(eventData, testEmail)
    res.json(result)
  } catch (error: any) {
    console.error('[EventRoutes] Error sending test email:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to send test email' })
  }
})

router.post('/:id/send-single', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' })
    }

    const id = parseInt(req.params.id as string)
    const eventData = await getEventWithPoster(id)

    if (!eventData) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    const result = await sendEventEmail(eventData, email)
    res.json(result)
  } catch (error: any) {
    console.error('[EventRoutes] Error sending single email:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to send email' })
  }
})

router.post('/:id/send-to-members', async (req, res) => {
  try {
    const { emails } = req.body
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'emails array is required' })
    }

    const id = parseInt(req.params.id as string)
    const eventData = await getEventWithPoster(id)

    if (!eventData) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    const results = await Promise.allSettled(
      emails.map((email: string) => sendEventEmail(eventData, email))
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - sent

    res.json({
      success: true,
      data: { sent, failed, total: emails.length }
    })
  } catch (error: any) {
    console.error('[EventRoutes] Error sending to members:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to send emails' })
  }
})

router.post('/:id/broadcast', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)

    if (isBroadcastRunning(id)) {
      return res.status(409).json({ success: false, error: 'Broadcast already in progress' })
    }

    const eventData = await getEventWithPoster(id)

    if (!eventData) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    broadcastToAllMembers(eventData)
    res.json({ success: true, message: 'Broadcast started' })
  } catch (error: any) {
    console.error('[EventRoutes] Error starting broadcast:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to start broadcast' })
  }
})

router.get('/:id/broadcast-status', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const status = getBroadcastStatus(id)

    if (!status) {
      const stats = await eventController.getSentCount(id)
      return res.json({
        success: true,
        data: {
          status: 'not_started',
          sent: stats.data?.sent || 0,
          failed: stats.data?.failed || 0,
          total: 0,
        },
      })
    }

    res.json({ success: true, data: status })
  } catch (error: any) {
    console.error('[EventRoutes] Error getting broadcast status:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to get status' })
  }
})

router.post('/:id/broadcast-cancel', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const cancelled = cancelBroadcast(id)

    res.json({ success: true, cancelled })
  } catch (error: any) {
    console.error('[EventRoutes] Error cancelling broadcast:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel broadcast' })
  }
})

export default router
