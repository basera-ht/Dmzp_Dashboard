import { db } from '../database/index.js'
import { members, hiddenMembers } from '../models/index.js'
import { fetchFormData } from './googleSheets.js'
import { makeNamePhoneKey } from './memberDataService.js'
import { eq } from 'drizzle-orm'

export interface SyncResult {
  totalInSheet: number
  inserted: number
  updated: number
  totalInDb: number
}

/**
 * Count how many Google Sheet entries do NOT yet exist in the database.
 * Matches on both email and name+phone, and ignores in-sheet duplicates.
 */
export async function countUnsyncedMembers(): Promise<number> {
  const [sheetData, dbRows] = await Promise.all([
    fetchFormData(true),
    db.select({ email: members.email, name: members.name, phone: members.phone }).from(members),
  ])

  const dbEmails = new Set(dbRows.filter(r => r.email).map(r => r.email.trim().toLowerCase()))
  const dbNamePhone = new Set(
    dbRows.map(r => makeNamePhoneKey(r.name, r.phone || '')).filter(Boolean)
  )

  const seenSheetEmails = new Set<string>()
  const seenSheetNamePhone = new Set<string>()

  let unsynced = 0
  for (const entry of sheetData.allEntries) {
    if (!entry.email && !entry.name) continue

    const email = (entry.email || '').trim().toLowerCase()
    const npKey = makeNamePhoneKey(entry.name, entry.phone)

    // Deduplicate within the sheet (repeat submissions)
    if (email && seenSheetEmails.has(email)) continue
    if (npKey && seenSheetNamePhone.has(npKey)) continue

    if (email) seenSheetEmails.add(email)
    if (npKey) seenSheetNamePhone.add(npKey)

    // Check if this member exists in DB (by email or name+phone)
    const existsByEmail = email ? dbEmails.has(email) : false
    const existsByNamePhone = npKey ? dbNamePhone.has(npKey) : false

    if (!existsByEmail && !existsByNamePhone) {
      unsynced++
    }
  }

  return unsynced
}

/**
 * Synchronise Google Sheet members into the Supabase database.
 * - New entries are inserted.
 * - Existing entries (matched by email OR name+phone) are updated.
 * - Sheet-level duplicates are deduplicated.
 * - Hidden members are un-hidden if they reappear.
 */
export async function syncSheetsToDatabase(): Promise<SyncResult> {
  console.log('[Sync] 🔄 Fetching entries from Google Sheets...')

  const stats = await fetchFormData(true)
  const entries = stats.allEntries

  console.log(`[Sync] Found ${entries.length} members in Google Sheets. Synchronising...`)

  // Pre-load all existing DB members for matching on email OR name+phone
  const existingRows = await db.select().from(members)

  const dbByEmail = new Map<string, typeof members.$inferSelect>()
  const dbByNamePhone = new Map<string, typeof members.$inferSelect>()

  for (const m of existingRows) {
    if (m.email) {
      dbByEmail.set(m.email.trim().toLowerCase(), m)
    }
    const npKey = makeNamePhoneKey(m.name, m.phone || '')
    if (npKey) {
      dbByNamePhone.set(npKey, m)
    }
  }

  const seenSheetEmails = new Set<string>()
  const seenSheetNamePhone = new Set<string>()

  let inserted = 0
  let updated = 0

  for (const entry of entries) {
    if (!entry.email || !entry.name) continue

    const email = entry.email.trim().toLowerCase()
    const name = entry.name.trim()
    const npKey = makeNamePhoneKey(entry.name, entry.phone)

    // Skip sheet duplicates (e.g. repeated form submissions)
    if (seenSheetEmails.has(email)) continue
    if (npKey && seenSheetNamePhone.has(npKey)) continue

    seenSheetEmails.add(email)
    if (npKey) seenSheetNamePhone.add(npKey)

    // Match existing DB member by email (primary) or name+phone (secondary)
    const existing = dbByEmail.get(email) || (npKey ? dbByNamePhone.get(npKey) : undefined)

    const memberValues = {
      name,
      email: existing ? existing.email : email, // Keep DB email if matched by name+phone
      phone: entry.phone || '',
      institution: entry.institution || '',
      course: entry.course || '',
      address: entry.address || '',
      bloodGroup: entry.bloodGroup || '',
      fees: entry.fees || 'no',
      memberType: 'Student' as const,
      status: 'Active' as const,
      updatedAt: new Date(),
    }

    if (!existing) {
      const newRows = await db.insert(members).values({
        ...memberValues,
        createdAt: entry.submittedAt || new Date(),
      }).returning()

      if (newRows[0]) {
        dbByEmail.set(email, newRows[0])
        if (npKey) dbByNamePhone.set(npKey, newRows[0])
      }
      inserted++
    } else {
      await db
        .update(members)
        .set(memberValues)
        .where(eq(members.id, existing.id))

      const updatedRecord = { ...existing, ...memberValues }
      dbByEmail.set(existing.email.toLowerCase(), updatedRecord)
      if (email !== existing.email.toLowerCase()) {
        dbByEmail.set(email, updatedRecord)
      }
      if (npKey) dbByNamePhone.set(npKey, updatedRecord)
      updated++
    }

    // Ensure email is un-hidden
    await db.delete(hiddenMembers).where(eq(hiddenMembers.email, email)).catch(() => {})
  }

  const totalRows = await db.select({ id: members.id }).from(members)

  const result: SyncResult = {
    totalInSheet: entries.length,
    inserted,
    updated,
    totalInDb: totalRows.length,
  }

  console.log(`[Sync] ✅ Sync complete — inserted: ${inserted}, updated: ${updated}, total DB: ${totalRows.length}`)

  return result
}
