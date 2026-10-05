import { eq, sql, desc, and } from 'drizzle-orm'
import { db } from '../database/index.js'
import { tours, tourRegistrations } from '../models/index.js'
import { sendTourTicketEmail, generateUniqueTicketCode, ensureRegistrationTicketCode } from '../services/tourTicketService.js'
import { memberController } from './memberController.js'
import type { NewTour, NewTourRegistration, Tour, TourRegistration } from '../models/index.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

function generateSlug(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200)

  return normalized || `tour-${Date.now().toString(36)}`
}

async function ensureUniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base
  let counter = 0
  while (true) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`
    const existing = await db.select({ id: tours.id }).from(tours).where(eq(tours.slug, candidate)).limit(1)
    if (existing.length === 0 || (excludeId && existing[0].id === excludeId)) return candidate
    counter++
  }
}

export const tourController = {
  // ── Tour CRUD ───────────────────────────────────────────────────────────

  async getAll(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<Tour>>> {
    const offset = (page - 1) * limit

    const [data, countResult] = await Promise.all([
      db.select().from(tours).orderBy(desc(tours.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(tours),
    ])

    const total = Number(countResult[0]?.count || 0)

    return {
      success: true,
      data: {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  },

  async getById(id: number): Promise<ApiResponse<Tour>> {
    const result = await db.select().from(tours).where(eq(tours.id, id)).limit(1)
    if (result.length === 0) return { success: false, error: 'Tour not found' }
    return { success: true, data: result[0] }
  },

  async getBySlug(slug: string): Promise<ApiResponse<Tour>> {
    const result = await db.select().from(tours).where(eq(tours.slug, slug)).limit(1)
    if (result.length === 0) return { success: false, error: 'Tour not found' }
    return { success: true, data: result[0] }
  },

  async create(data: Omit<NewTour, 'slug'>): Promise<ApiResponse<Tour>> {
    const slug = await ensureUniqueSlug(generateSlug(data.title))
    const result = await db.insert(tours).values({ ...data, slug }).returning()
    return { success: true, data: result[0] }
  },

  async update(id: number, data: Partial<Omit<NewTour, 'slug'>>): Promise<ApiResponse<Tour>> {
    const updateData: Record<string, any> = { ...data, updatedAt: new Date() }
    if (data.title) {
      updateData.slug = await ensureUniqueSlug(generateSlug(data.title), id)
    }
    const result = await db.update(tours).set(updateData).where(eq(tours.id, id)).returning()
    if (result.length === 0) return { success: false, error: 'Tour not found' }
    return { success: true, data: result[0] }
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    const result = await db.delete(tours).where(eq(tours.id, id)).returning()
    if (result.length === 0) return { success: false, error: 'Tour not found' }
    return { success: true, message: 'Tour deleted successfully' }
  },

  // ── Registrations ──────────────────────────────────────────────────────

  async getRegistrations(tourId: number, page = 1, limit = 50): Promise<ApiResponse<PaginatedResponse<TourRegistration>>> {
    const offset = (page - 1) * limit

    const [data, countResult] = await Promise.all([
      db.select().from(tourRegistrations).where(eq(tourRegistrations.tourId, tourId)).orderBy(desc(tourRegistrations.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(tourRegistrations).where(eq(tourRegistrations.tourId, tourId)),
    ])

    // Ensure existing registrations are populated with persisted ticket codes
    for (const reg of data) {
      if (!reg.ticketCode) {
        await ensureRegistrationTicketCode(reg)
      }
    }

    const total = Number(countResult[0]?.count || 0)

    return {
      success: true,
      data: { data, total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  },

  async createRegistration(data: NewTourRegistration): Promise<ApiResponse<TourRegistration>> {
    const MAX_RETRIES = 5
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const ticketCode = data.ticketCode || (await generateUniqueTicketCode())
        const result = await db.insert(tourRegistrations).values({ ...data, ticketCode }).returning()
        return { success: true, data: result[0] }
      } catch (err: any) {
        if (err?.code === '23505' && attempt < MAX_RETRIES && !data.ticketCode) {
          continue
        }
        return { success: false, error: err.message || 'Failed to create registration' }
      }
    }
    return { success: false, error: 'Failed to generate unique ticket code' }
  },

  async registerWithCapacityCheck(tourId: number, data: NewTourRegistration): Promise<ApiResponse<TourRegistration>> {
    const MAX_RETRIES = 5
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const ticketCode = data.ticketCode || (await generateUniqueTicketCode())

        const regResult = await db.transaction(async (tx) => {
          // Lock the tour row FOR UPDATE to serialize concurrent registrations
          const lockedTourResult = await tx.execute(
            sql`SELECT id, capacity FROM tours WHERE id = ${tourId} FOR UPDATE`
          )
          const tourRow = (lockedTourResult[0] as unknown) as { id: number; capacity: number } | undefined
          if (!tourRow) {
            return { success: false, error: 'Tour not found' } as const
          }

          if (tourRow.capacity && tourRow.capacity > 0) {
            const countResult = await tx.execute(
              sql`SELECT count(*) as count FROM tour_registrations WHERE tour_id = ${tourId} AND payment_status IN ('verified', 'pending_verification')`
            )
            const currentCount = Number((countResult[0] as any)?.count || 0)
            if (currentCount >= tourRow.capacity) {
              return { success: false, error: 'This tour is fully booked' } as const
            }
          }

          const result = await tx.insert(tourRegistrations).values({ ...data, ticketCode }).returning()
          return { success: true, data: result[0] } as const
        })

        // If registration is immediately verified (e.g. free tour), send ticket email
        if (regResult.success && regResult.data && regResult.data.paymentStatus === 'verified') {
          const tourData = await this.getById(tourId)
          if (tourData.success && tourData.data) {
            sendTourTicketEmail(tourData.data, regResult.data)
              .then((emailRes) => {
                if (!emailRes.success) {
                  console.error(`[TourController] Auto ticket email delivery failed for registration ${regResult.data.id}:`, emailRes.error)
                }
              })
              .catch((err) =>
                console.error('[TourController] Auto ticket email unexpected error:', err)
              )
          }
        }

        return regResult
      } catch (err: any) {
        if (err?.code === '23505' && attempt < MAX_RETRIES && !data.ticketCode) {
          continue
        }
        return { success: false, error: err.message || 'Failed to complete registration' }
      }
    }
    return { success: false, error: 'Failed to generate unique ticket code' }
  },

  async updatePaymentStatus(id: number, status: 'verified' | 'rejected'): Promise<ApiResponse<TourRegistration>> {
    const result = await db.update(tourRegistrations).set({ paymentStatus: status }).where(eq(tourRegistrations.id, id)).returning()
    if (result.length === 0) return { success: false, error: 'Registration not found' }

    const updated = result[0]
    // If approved/verified, ensure persisted ticketCode and trigger ticket email with WhatsApp link & PDF
    if (status === 'verified') {
      if (!updated.ticketCode) {
        await ensureRegistrationTicketCode(updated)
      }
      const tourData = await this.getById(updated.tourId)
      if (tourData.success && tourData.data) {
        sendTourTicketEmail(tourData.data, updated)
          .then((emailRes) => {
            if (!emailRes.success) {
              console.error(`[TourController] Approval ticket email delivery failed for registration ${updated.id}:`, emailRes.error)
            }
          })
          .catch((err) =>
            console.error('[TourController] Approval ticket email unexpected error:', err)
          )
      }

      // Also ensure DMZP membership is recorded if DMZP payment proof was provided
      if (updated.dmzpCardUrl) {
        const customResp = (updated.customResponses as Record<string, string>) || {}
        let syncSuccess = false
        const MAX_SYNC_ATTEMPTS = 3
        for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
          try {
            await memberController.recordPaidMembership({
              name: updated.fullName,
              email: updated.email,
              phone: updated.phoneNumber,
              institution: customResp.institution || customResp.college || null,
              course: customResp.course || null,
              bloodGroup: customResp.bloodGroup || customResp.blood || null,
              address: customResp.address || null,
            })
            syncSuccess = true
            break
          } catch (err: any) {
            console.error(`[TourController] Failed to record paid membership on verification (attempt ${attempt}/${MAX_SYNC_ATTEMPTS}):`, err?.message || err)
            if (attempt < MAX_SYNC_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
            }
          }
        }
        if (!syncSuccess) {
          console.error(`[TourController] CRITICAL: Durable sync failed for DMZP membership for registration ${updated.id}, email: ${updated.email}`)
        }
      }
    }

    return { success: true, data: updated }
  },

  async getRegistrationById(id: number): Promise<ApiResponse<{ tour: Tour; registration: TourRegistration }>> {
    const regResult = await db.select().from(tourRegistrations).where(eq(tourRegistrations.id, id)).limit(1)
    if (regResult.length === 0) return { success: false, error: 'Registration not found' }
    const registration = regResult[0]

    if (!registration.ticketCode) {
      await ensureRegistrationTicketCode(registration)
    }

    const tourResult = await db.select().from(tours).where(eq(tours.id, registration.tourId)).limit(1)
    if (tourResult.length === 0) return { success: false, error: 'Tour not found' }
    const tour = tourResult[0]

    return { success: true, data: { tour, registration } }
  },

  async getRegistrationByTicketCode(ticketCode: string): Promise<ApiResponse<{ tour: Tour; registration: TourRegistration }>> {
    let regResult = await db.select().from(tourRegistrations).where(eq(tourRegistrations.ticketCode, ticketCode)).limit(1)
    // Fallback: If not found by ticketCode and ticketCode is numeric, search by ID for backwards compatibility
    if (regResult.length === 0 && /^\d+$/.test(ticketCode.trim())) {
      regResult = await db.select().from(tourRegistrations).where(eq(tourRegistrations.id, Number(ticketCode.trim()))).limit(1)
    }

    if (regResult.length === 0) return { success: false, error: 'Registration not found' }
    const registration = regResult[0]

    if (!registration.ticketCode) {
      await ensureRegistrationTicketCode(registration)
    }

    const tourResult = await db.select().from(tours).where(eq(tours.id, registration.tourId)).limit(1)
    if (tourResult.length === 0) return { success: false, error: 'Tour not found' }
    const tour = tourResult[0]

    return { success: true, data: { tour, registration } }
  },

  async sendTicket(registrationId: number): Promise<ApiResponse<{ messageId?: string }>> {
    const regResult = await db.select().from(tourRegistrations).where(eq(tourRegistrations.id, registrationId)).limit(1)
    if (regResult.length === 0) return { success: false, error: 'Registration not found' }
    const registration = regResult[0]

    if (!registration.ticketCode) {
      await ensureRegistrationTicketCode(registration)
    }

    const tourResult = await db.select().from(tours).where(eq(tours.id, registration.tourId)).limit(1)
    if (tourResult.length === 0) return { success: false, error: 'Tour not found' }
    const tour = tourResult[0]

    const emailRes = await sendTourTicketEmail(tour, registration)
    if (!emailRes.success) {
      return { success: false, error: emailRes.error || 'Failed to send ticket email' }
    }
    return { success: true, message: 'Ticket email sent successfully', data: { messageId: emailRes.messageId } }
  },

  async getRegistrationStats(tourId: number): Promise<ApiResponse<{ total: number; verified: number; pending: number; rejected: number }>> {
    const [totalResult, verifiedResult, pendingResult, rejectedResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(tourRegistrations).where(eq(tourRegistrations.tourId, tourId)),
      db.select({ count: sql<number>`count(*)` }).from(tourRegistrations).where(and(eq(tourRegistrations.tourId, tourId), eq(tourRegistrations.paymentStatus, 'verified'))),
      db.select({ count: sql<number>`count(*)` }).from(tourRegistrations).where(and(eq(tourRegistrations.tourId, tourId), eq(tourRegistrations.paymentStatus, 'pending_verification'))),
      db.select({ count: sql<number>`count(*)` }).from(tourRegistrations).where(and(eq(tourRegistrations.tourId, tourId), eq(tourRegistrations.paymentStatus, 'rejected'))),
    ])

    return {
      success: true,
      data: {
        total: Number(totalResult[0]?.count || 0),
        verified: Number(verifiedResult[0]?.count || 0),
        pending: Number(pendingResult[0]?.count || 0),
        rejected: Number(rejectedResult[0]?.count || 0),
      },
    }
  },
}
