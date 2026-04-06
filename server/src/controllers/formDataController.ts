import type { ApiResponse } from '../types/index.js'
import { fetchFormData, getDefaultStats, type FormEntry, type FormStats } from '../services/googleSheets.js'

export const formDataController = {
  async getStats(): Promise<ApiResponse<FormStats>> {
    try {
      const stats = await fetchFormData()
      return { success: true, data: stats }
    } catch (error) {
      console.error('Error fetching form stats:', error)
      return { success: false, error: 'Failed to fetch form data', code: 'FORM_DATA_ERROR' }
    }
  },

  async getEntries(page = 1, limit = 50): Promise<ApiResponse<{ entries: FormEntry[]; total: number }>> {
    try {
      const stats = await fetchFormData()
      const start = (page - 1) * limit
      const end = start + limit
      const entries = stats.recentEntries.length > 0 
        ? stats.recentEntries.slice(start, end)
        : []

      return {
        success: true,
        data: {
          entries,
          total: stats.totalMembers,
        },
      }
    } catch (error) {
      console.error('Error fetching form entries:', error)
      return { success: false, error: 'Failed to fetch form entries', code: 'FORM_DATA_ERROR' }
    }
  },
}