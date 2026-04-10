import { eq, and, sql } from 'drizzle-orm'
import { db } from '../database/index.js'
import { members, hiddenMembers, eventEmailLogs, events } from '../models/index.js'
import { transporter } from './emailService.js'
import { getMemberEmailsFromSheets } from './googleSheets.js'

export interface EventEmailData {
  id: number
  title: string
  date: string
  time: string
  location: string
  description?: string | null
  posterUrl?: string | null
}

export interface BroadcastState {
  eventId: number
  status: 'idle' | 'running' | 'cancelled' | 'completed'
  sent: number
  failed: number
  total: number
}

const broadcastStates = new Map<number, BroadcastState>()

export interface BroadcastProgress {
  status: 'idle' | 'running' | 'cancelled' | 'completed'
  sent: number
  failed: number
  total: number
  startedAt?: string
  completedAt?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateEventEmailHtml(event: EventEmailData): string {
  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#2e3859;padding:30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Delhi Mizo Zirlai Pawl</h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Tan Rual Hi Chakna A Ni — Est. 1959</p>
            </td>
          </tr>
          
          <!-- Announcement -->
          <tr>
            <td style="padding:30px 30px 10px;">
              <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
                We're excited to announce a new upcoming event! Check out the details below.
              </p>
            </td>
          </tr>
          
          <!-- Poster Image -->
          ${event.posterUrl ? `
          <tr>
            <td style="padding:0 30px 20px;text-align:center;">
              <img 
                src="${escapeHtml(event.posterUrl)}" 
                alt="${escapeHtml(event.title)}" 
                style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"
              />
            </td>
          </tr>
          ` : ''}
          
          <!-- Event Details -->
          <tr>
            <td style="padding:0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:25px;">
                    <h2 style="margin:0 0 20px;color:#2e3859;font-size:22px;font-weight:700;">${escapeHtml(event.title)}</h2>
                    
                    ${event.description ? `
                    <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">${escapeHtml(event.description)}</p>
                    ` : ''}
                    
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;color:#64748b;font-size:14px;width:100px;vertical-align:top;">📅 Date</td>
                        <td style="padding-bottom:12px;color:#1e293b;font-size:14px;font-weight:600;">${eventDate}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;color:#64748b;font-size:14px;vertical-align:top;">🕐 Time</td>
                        <td style="padding-bottom:12px;color:#1e293b;font-size:14px;font-weight:600;">${escapeHtml(event.time || 'TBD')}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:14px;vertical-align:top;">📍 Location</td>
                        <td style="color:#1e293b;font-size:14px;font-weight:600;">${escapeHtml(event.location || 'TBD')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:25px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#64748b;font-size:13px;">DMZP · Est. 1959 · Mizoram, India</p>
              <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">Tan Rual Hi Chakna A Ni</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

async function getAllMemberEmails(forceRefresh: boolean = false): Promise<{ email: string; name?: string }[]> {
  const emails: { email: string; name?: string }[] = []
  
  const hiddenSet = await getHiddenEmails()

  try {
    const dbMembers = await db
      .select({ email: members.email, name: members.name })
      .from(members)
      .where(eq(members.status, 'Active'))
    
    dbMembers.forEach(m => {
      if (!hiddenSet.has(m.email.toLowerCase())) {
        emails.push(m)
      }
    })
  } catch (err) {
    console.error('[EmailBroadcast] Error fetching DB members:', err)
  }

  try {
    const sheetEmails = await getMemberEmailsFromSheets(forceRefresh)
    sheetEmails.forEach(e => {
      if (e.email && 
          !hiddenSet.has(e.email.toLowerCase()) && 
          !emails.some(existing => existing.email.toLowerCase() === e.email.toLowerCase())) {
        emails.push(e)
      }
    })
  } catch (err) {
    console.error('[EmailBroadcast] Error fetching sheet members:', err)
  }

  return emails.filter(e => e.email)
}

export async function getAllMembersForEmail(forceRefresh: boolean = false): Promise<{ email: string; name?: string }[]> {
  return getAllMemberEmails(forceRefresh)
}

async function getHiddenEmails(): Promise<Set<string>> {
  try {
    const hidden = await db.select({ email: hiddenMembers.email }).from(hiddenMembers)
    return new Set(hidden.map(h => h.email.toLowerCase()))
  } catch {
    return new Set()
  }
}

async function getAlreadySentEmails(eventId: number): Promise<Set<string>> {
  try {
    const sent = await db
      .select({ email: eventEmailLogs.email })
      .from(eventEmailLogs)
      .where(eq(eventEmailLogs.eventId, eventId))
    return new Set(sent.map(s => s.email.toLowerCase()))
  } catch {
    return new Set()
  }
}

export async function sendEventEmail(
  event: EventEmailData,
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    return { success: false, error: 'Email service not configured' }
  }

  const html = generateEventEmailHtml(event)

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'DMZP <1959dmzp@gmail.com>',
      to: email,
      subject: `📢 New DMZP Event: ${event.title}`,
      html,
      text: `New DMZP Event: ${event.title}\n\nDate: ${new Date(event.date).toLocaleDateString()}\nTime: ${event.time || 'TBD'}\nLocation: ${event.location || 'TBD'}\n\nDelhi Mizo Zirlai Pawl`,
    })
    return { success: true }
  } catch (err: any) {
    console.error(`[EmailBroadcast] Failed to send to ${email}:`, err.message)
    return { success: false, error: err.message }
  }
}

async function sendAndLogEventEmail(event: EventEmailData, email: string): Promise<{ success: boolean }> {
  const result = await sendEventEmail(event, email)

  try {
    await db.insert(eventEmailLogs).values({
      eventId: event.id,
      email,
      status: result.success ? 'sent' : 'failed',
    })
  } catch (err) {
    console.error('[EmailBroadcast] Failed to log email:', err)
  }

  return result
}

export async function broadcastToAllMembers(event: EventEmailData): Promise<void> {
  const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '10', 10)
  const DELAY_MS = parseInt(process.env.EMAIL_DELAY_MS || '1000', 10)

  const state: BroadcastState = {
    eventId: event.id,
    status: 'running',
    sent: 0,
    failed: 0,
    total: 0,
  }
  broadcastStates.set(event.id, state)

  console.log(`[EmailBroadcast] Starting broadcast for event ${event.id}: ${event.title}`)

  try {
    const [allEmails, hiddenSet, alreadySent] = await Promise.all([
      getAllMemberEmails(true), // Force refresh for broadcast to get absolutely latest recipients
      getHiddenEmails(),
      getAlreadySentEmails(event.id),
    ])

    const validEmails = allEmails.filter(
      e => !hiddenSet.has(e.email.toLowerCase())
    )

    state.total = validEmails.length
    console.log(`[EmailBroadcast] ${validEmails.length} valid recipients (hidden: ${hiddenSet.size}, already sent: ${alreadySent.size})`)

    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      if (state.status === 'cancelled') {
        console.log(`[EmailBroadcast] Broadcast cancelled for event ${event.id}`)
        break
      }

      const batch = validEmails.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(e => sendAndLogEventEmail(event, e.email))
      )

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value.success) {
          state.sent++
        } else {
          state.failed++
        }
      })

      console.log(`[EmailBroadcast] Progress: ${state.sent + state.failed}/${state.total} (sent: ${state.sent}, failed: ${state.failed})`)

      if (i + BATCH_SIZE < validEmails.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }

    state.status = 'completed'
    console.log(`[EmailBroadcast] Broadcast ${state.status} for event ${event.id}: ${state.sent} sent, ${state.failed} failed`)
  } catch (err) {
    console.error(`[EmailBroadcast] Error in broadcast for event ${event.id}:`, err)
    state.status = 'completed'
  }
}

export function cancelBroadcast(eventId: number): boolean {
  const state = broadcastStates.get(eventId)
  if (state && state.status === 'running') {
    state.status = 'cancelled'
    console.log(`[EmailBroadcast] Cancel requested for event ${eventId}`)
    return true
  }
  return false
}

export function getBroadcastStatus(eventId: number): BroadcastProgress | null {
  const state = broadcastStates.get(eventId)
  if (!state) {
    return null
  }

  return {
    status: state.status,
    sent: state.sent,
    failed: state.failed,
    total: state.total,
  }
}

export function isBroadcastRunning(eventId: number): boolean {
  const state = broadcastStates.get(eventId)
  return state?.status === 'running'
}

export async function getEventStats(eventId: number): Promise<{ sent: number; failed: number }> {
  const [sentResult, failedResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(eventEmailLogs).where(
      and(eq(eventEmailLogs.eventId, eventId), eq(eventEmailLogs.status, 'sent'))
    ),
    db.select({ count: sql<number>`count(*)` }).from(eventEmailLogs).where(
      and(eq(eventEmailLogs.eventId, eventId), eq(eventEmailLogs.status, 'failed'))
    ),
  ])

  return {
    sent: Number(sentResult[0]?.count || 0),
    failed: Number(failedResult[0]?.count || 0),
  }
}
