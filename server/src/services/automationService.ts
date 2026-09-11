import { sendMembershipCard } from './emailService.js'
import { db } from '../database/index.js'
import { membershipCardLogs } from '../models/index.js'
import { config } from '../config/index.js'
import { getUnifiedEntries } from './memberDataService.js'
import { countUnsyncedMembers, syncSheetsToDatabase } from './syncService.js'

let intervalId: NodeJS.Timeout | null = null
const POLL_INTERVAL = 1 * 60 * 1000 // 1 minute

/** Number of new (un-synced) sheet members that triggers an automatic DB sync. */
const AUTO_SYNC_THRESHOLD = 10

export interface AutomationResult {
  totalInSheet: number
  totalWithEmail: number
  alreadySent: number
  newMembers: number
  paymentPending: number
  emailsSent: number
  emailsFailed: number
  syncTriggered: boolean
  syncInserted: number
}

export async function processAutomatedCards(): Promise<AutomationResult> {
  console.log('[Automation] Checking for new members (Unified Data)...')
  
  const result: AutomationResult = {
    totalInSheet: 0,
    totalWithEmail: 0,
    alreadySent: 0,
    newMembers: 0,
    paymentPending: 0,
    emailsSent: 0,
    emailsFailed: 0,
    syncTriggered: false,
    syncInserted: 0,
  }

  try {
    // ── Auto-sync: if enough new sheet members aren't in the DB yet, sync them ──
    try {
      const unsynced = await countUnsyncedMembers()
      console.log(`[Automation] Unsynced sheet members: ${unsynced}`)

      if (unsynced >= AUTO_SYNC_THRESHOLD) {
        console.log(`[Automation] ≥ ${AUTO_SYNC_THRESHOLD} new members detected — running auto-sync...`)
        const syncResult = await syncSheetsToDatabase()
        result.syncTriggered = true
        result.syncInserted = syncResult.inserted
        console.log(`[Automation] Auto-sync done. Inserted: ${syncResult.inserted}, Updated: ${syncResult.updated}`)
      }
    } catch (syncErr) {
      // Sync failure is non-fatal — we still continue with card processing
      console.error('[Automation] Auto-sync check failed (non-fatal):', syncErr)
    }

    // ── Card processing (existing logic) ──
    // Get unified entries (Sheets + DB Overrides - Hidden)
    const entries = await getUnifiedEntries(true)
    result.totalInSheet = entries.length

    if (!entries.length) {
      console.log('[Automation] No entries found.')
      return result
    }

    const withEmail = entries.filter(e => e.email)
    result.totalWithEmail = withEmail.length
    
    const alreadySent = entries.filter(e => e.cardSent)
    result.alreadySent = alreadySent.length

    // Filter for new members who haven't received a card AND have paid their fees
    // This now uses the unified 'cardSent' status and 'fees' which prioritize DB edits
    const newMembers = entries.filter(e => 
      e.email && 
      !e.cardSent && 
      e.fees?.toLowerCase() === 'yes'
    )
    result.newMembers = newMembers.length

    if (newMembers.length === 0) {
      console.log('[Automation] No new members to process.')
      return result
    }

    // SLICE to batch size to avoid Vercel timeouts
    const batchSize = config.smtp.batchSize
    const membersToProcess = newMembers.slice(0, batchSize)

    console.log(`[Automation] ${newMembers.length} new member(s) found. Processing batch of ${membersToProcess.length}...`)

    for (const member of membersToProcess) {
      if (!member.email) continue

      const sendResult = await sendMembershipCard({
        name: member.name || 'Member',
        email: member.email,
        id: member.id != null ? String(member.id) : undefined,
        fees: member.fees,
        bloodGroup: member.bloodGroup,
        address: member.address,
      })

      if (sendResult.success) {
        // Log to DB so we don't send again
        await db.insert(membershipCardLogs).values({
          email: member.email,
          sentAt: new Date()
        })
        console.log(`[Automation] ✅ Successfully sent card to ${member.email} (${member.source === 'db' ? 'Edited' : 'Sheet'})`)
        result.emailsSent++
      } else {
        console.error(`[Automation] ❌ Failed to send card to ${member.email}:`, sendResult.error)
        result.emailsFailed++
      }
    }

    console.log(`[Automation] Done. Sent: ${result.emailsSent}, Failed: ${result.emailsFailed}`)
  } catch (err) {
    console.error('[Automation] Error in automated card processing:', err)
  }

  return result
}

export function startAutomationWorker() {
  if (intervalId) return
  console.log('[Automation] Starting automation worker...')
  processAutomatedCards()
  intervalId = setInterval(processAutomatedCards, POLL_INTERVAL)
}

export function stopAutomationWorker() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[Automation] Stopped automation worker.')
  }
}
