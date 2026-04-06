import Papa from 'papaparse'
import { config } from '../config/index.js'

export interface FormEntry {
  name?: string
  year?: string
  email?: string
  fees?: string
}

export interface FormStats {
  totalMembers: number
  totalFees: number
  byYear: Record<string, number>
  byMonth: Record<string, number>
  recentEntries: FormEntry[]
}

interface CacheData {
  data: FormStats
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000

let cache: CacheData | null = null

export async function fetchFormData(): Promise<FormStats> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }

  const csvUrl = config.googleSheets?.csvUrl

  if (!csvUrl) {
    console.warn('Google Sheets CSV URL not configured')
    return getDefaultStats()
  }

  try {
    const response = await fetch(csvUrl, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`)
    }

    const csvText = await response.text()
    const entries = parseCSV(csvText)
    const stats = calculateStats(entries)

    cache = { data: stats, timestamp: Date.now() }
    return stats
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    return cache?.data || getDefaultStats()
  }
}

export function parseCSV(csvText: string): FormEntry[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const headers = result.meta.fields || []
  
  const nameCol = headers.find(h => h.toLowerCase().includes('name'))
  const yearCol = headers.find(h => h.toLowerCase().includes('year'))
  const emailCol = headers.find(h => h.toLowerCase().includes('email'))
  const feesCol = headers.find(h => h.toLowerCase().includes('fee') || h.toLowerCase().includes('membership'))

  return result.data.map((row) => ({
    name: nameCol ? row[nameCol]?.trim() : '',
    year: yearCol ? row[yearCol]?.trim() : '',
    email: emailCol ? row[emailCol]?.trim() : '',
    fees: feesCol ? row[feesCol]?.trim() : '0',
  }))
}

export function calculateStats(entries: FormEntry[]): FormStats {
  const byYear: Record<string, number> = {}
  const byMonth: Record<string, number> = {}

  let totalFees = 0
  let paidCount = 0
  let pendingCount = 0

  entries.forEach((entry) => {
    if (entry.year) {
      byYear[entry.year] = (byYear[entry.year] || 0) + 1
    }

    const fees = entry.fees?.toLowerCase() || ''
    if (fees === 'yes' || fees === 'paid' || fees === 'true') {
      paidCount++
      totalFees += 1
    } else if (fees && fees !== 'no' && fees !== 'false' && fees !== '0') {
      const feeAmount = parseFloat(fees)
      if (!isNaN(feeAmount)) {
        totalFees += feeAmount
        paidCount++
      }
    } else if (fees === 'no' || fees === 'false' || fees === '0') {
      pendingCount++
    }
  })

  const sortedEntries = [...entries].reverse().slice(0, 10)

  return {
    totalMembers: entries.length,
    totalFees: paidCount,
    byYear,
    byMonth,
    recentEntries: sortedEntries,
  }
}

export function getDefaultStats(): FormStats {
  return {
    totalMembers: 0,
    totalFees: 0,
    byYear: {},
    byMonth: {},
    recentEntries: [],
  }
}

export function clearCache(): void {
  cache = null
}