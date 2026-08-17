import { eq, sql, like, desc } from 'drizzle-orm'
import { db } from '../database/index.js'
import { members, chapters, hiddenMembers, membershipCardLogs } from '../models/index.js'
import type { NewMember } from '../models/index.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

export const memberController = {
  async getAll(page = 1, limit = 10, search?: string): Promise<ApiResponse<PaginatedResponse<any>>> {
    const offset = (page - 1) * limit
    
    const conditions = search ? like(members.name, `%${search}%`) : undefined
    
    const [data, countResult] = await Promise.all([
      db.select({
        id: members.id,
        name: members.name,
        email: members.email,
        phone: members.phone,
        institution: members.institution,
        course: members.course,
        address: members.address,
        bloodGroup: members.bloodGroup,
        fees: members.fees,
        joinDate: members.joinDate,
        memberType: members.memberType,
        status: members.status,
        chapter: chapters.name,
      })
        .from(members)
        .leftJoin(chapters, eq(members.chapterId, chapters.id))
        .where(conditions)
        .orderBy(desc(members.joinDate))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(members).where(conditions),
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
    const result = await db
      .select({
        id: members.id,
        name: members.name,
        email: members.email,
        phone: members.phone,
        institution: members.institution,
        course: members.course,
        address: members.address,
        bloodGroup: members.bloodGroup,
        fees: members.fees,
        joinDate: members.joinDate,
        memberType: members.memberType,
        status: members.status,
        chapter: chapters,
      })
      .from(members)
      .leftJoin(chapters, eq(members.chapterId, chapters.id))
      .where(eq(members.id, id))
    
    if (result.length === 0) {
      return { success: false, error: 'Member not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async create(data: NewMember): Promise<ApiResponse<any>> {
    const insertData = { ...data }
    if (insertData.joinDate && typeof insertData.joinDate === 'string') {
      insertData.joinDate = new Date(insertData.joinDate)
    }
    if (insertData.email) {
      await db.delete(hiddenMembers).where(eq(hiddenMembers.email, insertData.email.toLowerCase())).catch(() => {})
    }
    const result = await db.insert(members).values(insertData).returning()
    return { success: true, data: result[0] }
  },

  async update(id: number, data: Partial<NewMember>): Promise<ApiResponse<any>> {
    const updateData = { ...data }
    if (updateData.joinDate && typeof updateData.joinDate === 'string') {
      updateData.joinDate = new Date(updateData.joinDate)
    }
    if (updateData.email) {
      await db.delete(hiddenMembers).where(eq(hiddenMembers.email, updateData.email.toLowerCase())).catch(() => {})
    }
    const result = await db
      .update(members)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning()
    
    if (result.length === 0) {
      return { success: false, error: 'Member not found' }
    }
    
    return { success: true, data: result[0] }
  },

  async delete(id: number): Promise<ApiResponse<any>> {
    const deletedMember = await db.transaction(async (tx) => {
      const existingMember = await tx
        .select({ id: members.id, email: members.email })
        .from(members)
        .where(eq(members.id, id))
        .limit(1)

      if (existingMember.length === 0) {
        return null
      }

      const email = existingMember[0].email
      await tx.delete(members).where(eq(members.id, id))
      await tx.delete(hiddenMembers).where(eq(hiddenMembers.email, email.toLowerCase()))
      await tx.delete(membershipCardLogs).where(eq(membershipCardLogs.email, email))
      await tx.delete(membershipCardLogs).where(eq(membershipCardLogs.email, email.toLowerCase()))

      return existingMember[0]
    })

    if (!deletedMember) {
      return { success: false, error: 'Member not found' }
    }

    return { success: true, message: 'Member deleted successfully' }
  },

  async getStats(): Promise<ApiResponse<any>> {
    const [total, active, byType] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(members),
      db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.status, 'Active')),
      db.select({
        type: members.memberType,
        count: sql<number>`count(*)`,
      })
        .from(members)
        .groupBy(members.memberType),
    ])
    
    return {
      success: true,
      data: {
        totalMembers: Number(total[0]?.count || 0),
        activeMembers: Number(active[0]?.count || 0),
        byMemberType: byType,
      },
    }
  },
}
