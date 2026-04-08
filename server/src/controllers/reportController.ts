import { eq, sql, desc, gte } from 'drizzle-orm'
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
    const insertData = { ...data }
    if (insertData.date && typeof insertData.date === 'string') {
      insertData.date = new Date(insertData.date)
    }
    const result = await db.insert(reports).values(insertData).returning()
    return { success: true, data: result[0] }
  },

  async update(id: number, data: Partial<NewReport>): Promise<ApiResponse<any>> {
    const updateData = { ...data }
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = new Date(updateData.date)
    }
    const result = await db
      .update(reports)
      .set({ ...updateData, updatedAt: new Date() })
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
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const [total, thisMonth, ready] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(reports),
      db.select({ count: sql<number>`count(*)` }).from(reports).where(gte(reports.date, startOfMonth)),
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

  async getUniqueTypes(): Promise<ApiResponse<string[]>> {
    try {
      const result = await db
        .selectDistinct({ type: reports.type })
        .from(reports)
        .where(sql`${reports.type} IS NOT NULL`)
        
      const types = result.map(r => r.type).filter(Boolean)
      return { success: true, data: types }
    } catch (error) {
      console.error('Failed to get unique report types:', error)
      return { success: false, error: 'Failed to fetch report types' }
    }
  },
}
