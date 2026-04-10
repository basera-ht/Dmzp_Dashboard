import { eq, sql, desc, gte, and } from 'drizzle-orm'
import { db } from '../database/index.js'
import { events, chapters, eventEmailLogs, eventPosters } from '../models/index.js'
import type { NewEvent, NewEventPoster } from '../models/index.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'
import { getSignedDownloadUrl, getKeyFromUrl } from '../services/s3Service.js'

export const eventController = {
  async getAll(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<any>>> {
    const offset = (page - 1) * limit
    
    const [data, countResult] = await Promise.all([
      db.select({
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        time: events.time,
        location: events.location,
        attendees: events.attendees,
        status: events.status,
        chapter: chapters.name,
      })
        .from(events)
        .leftJoin(chapters, eq(events.chapterId, chapters.id))
        .orderBy(desc(events.date))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(events),
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

  async getUpcoming(limit = 5): Promise<ApiResponse<any>> {
    const now = new Date()
    
    const result = await db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        time: events.time,
        location: events.location,
        attendees: events.attendees,
        status: events.status,
        chapter: chapters.name,
      })
      .from(events)
      .leftJoin(chapters, eq(events.chapterId, chapters.id))
      .where(gte(events.date, now))
      .orderBy(events.date)
      .limit(limit)
    
    return { success: true, data: result }
  },

  async getById(id: number): Promise<ApiResponse<any>> {
    const result = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        time: events.time,
        location: events.location,
        attendees: events.attendees,
        status: events.status,
        chapter: chapters,
      })
      .from(events)
      .leftJoin(chapters, eq(events.chapterId, chapters.id))
      .where(eq(events.id, id))
    
    if (result.length === 0) {
      return { success: false, error: 'Event not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async create(data: NewEvent): Promise<ApiResponse<any>> {
    const insertData = { ...data }
    if (insertData.date && typeof insertData.date === 'string') {
      insertData.date = new Date(insertData.date)
    }
    const result = await db.insert(events).values(insertData).returning()
    return { success: true, data: result[0] }
  },

  async update(id: number, data: Partial<NewEvent>): Promise<ApiResponse<any>> {
    const updateData = { ...data }
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = new Date(updateData.date)
    }
    const result = await db
      .update(events)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Event not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async delete(id: number): Promise<ApiResponse<any>> {
    const result = await db.delete(events).where(eq(events.id, id)).returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Event not found' }
    }
    
    return { success: true, message: 'Event deleted successfully' }
  },

  async getSentCount(eventId: number): Promise<ApiResponse<{ sent: number; failed: number }>> {
    const sentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventEmailLogs)
      .where(and(eq(eventEmailLogs.eventId, eventId), eq(eventEmailLogs.status, 'sent')))
    
    const failedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventEmailLogs)
      .where(and(eq(eventEmailLogs.eventId, eventId), eq(eventEmailLogs.status, 'failed')))
    
    return {
      success: true,
      data: {
        sent: Number(sentResult[0]?.count || 0),
        failed: Number(failedResult[0]?.count || 0),
      },
    }
  },

  async getPosterUrl(eventId: number): Promise<ApiResponse<{ posterUrl: string | null }>> {
    try {
      const result = await db
        .select({ posterUrl: eventPosters.posterUrl })
        .from(eventPosters)
        .where(eq(eventPosters.eventId, eventId))
        .limit(1)
      
      let posterUrl = result.length > 0 ? result[0].posterUrl : null
      
      if (posterUrl) {
        const key = getKeyFromUrl(posterUrl)
        if (key) {
          const signedUrl = await getSignedDownloadUrl(key)
          if (signedUrl) {
            posterUrl = signedUrl
          }
        }
      }

      return {
        success: true,
        data: {
          posterUrl: posterUrl,
        },
      }
    } catch {
      return { success: true, data: { posterUrl: null } }
    }
  },

  async upsertPoster(eventId: number, posterUrl: string): Promise<ApiResponse<any>> {
    try {
      const existing = await db
        .select({ id: eventPosters.id })
        .from(eventPosters)
        .where(eq(eventPosters.eventId, eventId))
        .limit(1)

      if (existing.length > 0) {
        const result = await db
          .update(eventPosters)
          .set({ posterUrl, createdAt: new Date() })
          .where(eq(eventPosters.eventId, eventId))
          .returning()
        return { success: true, data: result[0] }
      } else {
        const insertData: NewEventPoster = {
          eventId,
          posterUrl,
        }
        const result = await db.insert(eventPosters).values(insertData).returning()
        return { success: true, data: result[0] }
      }
    } catch (error) {
      console.error('Error upserting poster:', error)
      return { success: false, error: 'Failed to save poster' }
    }
  },

  async deletePoster(eventId: number): Promise<ApiResponse<any>> {
    try {
      const result = await db
        .delete(eventPosters)
        .where(eq(eventPosters.eventId, eventId))
        .returning()
      return { success: true, data: result[0] }
    } catch (error) {
      console.error('Error deleting poster:', error)
      return { success: false, error: 'Failed to delete poster' }
    }
  },
}
