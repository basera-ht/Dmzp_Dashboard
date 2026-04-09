import { fetchFormData } from './googleSheets.js'
import { sendMembershipCard } from './emailService.js'
import { db } from '../database/index.js'
import { membershipCardLogs } from '../models/index.js'
import { eq, inArray } from 'drizzle-orm'

let intervalId: NodeJS.Timeout | null = null
const POLL_INTERVAL = 1 * 60 * 1000 // 1 minute

export async function processAutomatedCards() {
  console.log('[Automation] Checking for new members in Google Sheets...')
  
  try {
    const data = await fetchFormData(true) // Force fresh data from Google Sheets
    const entries = data.allEntries // Scan ALL entries in the sheet, not just the top 10

    if (!entries.length) {
      console.log('[Automation] No entries found.')
      return
    }

    // Get all emails from the current batch
    const emails = entries.map(e => e.email).filter((e): e is string => !!e)
    
    if (!emails.length) return

    // Find which ones have already received a card
    const sentLogs = await db
      .select({ email: membershipCardLogs.email })
      .from(membershipCardLogs)
      .where(inArray(membershipCardLogs.email, emails))

    const sentEmails = new Set(sentLogs.map(l => l.email))

    // Filter for new members who haven't received a card
    const newMembers = entries.filter(e => e.email && !sentEmails.has(e.email))

    if (newMembers.length === 0) {
      console.log('[Automation] No new members to process.')
      return
    }

    console.log(`[Automation] Found ${newMembers.length} new members. Sending cards...`)

    for (const member of newMembers) {
      if (!member.email) continue

      const result = await sendMembershipCard({
        name: member.name || 'Member',
        email: member.email,
        fees: member.fees,
        bloodGroup: member.bloodGroup,
        address: member.address,
      })

      if (result.success) {
        // Log to DB so we don't send again
        await db.insert(membershipCardLogs).values({
          email: member.email,
          sentAt: new Date()
        })
        console.log(`[Automation] Successfully sent and logged card for ${member.email}`)
      } else {
        console.error(`[Automation] Failed to send card for ${member.email}:`, result.error)
      }
    }
  } catch (err) {
    console.error('[Automation] Error in automated card processing:', err)
  }
}

export function startAutomationWorker() {
  if (intervalId) return

  console.log('[Automation] Starting automation worker...')
  
  // Initial run
  processAutomatedCards()

  // Set up recurring interval
  intervalId = setInterval(processAutomatedCards, POLL_INTERVAL)
}

export function stopAutomationWorker() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[Automation] Stopped automation worker.')
  }
}
