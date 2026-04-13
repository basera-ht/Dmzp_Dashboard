import { fetchFormData } from './googleSheets.js'
import { sendMembershipCard } from './emailService.js'
import { db } from '../database/index.js'
import { membershipCardLogs } from '../models/index.js'
import { eq, inArray } from 'drizzle-orm'
import { config } from '../config/index.js'

let intervalId: NodeJS.Timeout | null = null
const POLL_INTERVAL = 1 * 60 * 1000 // 1 minute

export interface AutomationResult {
  totalInSheet: number
  totalWithEmail: number
  alreadySent: number
  newMembers: number
  paymentPending: number
  emailsSent: number
  emailsFailed: number
}

export async function processAutomatedCards(): Promise<AutomationResult> {
  console.log('[Automation] Checking for new members in Google Sheets...')
  
  const result: AutomationResult = {
    totalInSheet: 0,
    totalWithEmail: 0,
    alreadySent: 0,
    newMembers: 0,
    paymentPending: 0,
    emailsSent: 0,
    emailsFailed: 0,
  }

  try {
    const data = await fetchFormData(true) // Force fresh data from Google Sheets
    const entries = data.allEntries // Scan ALL entries in the sheet, not just the top 10

    result.totalInSheet = entries.length

    if (!entries.length) {
      console.log('[Automation] No entries found in Google Sheet.')
      return result
    }

    // Get all emails from the current batch
    const emails = entries.map(e => e.email).filter((e): e is string => !!e)
    result.totalWithEmail = emails.length
    
    if (!emails.length) {
      console.log('[Automation] No entries with valid email addresses found.')
      return result
    }

    // Find which ones have already received a card
    const sentLogs = await db
      .select({ email: membershipCardLogs.email })
      .from(membershipCardLogs)
      .where(inArray(membershipCardLogs.email, emails))

    const sentEmails = new Set(sentLogs.map(l => l.email))
    result.alreadySent = sentEmails.size

    // Filter for new members who haven't received a card AND have paid their fees
    const newMembers = entries.filter(e => 
      e.email && 
      !sentEmails.has(e.email) && 
      e.fees?.toLowerCase() === 'yes'
    )
    result.newMembers = newMembers.length

    if (newMembers.length === 0) {
      console.log('[Automation] No new members to process — all have already been sent cards.')
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
        console.log(`[Automation] ✅ Successfully sent card to ${member.email}`)
        result.emailsSent++
      } else {
        console.error(`[Automation] ❌ Failed to send card to ${member.email}:`, sendResult.error)
        result.emailsFailed++
      }
    }

    console.log(`[Automation] Done. Sent: ${result.emailsSent}, Failed: ${result.emailsFailed}, Payment Pending: ${result.paymentPending}`)
  } catch (err) {
    console.error('[Automation] Error in automated card processing:', err)
  }

  return result
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
