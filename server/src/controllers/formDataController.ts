import { db } from '../database/index.js'
import { members, hiddenMembers } from '../models/index.js'
import { eq } from 'drizzle-orm'
import type { ApiResponse } from '../types/index.js'
import { fetchFormData, getDefaultStats, type FormEntry, type FormStats } from '../services/googleSheets.js'

export const formDataController = {
  async getStats(): Promise<ApiResponse<FormStats>> {
    try {
      const sheetStats = await fetchFormData()
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

      return {
        success: true,
        data: {
          ...sheetStats,
          totalMembers,
          totalFees,
          byInstitution,
          byCourse,
          byBloodGroup,
          allEntries: filteredSheetEntries, // Keep allEntries updated in stats too
        },
      }
    } catch (error) {
      console.error('Error fetching form stats:', error)
      return { success: false, error: 'Failed to fetch form data', code: 'FORM_DATA_ERROR' }
    }
  },

  async getEntries(page = 1, limit = 50): Promise<ApiResponse<{ entries: FormEntry[]; total: number }>> {
    try {
      const sheetStats = await fetchFormData()
      const dbMembersRows = await db.select().from(members)
      
      let hiddenEmails = new Set<string>()
      try {
        const hiddens = await db.select().from(hiddenMembers)
        hiddenEmails = new Set(hiddens.map(h => h.email.toLowerCase()))
      } catch (err) {
        // Fallback for missing table
      }

      // Map DB rows to FormEntry format
      const dbEntries: FormEntry[] = dbMembersRows.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone || '',
        institution: m.institution || '',
        course: m.course || '',
        address: m.address || '',
        bloodGroup: m.bloodGroup || '',
        fees: m.fees || 'no',
      }))

      // Merge and filter
      const allEntries = [...sheetStats.allEntries, ...dbEntries]
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
    try {
      await db.insert(hiddenMembers).values({ email }).onConflictDoNothing()
      return { success: true, data: { email } }
    } catch (error) {
      console.error('Error hiding email:', error)
      return { success: false, error: 'Failed to hide member' }
    }
  },
}