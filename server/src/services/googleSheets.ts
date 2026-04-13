import Papa from 'papaparse'
import { config } from '../config/index.js'
import { resolvePaymentProof, type PaymentProofStatus } from './paymentProofValidation.js'

export type { PaymentProofStatus }

export interface FormEntry {
  id?: number | string
  name?: string
  email?: string
  phone?: string
  institution?: string
  course?: string
  address?: string
  bloodGroup?: string
  fees?: string
  paymentProofStatus?: PaymentProofStatus
  submittedAt?: Date
}

export interface FormStats {
  totalMembers: number
  totalFees: number
  byInstitution: Record<string, number>
  byBloodGroup: Record<string, number>
  byCourse: Record<string, number>
  mostPopularCourse?: string
  recentEntries: FormEntry[]
  allEntries: FormEntry[]
}

interface CacheData {
  data: FormStats
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000

let cache: CacheData | null = null

export async function fetchFormData(forceRefresh: boolean = false): Promise<FormStats> {
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }

  const csvUrl = config.googleSheets?.csvUrl

  if (!csvUrl) {
    console.warn('Google Sheets CSV URL not configured')
    return getDefaultStats()
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout

    console.log(`[GoogleSheets] Fetching CSV from: ${csvUrl.substring(0, 50)}...`)
    const startTime = Date.now()

    const response = await fetch(csvUrl, { 
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    clearTimeout(timeoutId)
    console.log(`[GoogleSheets] Fetch completed in ${Date.now() - startTime}ms`)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`)
    }

    const csvText = await response.text()
    
    // Safety check: Ensure we're not parsing an HTML error/login page as a CSV
    if (csvText.trim().startsWith('<')) {
      throw new Error('Received HTML instead of CSV. Please check Google Sheet sharing permissions (Must be "Anyone with the link").')
    }

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

  // Log headers once to aid debugging
  console.log('[GoogleSheets] CSV headers detected:', headers)
  
  const nameCol    = headers.find(h => h.toLowerCase().includes('hming') || h.toLowerCase().includes('name'))
  const emailCol   = headers.find(h => h.toLowerCase().includes('email'))
  const phoneCol   = headers.find(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('whatsapp'))
  const instCol    = headers.find(h => h.toLowerCase().includes('institution') || h.toLowerCase().includes('zirna in'))
  const courseCol  = headers.find(h => h.toLowerCase().includes('course') || h.toLowerCase().includes('subject'))
  const addressCol = headers.find(h => h.toLowerCase().includes('address'))
  const bloodCol   = headers.find(h => h.toLowerCase().includes('blood'))

  const timestampCol = headers.find(h => 
    h.toLowerCase() === 'timestamp' || 
    h.toLowerCase().includes('date') || 
    h.toLowerCase().includes('a hun')
  )

  // Payment proof column — covers all realistic Google Form question names:
  const PROOF_KEYWORDS = [
    'proof', 'payment', 'receipt', 'upload', 'screenshot',
    'transaction', 'upi', 'transfer', 'thlirna', 'man'
  ]
  const knownCols = new Set([nameCol, emailCol, phoneCol, instCol, courseCol, addressCol, bloodCol, timestampCol].filter(Boolean))

  let proofCol = headers.find(h => PROOF_KEYWORDS.some(kw => h.toLowerCase().includes(kw)))

  // Fallback: scan all unrecognised columns for a row that contains a Google Drive URL
  // We limit this to the first 20 rows to keep it very fast even on huge sheets.
  if (!proofCol) {
    const unknownCols = headers.filter(h => !knownCols.has(h))
    const sampleSize = Math.min(result.data.length, 20)
    
    proofCol = unknownCols.find(col => {
      for (let i = 0; i < sampleSize; i++) {
        const v = result.data[i]?.[col]?.trim() ?? ''
        if (/https?:\/\/drive\.google\.com/i.test(v) ||
            /https?:\/\/[^\s]+/.test(v) ||
            /\.(jpe?g|png|pdf|heic)$/i.test(v)) {
          return true
        }
      }
      return false
    })
  }

  if (!proofCol) {
    console.warn('[GoogleSheets] ⚠️  Could not detect a payment proof column. Members may be marked as unpaid. Headers:', headers)
  } else {
    console.log('[GoogleSheets] Payment proof column detected:', proofCol)
  }

  const pp = config.paymentProof
  const proofOpts = { amount: pp.amount, payeeParts: pp.payeeParts }

  return result.data.map((row, index) => {
    const rawProof = proofCol ? row[proofCol]?.trim() ?? '' : ''
    const { fees, paymentProofStatus } = resolvePaymentProof(rawProof, pp.strict, proofOpts)

    return {
      id: String(index + 1).padStart(3, '0'), // Row index as Serial ID
      name: nameCol ? row[nameCol]?.trim() : '',
      email: emailCol ? row[emailCol]?.trim() : '',
      phone: phoneCol ? row[phoneCol]?.trim() : '',
      institution: instCol ? row[instCol]?.trim() : '',
      course: courseCol ? row[courseCol]?.trim() : '',
      address: addressCol ? row[addressCol]?.trim() : '',
      bloodGroup: bloodCol ? row[bloodCol]?.trim() : '',
      fees,
      ...(paymentProofStatus !== undefined ? { paymentProofStatus } : {}),
      submittedAt: parseSheetDate(timestampCol ? row[timestampCol] : undefined),
    }
  })
}

/**
 * Parses Google Sheets date format: "DD/MM/YYYY HH:mm:ss"
 */
function parseSheetDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined
  
  try {
    // Expected format: "09/04/2026 10:43:15"
    const [datePart, timePart] = dateStr.trim().split(' ')
    if (!datePart) return undefined

    const [day, month, year] = datePart.split('/').map(Number)
    
    let hours = 0, minutes = 0, seconds = 0
    if (timePart) {
      [hours, minutes, seconds] = timePart.split(':').map(Number)
    }

    // Month is 0-indexed in JS Date
    const date = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0)
    
    return isNaN(date.getTime()) ? undefined : date
  } catch (err) {
    console.warn(`[GoogleSheets] Failed to parse date: ${dateStr}`, err)
    return undefined
  }
}

export function calculateStats(entries: FormEntry[]): FormStats {
  const byInstitution: Record<string, number> = {}
  const byBloodGroup: Record<string, number> = {}
  const byCourse: Record<string, number> = {}

  let paidCount = 0

  entries.forEach((entry) => {
    if (entry.institution) {
      byInstitution[entry.institution] = (byInstitution[entry.institution] || 0) + 1
    }
    if (entry.bloodGroup) {
      byBloodGroup[entry.bloodGroup] = (byBloodGroup[entry.bloodGroup] || 0) + 1
    }
    if (entry.course) {
      byCourse[entry.course] = (byCourse[entry.course] || 0) + 1
    }

    if (entry.fees === 'yes') {
      paidCount++
    }
  })

  const sortedEntries = [...entries].reverse().slice(0, 10)

  const mostPopularCourse =
    Object.entries(byCourse)
      .filter(([name]) => name && name.trim() !== '')
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

  return {
    totalMembers: entries.length,
    totalFees: paidCount,
    byInstitution,
    byBloodGroup,
    byCourse,
    mostPopularCourse,
    recentEntries: sortedEntries,
    allEntries: entries,
  }
}

export function getDefaultStats(): FormStats {
  return {
    totalMembers: 0,
    totalFees: 0,
    byInstitution: {},
    byBloodGroup: {},
    byCourse: {},
    mostPopularCourse: 'N/A',
    recentEntries: [],
    allEntries: [],
  }
}

export function clearCache(): void {
  cache = null
}

export async function getMemberEmailsFromSheets(forceRefresh: boolean = false): Promise<{ email: string; name?: string }[]> {
  try {
    const stats = await fetchFormData(forceRefresh)
    if (!stats.allEntries || stats.allEntries.length === 0) {
      console.warn('[GoogleSheets] No entries found in the sheet (or fetch failed)')
    }
    return stats.allEntries
      .filter(entry => entry.email)
      .map(entry => ({
        email: entry.email!,
        name: entry.name,
      }))
  } catch (err) {
    console.error('[GoogleSheets] Error getting member emails:', err)
    return []
  }
}