import { Router } from 'express'
import { sendMembershipCard, generateMembershipCardPdfBuffer } from '../services/emailService.js'
import type { ApiResponse } from '../types/index.js'

const router = Router()

// Test endpoint — visit GET /api/member-card/test in browser to diagnose
router.get('/test', async (_req, res) => {
  const testEmail = process.env.SMTP_USER || ''
  if (!testEmail) {
    res.json({ success: false, error: 'SMTP_USER not set in .env' })
    return
  }
  const result = await sendMembershipCard({
    name: 'Test Member',
    email: testEmail,
    fees: 'yes',
  })
  res.json({ ...result, sentTo: testEmail })
})

router.get('/preview', async (req, res) => {
  const { name, email, fees, id, bloodGroup, address } = req.query

  if (!name) {
    res.status(400).send('Name is required')
    return
  }

  try {
    const pdfBuffer = await generateMembershipCardPdfBuffer({
      name: name as string,
      email: (email as string) || '',
      fees: (fees as string) || 'no',
      id: id as string,
      bloodGroup: bloodGroup as string,
      address: address as string,
    })

    const safeName = (name as string).replace(/[^a-zA-Z0-9]/g, '_')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=DMZP_Card_${safeName}.pdf`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('[Card Preview] Error:', error)
    res.status(500).send('Failed to generate PDF preview')
  }
})

router.post('/send', async (req, res) => {
  const { name, email, fees, id, bloodGroup, address } = req.body

  if (!name || !email) {
    res.status(400).json({ success: false, error: 'Name and email are required' } as ApiResponse<null>)
    return
  }

  const result = await sendMembershipCard({ name, email, fees, id, bloodGroup, address })

  if (result.success) {
    res.json({ success: true, message: `Membership card sent to ${email}` } as ApiResponse<null>)
  } else {
    res.status(500).json({ success: false, error: result.error } as ApiResponse<null>)
  }
})

export default router

