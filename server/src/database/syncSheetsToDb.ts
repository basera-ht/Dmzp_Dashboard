import { db } from './index.js'
import { members, hiddenMembers } from '../models/index.js'
import { fetchFormData } from '../services/googleSheets.js'
import { eq } from 'drizzle-orm'

async function syncSheetsToDb() {
  console.log('🔄 Fetching entries from Google Sheets...')
  try {
    const stats = await fetchFormData(true)
    const entries = stats.allEntries

    console.log(`Found ${entries.length} members in Google Sheets. Synchronizing to Supabase database...`)

    let insertedCount = 0
    let updatedCount = 0

    for (const entry of entries) {
      if (!entry.email || !entry.name) continue

      const email = entry.email.trim().toLowerCase()
      const name = entry.name.trim()

      // Check if member already exists in DB
      const existing = await db
        .select()
        .from(members)
        .where(eq(members.email, email))
        .limit(1)

      const memberValues = {
        name,
        email,
        phone: entry.phone || '',
        institution: entry.institution || '',
        course: entry.course || '',
        address: entry.address || '',
        bloodGroup: entry.bloodGroup || '',
        fees: entry.fees || 'no',
        memberType: 'Student' as const,
        status: 'Active' as const,
        updatedAt: new Date()
      }

      if (existing.length === 0) {
        await db.insert(members).values({
          ...memberValues,
          createdAt: entry.submittedAt || new Date()
        })
        insertedCount++
      } else {
        await db
          .update(members)
          .set(memberValues)
          .where(eq(members.email, email))
        updatedCount++
      }

      // Also ensure email is un-hidden
      await db.delete(hiddenMembers).where(eq(hiddenMembers.email, email)).catch(() => {})
    }

    const totalInDb = await db.select().from(members)
    console.log(`✅ Synchronization completed!`)
    console.log(`   - New members inserted: ${insertedCount}`)
    console.log(`   - Existing members updated: ${updatedCount}`)
    console.log(`   - Total members in Supabase DB: ${totalInDb.length}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

syncSheetsToDb()
