import { db } from '../database/index.js'
import { members, hiddenMembers } from '../models/index.js'
import { eq, inArray } from 'drizzle-orm'
import type { ApiResponse } from '../types/index.js'
import { getUnifiedEntries, type UnifiedEntry } from '../services/memberDataService.js'

export const formDataController = {
  async getStats(refresh?: boolean): Promise<ApiResponse<any>> {
    try {
      const allEntries = await getUnifiedEntries(refresh)
      
      const byInstitution: Record<string, number> = {}
      const byCourse: Record<string, number> = {}
      const byBloodGroup: Record<string, number> = {}
      let totalFees = 0

      allEntries.forEach(e => {
        if (e.institution) byInstitution[e.institution] = (byInstitution[e.institution] || 0) + 1
        if (e.course) byCourse[e.course] = (byCourse[e.course] || 0) + 1
        if (e.bloodGroup) byBloodGroup[e.bloodGroup] = (byBloodGroup[e.bloodGroup] || 0) + 1
        if (e.fees?.toLowerCase() === 'yes') totalFees++
      })

      const mostPopularCourse = Object.entries(byCourse)
        .filter(([name]) => name && name.trim() !== '')
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

      return {
        success: true,
        data: {
          totalMembers: allEntries.length,
          totalFees,
          byInstitution,
          byCourse,
          byBloodGroup,
          mostPopularCourse,
          recentEntries: allEntries.slice(0, 10),
          allEntries: allEntries,
        },
      }
    } catch (error: any) {
      console.error('Error fetching form stats:', error)
      return { success: false, error: 'Failed to fetch form data', code: 'FORM_DATA_ERROR' }
    }
  },

  async getEntries(page = 1, limit = 50, refresh?: boolean): Promise<ApiResponse<{ entries: UnifiedEntry[]; total: number }>> {
    try {
      const allEntries = await getUnifiedEntries(refresh)
      
      const start = (page - 1) * limit
      const end = start + limit
      const entries = allEntries.slice(start, end)

      return {
        success: true,
        data: {
          entries,
          total: allEntries.length,
        },
      }
    } catch (error: any) {
      console.error('Error fetching form entries:', error)
      return { success: false, error: 'Failed to fetch form entries', code: 'FORM_DATA_ERROR' }
    }
  },

  async hideEmail(email: string): Promise<ApiResponse<{ email: string }>> {
    console.log(`[HideMember] Starting hide for: ${email}`)
    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(hiddenMembers)
          .values({ email: email.toLowerCase() })
          .onConflictDoNothing({ target: hiddenMembers.email })

        await tx
          .delete(members)
          .where(eq(members.email, email.toLowerCase()))
      })
      
      console.log(`[HideMember] Hide and Delete complete.`)
      return { success: true, data: { email } }
    } catch (error: any) {
      console.error(`[HideMember] Error during hide operation:`, error.message)
      return { success: false, error: `Failed to hide member: ${error.message}` }
    }
  },
}