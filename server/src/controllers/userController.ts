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

  async updateProfile(id: number, data: Partial<NewUser>): Promise<ApiResponse<any>> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
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

  async updateSettings(userId: number, data: Partial<NewSetting>): Promise<ApiResponse<any>> {
    const existing = await db.select().from(settings).where(eq(settings.userId, userId))
    
    if (existing.length === 0) {
      const result = await db.insert(settings).values({ ...data, userId }).returning()
      return { success: true, data: result[0] }
    }
    
    const result = await db
      .update(settings)
      .set({ ...data, updatedAt: new Date() })
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
