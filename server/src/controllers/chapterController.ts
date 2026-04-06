import { eq, sql } from 'drizzle-orm'
import { db } from '../database/index.js'
import { chapters, type NewChapter } from '../models/index.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

export const chapterController = {
  async getAll(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<any>>> {
    const offset = (page - 1) * limit
    
    const [data, countResult] = await Promise.all([
      db.select().from(chapters).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(chapters),
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

  async getById(id: number): Promise<ApiResponse<any>> {
    const result = await db.select().from(chapters).where(eq(chapters.id, id))
    
    if (result.length === 0) {
      return { success: false, error: 'Chapter not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async create(data: NewChapter): Promise<ApiResponse<any>> {
    const result = await db.insert(chapters).values(data).returning()
    return { success: true, data: result[0] }
  },

  async update(id: number, data: Partial<NewChapter>): Promise<ApiResponse<any>> {
    const result = await db
      .update(chapters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Chapter not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async delete(id: number): Promise<ApiResponse<any>> {
    const result = await db.delete(chapters).where(eq(chapters.id, id)).returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Chapter not found' }
    }
    
    return { success: true, message: 'Chapter deleted successfully' }
  },
}
