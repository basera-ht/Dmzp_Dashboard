import { eq, sql, desc, and } from 'drizzle-orm'
import { db } from '../database/index.js'
import { tours, tourRegistrations } from '../models/index.js'
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

    const total = Number(countResult[0]?.count || 0)

    return {
      success: true,
      data: { data, total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  },

  async createRegistration(data: NewTourRegistration): Promise<ApiResponse<TourRegistration>> {
    const result = await db.insert(tourRegistrations).values(data).returning()
    return { success: true, data: result[0] }
  },

  async registerWithCapacityCheck(tourId: number, data: NewTourRegistration): Promise<ApiResponse<TourRegistration>> {
    return await db.transaction(async (tx) => {
      // Lock the tour row FOR UPDATE to serialize concurrent registrations
      const lockedTourResult = await tx.execute(
        sql`SELECT id, capacity FROM tours WHERE id = ${tourId} FOR UPDATE`
      )
      const tourRow = (lockedTourResult[0] as unknown) as { id: number; capacity: number } | undefined
      if (!tourRow) {
        return { success: false, error: 'Tour not found' }
      }

      if (tourRow.capacity && tourRow.capacity > 0) {
        const countResult = await tx.execute(
          sql`SELECT count(*) as count FROM tour_registrations WHERE tour_id = ${tourId} AND payment_status IN ('verified', 'pending_verification')`
        )
        const currentCount = Number((countResult[0] as any)?.count || 0)
        if (currentCount >= tourRow.capacity) {
          return { success: false, error: 'This tour is fully booked' }
        }
      }

      const result = await tx.insert(tourRegistrations).values(data).returning()
      return { success: true, data: result[0] }
    })
  },

  async updatePaymentStatus(id: number, status: 'verified' | 'rejected'): Promise<ApiResponse<TourRegistration>> {
    const result = await db.update(tourRegistrations).set({ paymentStatus: status }).where(eq(tourRegistrations.id, id)).returning()
    if (result.length === 0) return { success: false, error: 'Registration not found' }
    return { success: true, data: result[0] }
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
