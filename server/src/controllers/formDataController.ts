import { db } from '../database/index.js'
import { members, hiddenMembers, membershipCardLogs } from '../models/index.js'
import { eq } from 'drizzle-orm'
import type { ApiResponse } from '../types/index.js'
import { fetchFormData, getDefaultStats, type FormEntry, type FormStats } from '../services/googleSheets.js'

export const formDataController = {
  async getStats(refresh?: boolean): Promise<ApiResponse<FormStats>> {
    try {
      const sheetStats = await fetchFormData(refresh)
      const dbMembersRows = await db.select().from(members)
      
      let hiddenEmails = new Set<string>()
      try {
        const hiddens = await db.select().from(hiddenMembers)
        hiddenEmails = new Set(hiddens.map(h => h.email.toLowerCase()))
      } catch (err) {
        console.warn('[Dashboard] Hidden members table not yet migrated, skipping filter')
      }

      // Filter sheet entries
      const filteredSheetEntries = sheetStats.allEntries.filter(e => e.email && !hiddenEmails.has(e.email.toLowerCase()))
      // Filter DB members
      const filteredDbRows = dbMembersRows.filter(m => m.email && !hiddenEmails.has(m.email.toLowerCase()))

      const byInstitution: Record<string, number> = {}
      const byCourse: Record<string, number> = {}
      const byBloodGroup: Record<string, number> = {}
      let totalFees = 0

      // Process Sheet
      filteredSheetEntries.forEach(e => {
        if (e.institution) byInstitution[e.institution] = (byInstitution[e.institution] || 0) + 1
        if (e.course) byCourse[e.course] = (byCourse[e.course] || 0) + 1
        if (e.bloodGroup) byBloodGroup[e.bloodGroup] = (byBloodGroup[e.bloodGroup] || 0) + 1
        if (e.fees?.toLowerCase() === 'yes') totalFees++
      })

      // Process DB
      filteredDbRows.forEach(m => {
        if (m.institution) byInstitution[m.institution] = (byInstitution[m.institution] || 0) + 1
        if (m.course) byCourse[m.course] = (byCourse[m.course] || 0) + 1
        if (m.bloodGroup) byBloodGroup[m.bloodGroup] = (byBloodGroup[m.bloodGroup] || 0) + 1
        if (m.fees?.toLowerCase() === 'yes') totalFees++
      })

      const totalMembers = filteredSheetEntries.length + filteredDbRows.length

      // Compute the most popular course by count
      const mostPopularCourse = Object.entries(byCourse)
        .filter(([name]) => name && name.trim() !== '')
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

      return {
        success: true,
        data: {
          ...sheetStats,
          totalMembers,
          totalFees,
          byInstitution,
          byCourse,
          byBloodGroup,
          mostPopularCourse,
          allEntries: filteredSheetEntries, // Keep allEntries updated in stats too
        },
      }
    } catch (error) {
      console.error('Error fetching form stats:', error)
      return { success: false, error: 'Failed to fetch form data', code: 'FORM_DATA_ERROR' }
    }
  },

  async getEntries(page = 1, limit = 50, refresh?: boolean): Promise<ApiResponse<{ entries: FormEntry[]; total: number }>> {
    try {
      const sheetStats = await fetchFormData(refresh)
      const dbMembersRows = await db.select().from(members)
      
      const [allLogs, hiddens] = await Promise.all([
        db.select().from(membershipCardLogs),
        db.select().from(hiddenMembers).catch(() => [])
      ])

      const sentEmails = new Set(allLogs.map(l => l.email.toLowerCase()))
      const hiddenEmails = new Set(hiddens.map(h => h.email.toLowerCase()))

      // Map DB rows to FormEntry format
      const dbEntries: FormEntry[] = dbMembersRows.map(m => ({
        id: String(m.id),
        name: m.name,
        email: m.email,
        phone: m.phone || '',
        institution: m.institution || '',
        course: m.course || '',
        address: m.address || '',
        bloodGroup: m.bloodGroup || '',
        fees: m.fees || 'no',
        source: 'db',
        cardSent: sentEmails.has(m.email.toLowerCase())
      }))

      // Merge and filter
      const sheetEntries = sheetStats.allEntries.map(e => ({
        ...e,
        source: 'sheet' as const,
        cardSent: e.email ? sentEmails.has(e.email.toLowerCase()) : false
      }))

      const allEntries = [...sheetEntries, ...dbEntries]
        .filter(e => e.email && !hiddenEmails.has(e.email.toLowerCase()))

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
    } catch (error) {
      console.error('Error fetching form entries:', error)
      return { success: false, error: 'Failed to fetch form entries', code: 'FORM_DATA_ERROR' }
    }
  },

  async hideEmail(email: string): Promise<ApiResponse<{ email: string }>> {
    console.log(`[HideMember] Starting hide for: ${email}`)
    try {
      console.log(`[HideMember] Inserting into hidden_members...`)
      const result = await db
        .insert(hiddenMembers)
        .values({ email: email.toLowerCase() })
        .onConflictDoNothing({ target: hiddenMembers.email })
        .returning()
      
      console.log(`[HideMember] Insert complete. Result:`, JSON.stringify(result))
      return { success: true, data: { email } }
    } catch (error: any) {
      console.error(`[HideMember] Error during hide operation:`, error.message)
      console.error(`[HideMember] Full error:`, error)
      return { success: false, error: `Failed to hide member: ${error.message}` }
    }
  },
}