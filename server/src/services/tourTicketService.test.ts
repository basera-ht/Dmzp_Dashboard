import { describe, expect, it } from 'vitest'
import { generateTourTicketPdfBuffer, generateTourTicketHtml, generateTicketCode, buildTicketWebUrl } from './tourTicketService.js'
import type { Tour, TourRegistration } from '../models/index.js'

describe('Tour Ticket Service', () => {
  const mockTour: Tour = {
    id: 1,
    title: 'Manali Snow & Adventure Tour 2026',
    slug: 'manali-snow-adventure-tour-2026',
    description: 'An exciting 4-day tour to Manali and Solang valley.',
    coverImage: '/uploads/tours/manali.jpg',
    startDate: new Date('2026-11-15T00:00:00.000Z'),
    endDate: new Date('2026-11-19T00:00:00.000Z'),
    location: 'Manali, Himachal Pradesh',
    capacity: 40,
    isPaid: true,
    price: 3500,
    upiId: 'dmzp@okhdfcbank',
    upiQrImage: null,
    upiId2: null,
    upiQrImage2: null,
    whatsappGroupUrl: 'https://chat.whatsapp.com/TestGroup123',
    customFormFields: [],
    status: 'published',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  }

  const mockRegistration: TourRegistration = {
    id: 42,
    tourId: 1,
    fullName: 'Lalremruata Ralte',
    email: 'lalremruata@example.com',
    phoneNumber: '9876543210',
    customResponses: {},
    amountPaid: 3500,
    upiTransactionId: null,
    paymentScreenshotUrl: '/uploads/tours/receipts/proof.png',
    paymentStatus: 'verified',
    ticketCode: 'DMZP-TOUR-00042',
    ticketSentAt: null,
    createdAt: new Date('2026-10-02T10:30:00.000Z'),
  }

  it('generates a valid PDF buffer for a tour ticket', async () => {
    const pdfBuffer = await generateTourTicketPdfBuffer(mockTour, mockRegistration)
    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)
    // Validate PDF magic bytes: %PDF-
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  })

  it('generates HTML email containing WhatsApp group link and ticket details', () => {
    const ticketUrl = 'http://localhost:5173/tour/manali-snow-adventure-tour-2026/ticket/42'
    const html = generateTourTicketHtml(mockTour, mockRegistration, ticketUrl)

    expect(html).toContain('Manali Snow & Adventure Tour 2026')
    expect(html).toContain('Lalremruata Ralte')
    expect(html).toContain('DMZP-TOUR-00042')
    expect(html).toContain('https://chat.whatsapp.com/TestGroup123')
    expect(html).toContain(ticketUrl)
    expect(html).toContain('Join Tour WhatsApp Group')
  })

  it('generates HTML email cleanly when tour has no WhatsApp group link', () => {
    const tourWithoutWa = { ...mockTour, whatsappGroupUrl: null }
    const ticketUrl = 'http://localhost:5173/tour/manali/ticket/42'
    const html = generateTourTicketHtml(tourWithoutWa, mockRegistration, ticketUrl)

    expect(html).toContain('Manali Snow & Adventure Tour 2026')
    expect(html).toContain('Lalremruata Ralte')
    expect(html).not.toContain('Join Tour WhatsApp Group')
  })

  it('generates cryptographically secure ticket codes matching expected format', () => {
    const code1 = generateTicketCode()
    const code2 = generateTicketCode()

    expect(code1).toMatch(/^DMZP-TOUR-[0-9A-F]{8}$/)
    expect(code2).toMatch(/^DMZP-TOUR-[0-9A-F]{8}$/)
    expect(code1).not.toBe(code2)
  })

  it('buildTicketWebUrl requires a persisted ticketCode and rejects unpersisted/empty codes', () => {
    const url = buildTicketWebUrl(mockTour, mockRegistration)
    expect(url).toContain(`/tour/${mockTour.slug}/ticket/DMZP-TOUR-00042`)

    const regWithoutCode = { ...mockRegistration, ticketCode: '' }
    expect(() => buildTicketWebUrl(mockTour, regWithoutCode as any)).toThrowError(/ticketCode is required and must be persisted/)
  })
})
