import { db } from '../database/index.js'
import { members, hiddenMembers, membershipCardLogs } from '../models/index.js'
import { inArray } from 'drizzle-orm'
import { fetchFormData, type FormEntry } from './googleSheets.js'

export interface UnifiedEntry extends FormEntry {
  source: 'sheet' | 'db'
  cardSent: boolean
}

/**
 * Build a normalised "name|phone" key for dedup.
 * Strips all non-digit characters from the phone and lowercases the name.
 * Returns empty string if either part is missing (so it can never match).
 */
export function makeNamePhoneKey(name?: string, phone?: string): string {
  const n = (name || '').trim().toLowerCase()
  const p = (phone || '').trim().replace(/\D/g, '')
  return n && p ? `${n}|${p}` : ''
}

/**
 * Fetches data from Google Sheets and the local Database, then merges them.
 * Local DB entries (edits) always take priority over Sheet entries with the
 * same email **or** the same name + phone number.
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
  
  // 2. Prepare DB entries keyed by email
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

  // 2b. Build secondary lookup: name+phone → DB email (for fallback matching)
  const dbNamePhoneToEmail = new Map<string, string>()
  dbMembersRows.forEach(m => {
    if (!m.email) return
    const key = makeNamePhoneKey(m.name, m.phone || '')
    if (key) dbNamePhoneToEmail.set(key, m.email.toLowerCase())
  })

  // 3. Merge Sheet entries, deduplicating against DB (by email OR name+phone)
  //    and against other sheet entries (to handle repeat form submissions).
  const mergedEntries: UnifiedEntry[] = []
  const seenEmails = new Set<string>()
  const seenNamePhone = new Set<string>()
  
  sheetData.allEntries.forEach(e => {
    if (!e.email) return
    const email = e.email.toLowerCase()
    const npKey = makeNamePhoneKey(e.name, e.phone)

    // Skip sheet-to-sheet duplicates (same email or same name+phone already seen)
    if (seenEmails.has(email)) return
    if (npKey && seenNamePhone.has(npKey)) return

    // Primary match: same email → use DB override
    if (dbEntriesMap.has(email)) {
      const dbEntry = dbEntriesMap.get(email)!
      mergedEntries.push(dbEntry)
      dbEntriesMap.delete(email)
      seenEmails.add(email)
      const dbNpKey = makeNamePhoneKey(dbEntry.name, dbEntry.phone)
      if (dbNpKey) seenNamePhone.add(dbNpKey)
      return
    }

    // Secondary match: same name+phone → use DB override
    const matchedEmail = npKey ? dbNamePhoneToEmail.get(npKey) : undefined
    if (matchedEmail && dbEntriesMap.has(matchedEmail)) {
      const dbEntry = dbEntriesMap.get(matchedEmail)!
      mergedEntries.push(dbEntry)
      dbEntriesMap.delete(matchedEmail)
      seenEmails.add(matchedEmail)
      if (npKey) seenNamePhone.add(npKey)
      return
    }

    // No DB match — use the sheet entry
    mergedEntries.push({
      ...e,
      source: 'sheet',
      cardSent: sentEmails.has(email)
    })
    seenEmails.add(email)
    if (npKey) seenNamePhone.add(npKey)
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
    
    if (dateA !== dateB) {
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    }
    
    // Fallback to ID (Serial/Row index) if dates are identical
    const idA = parseInt(String(a.id)) || 0
    const idB = parseInt(String(b.id)) || 0
    return sortBy === 'newest' ? idB - idA : idA - idB
  })
}
