import { db } from '../database/index.js'
import { members, hiddenMembers, membershipCardLogs } from '../models/index.js'
import { inArray } from 'drizzle-orm'
import { fetchFormData, type FormEntry } from './googleSheets.js'

export interface UnifiedEntry extends FormEntry {
  source: 'sheet' | 'db'
  cardSent: boolean
}

/**
 * Fetches data from Google Sheets and the local Database, then merges them.
 * Local DB entries (edits) always take priority over Sheet entries with the same email.
 */
export async function getUnifiedEntries(
  refresh: boolean = false, 
  sortBy: 'newest' | 'oldest' = 'newest'
): Promise<UnifiedEntry[]> {

  // 1. Fetch Google Sheet data and DB overrides in parallel
  const [sheetData, dbMembersRows, allLogs, hiddens] = await Promise.all([
    fetchFormData(refresh),
    db.select().from(members),
    db.select({ email: membershipCardLogs.email }).from(membershipCardLogs),
    db.select().from(hiddenMembers).catch(() => [])
  ])

  const sentEmails = new Set(allLogs.map(l => l.email.toLowerCase()))
  const hiddenAtMap = new Map(hiddens.map(h => [h.email.toLowerCase(), h.createdAt]))
  
  // 2. Prepare DB entries
  const dbEntriesMap = new Map<string, UnifiedEntry>()
  dbMembersRows.forEach(m => {
    if (!m.email) return
    const email = m.email.toLowerCase()
    dbEntriesMap.set(email, {
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
      cardSent: sentEmails.has(email),
      submittedAt: m.updatedAt || new Date()
    })
  })

  // 3. Prepare Sheet entries, skipping those that have a DB override
  const mergedEntries: UnifiedEntry[] = []
  
  sheetData.allEntries.forEach(e => {
    if (!e.email) return
    const email = e.email.toLowerCase()
    
    if (dbEntriesMap.has(email)) {
      // Use the DB override instead of the sheet entry
      mergedEntries.push(dbEntriesMap.get(email)!)
      dbEntriesMap.delete(email) // Mark as used
    } else {
      // Use the sheet entry
      mergedEntries.push({
        ...e,
        source: 'sheet',
        cardSent: sentEmails.has(email)
      })
    }
  })

  // 4. Add any remaining DB-only entries (members added manually via dashboard)
  dbEntriesMap.forEach(entry => {
    mergedEntries.push(entry)
  })

  // 5. Apply hiding logic
  const filteredEntries = mergedEntries.filter(e => {
    if (!e.email) return false
    const email = e.email.toLowerCase()
    const hiddenAt = hiddenAtMap.get(email)
    
    if (!hiddenAt) return true
    
    // If entry is newer than the hide record (re-submission or post-hide edit), show it
    return e.submittedAt && e.submittedAt > hiddenAt
  })

  // Sort based on parameter
  return filteredEntries.sort((a, b) => {
    const dateA = a.submittedAt?.getTime() || 0
    const dateB = b.submittedAt?.getTime() || 0
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB
  })
}
