import { eq } from 'drizzle-orm'
import { db } from '../database/index.js'
import { users, settings } from '../models/index.js'
import type { NewUser, NewSetting } from '../models/index.js'
import type { ApiResponse } from '../types/index.js'

export const userController = {
  async getProfile(id: number): Promise<ApiResponse<any>> {
    const result = await db.select().from(users).where(eq(users.id, id))
    
    if (result.length === 0) {
      return { success: false, error: 'User not found' }
    }
    
    const { password, ...userWithoutPassword } = result[0]
    return { success: true, data: userWithoutPassword }
  },

  async updateProfile(id: number, data: Pick<NewUser, 'name' | 'email'>): Promise<ApiResponse<any>> {
    // Keep the controller safe if another route is added later: this is not a
    // generic user update endpoint.
    const update = { name: data.name, email: data.email, updatedAt: new Date() }
    const result = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning()
    
    if (result.length === 0) {
      return { success: false, error: 'User not found' }
    }
    
    const { password, ...userWithoutPassword } = result[0]
    return { success: true, data: userWithoutPassword }
  },

  async getSettings(userId: number): Promise<ApiResponse<any>> {
    const result = await db.select().from(settings).where(eq(settings.userId, userId))
    
    if (result.length === 0) {
      return { success: false, error: 'Settings not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async updateSettings(userId: number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    const allowed = ['emailNotifications', 'newMemberAlerts', 'weeklyReports', 'chapterActivityUpdates', 'language', 'timezone', 'dateFormat'] as const
    const sanitized: Record<string, string | number> = {}
    for (const key of allowed) {
      const value = data[key]
      if (typeof value === 'boolean') sanitized[key] = value ? 1 : 0
      else if (typeof value === 'string') sanitized[key] = value.trim()
      else if (typeof value === 'number') sanitized[key] = value
    }
    const existing = await db.select().from(settings).where(eq(settings.userId, userId))
    
    if (existing.length === 0) {
      const result = await db.insert(settings).values({ ...sanitized, userId }).returning()
      return { success: true, data: result[0] }
    }
    
    const result = await db
      .update(settings)
      .set({ ...sanitized, updatedAt: new Date() })
      .where(eq(settings.userId, userId))
      .returning()
    
    return { success: true, data: result[0] }
  },

  async create(data: NewUser): Promise<ApiResponse<any>> {
    const result = await db.insert(users).values(data).returning()
    const { password, ...userWithoutPassword } = result[0]
    return { success: true, data: userWithoutPassword }
  },
}
