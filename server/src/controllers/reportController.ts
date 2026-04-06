import { eq, sql, desc } from 'drizzle-orm'
import { db } from '../database/index.js'
import { reports } from '../models/index.js'
import type { NewReport } from '../models/index.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

export const reportController = {
  async getAll(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<any>>> {
    const offset = (page - 1) * limit
    
    const [data, countResult] = await Promise.all([
      db.select()
        .from(reports)
        .orderBy(desc(reports.date))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(reports),
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
    const result = await db.select().from(reports).where(eq(reports.id, id))
    
    if (result.length === 0) {
      return { success: false, error: 'Report not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async create(data: NewReport): Promise<ApiResponse<any>> {
    const result = await db.insert(reports).values(data).returning()
    return { success: true, data: result[0] }
  },

  async update(id: number, data: Partial<NewReport>): Promise<ApiResponse<any>> {
    const result = await db
      .update(reports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Report not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async delete(id: number): Promise<ApiResponse<any>> {
    const result = await db.delete(reports).where(eq(reports.id, id)).returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Report not found' }
    }
    
    return { success: true, message: 'Report deleted successfully' }
  },

  async getStats(): Promise<ApiResponse<any>> {
    const [total, thisMonth, ready] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(reports),
      db.select({ count: sql<number>`count(*)` }).from(reports),
      db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'Ready')),
    ])
    
    return {
      success: true,
      data: {
        totalReports: Number(total[0]?.count || 0),
        thisMonth: Number(thisMonth[0]?.count || 0),
        readyReports: Number(ready[0]?.count || 0),
      },
    }
  },
}
