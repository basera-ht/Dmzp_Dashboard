import PDFDocument from 'pdfkit'
import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import { createTransporter } from './emailService.js'
import { db } from '../database/index.js'
import { tourRegistrations } from '../models/index.js'
import { eq } from 'drizzle-orm'
import type { Tour, TourRegistration } from '../models/index.js'

function formatDate(dateVal: string | Date | undefined): string {
  if (!dateVal) return 'TBA'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── 1. PDF Ticket Generation ──────────────────────────────────────────────────

export function generateTourTicketPdfBuffer(tour: Tour, registration: TourRegistration): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // A5 Landscape: 595.28 x 420 pts
    const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 0 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const ticketCode = registration.ticketCode || `DMZP-TOUR-${registration.id.toString().padStart(5, '0')}`

    // Outer Background
    doc.rect(0, 0, 595.28, 420).fill('#f8fafc')

    // 1. TOP HEADER BAR
    doc.rect(0, 0, 595.28, 50).fill('#1e293b')
    doc.fillColor('#ffffff')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('DELHI MIZO ZIRLAI PAWL (DMZP)', 0, 12, { align: 'center' })
    doc.fillColor('#94a3b8')
      .fontSize(9)
      .font('Helvetica')
      .text('OFFICIAL TOUR BOARDING PASS & TICKET', 0, 30, { align: 'center' })

    // Ticket Frame
    doc.roundedRect(20, 62, 555.28, 335, 12).lineWidth(1).strokeColor('#e2e8f0').stroke()

    // Perforated divider line between Main Pass and Ticket Stub
    const dividerX = 395
    doc.save()
    doc.dash(4, { space: 4 }).strokeColor('#cbd5e1').lineWidth(1)
    doc.moveTo(dividerX, 62).lineTo(dividerX, 397).stroke()
    doc.restore()

    // 2. MAIN PASS (Left Side: x = 35 to 380)
    // Tour Title
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16)
    doc.text(tour.title, 35, 78, { width: 345, height: 40, ellipsis: true })

    // Location & Date
    doc.fillColor('#0d9488').font('Helvetica-Bold').fontSize(10)
    doc.text(`DESTINATION: ${tour.location.toUpperCase()}`, 35, 122)

    doc.fillColor('#475569').font('Helvetica').fontSize(10)
    doc.text(`SCHEDULE: ${formatDate(tour.startDate)} – ${formatDate(tour.endDate)}`, 35, 138)

    // Attendee Info Box
    const boxX = 35
    const boxY = 158
    const boxW = 345
    const boxH = 92
    doc.roundedRect(boxX, boxY, boxW, boxH, 8).fillAndStroke('#f1f5f9', '#e2e8f0')

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('PASSENGER NAME', boxX + 12, boxY + 10)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12)
    doc.text(registration.fullName, boxX + 12, boxY + 22, { width: 200, ellipsis: true })

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('CONTACT EMAIL', boxX + 12, boxY + 42)
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
    doc.text(registration.email, boxX + 12, boxY + 54, { width: 200, ellipsis: true })

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('PHONE NUMBER', boxX + 12, boxY + 68)
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
    doc.text(registration.phoneNumber, boxX + 12, boxY + 79)

    // Status & Fare Box (right half of attendee box)
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('STATUS', boxX + 225, boxY + 10)
    doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(10)
    doc.text('CONFIRMED', boxX + 225, boxY + 22)

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('AMOUNT PAID', boxX + 225, boxY + 42)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11)
    const paidAmount = registration.amountPaid > 0 ? `INR ${registration.amountPaid}` : (tour.isPaid ? `INR ${tour.price}` : 'FREE PASS')
    doc.text(paidAmount, boxX + 225, boxY + 54)

    // WhatsApp Group Banner / Link
    const waY = 260
    if (tour.whatsappGroupUrl) {
      doc.roundedRect(boxX, waY, boxW, 58, 8).fillAndStroke('#f0fdf4', '#bbf7d0')
      doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(10)
      doc.text('TOUR WHATSAPP COMMUNITY GROUP', boxX + 12, waY + 8)
      doc.fillColor('#166534').font('Helvetica').fontSize(8)
      doc.text('Join for live departure coordination, itinerary updates, and announcements:', boxX + 12, waY + 22)
      doc.fillColor('#047857').font('Helvetica-Bold').fontSize(8)
      doc.text(tour.whatsappGroupUrl, boxX + 12, waY + 36, {
        width: 320,
        ellipsis: true,
        link: tour.whatsappGroupUrl,
        underline: true,
      })
    } else {
      doc.roundedRect(boxX, waY, boxW, 58, 8).fillAndStroke('#f8fafc', '#e2e8f0')
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9)
      doc.text('TRAVEL INSTRUCTIONS', boxX + 12, waY + 10)
      doc.fillColor('#64748b').font('Helvetica').fontSize(8)
      doc.text('Please reach the boarding point 30 minutes before departure with a valid photo ID.', boxX + 12, waY + 26)
    }

    // Guidelines snippet at bottom
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
    doc.text('DMZP Tour Services · Valid government photo ID required for boarding · Non-transferable ticket', 35, 335)

    // 3. TICKET STUB (Right Side: x = 405 to 565)
    const stubX = 408
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11)
    doc.text('BOARDING STUB', stubX, 78)

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('TICKET REFERENCE', stubX, 102)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10)
    doc.text(ticketCode, stubX, 114)

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('DESTINATION', stubX, 138)
    doc.fillColor('#0f172a').font('Helvetica').fontSize(9)
    doc.text(tour.location, stubX, 150, { width: 155, ellipsis: true })

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('DEPARTURE DATE', stubX, 174)
    doc.fillColor('#0f172a').font('Helvetica').fontSize(9)
    doc.text(formatDate(tour.startDate), stubX, 186)

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('PASSENGER', stubX, 210)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
    doc.text(registration.fullName, stubX, 222, { width: 155, ellipsis: true })

    // Stub guidelines
    doc.roundedRect(stubX, 248, 155, 78, 6).fillAndStroke('#f8fafc', '#e2e8f0')
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5)
    doc.text('TOUR CHECK-IN RULES', stubX + 8, 256)
    doc.fillColor('#64748b').font('Helvetica').fontSize(6.5).lineGap(2)
    doc.text('• Show this e-ticket at boarding\n• Carry valid original Photo ID\n• Arrive 30 mins before departure\n• Follow tour leads & guidelines', stubX + 8, 270)

    // Security watermark
    doc.fillColor('#cbd5e1').font('Helvetica-Bold').fontSize(7)
    doc.text('AUTHENTIC DMZP PASS', stubX, 335, { align: 'center', width: 155 })

    doc.end()
  })
}

// ── 2. HTML Email Generation ─────────────────────────────────────────────────

export function generateTourTicketHtml(tour: Tour, registration: TourRegistration, ticketWebUrl: string): string {
  const ticketCode = registration.ticketCode || `DMZP-TOUR-${registration.id.toString().padStart(5, '0')}`
  const formattedDates = `${formatDate(tour.startDate)} – ${formatDate(tour.endDate)}`
  const paidText = registration.amountPaid > 0 ? `₹${registration.amountPaid.toLocaleString('en-IN')}` : (tour.isPaid ? `₹${tour.price.toLocaleString('en-IN')}` : 'Free Registration')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tour Ticket - ${tour.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;line-height:1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.06),0 8px 10px -6px rgba(0,0,0,0.04);border:1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 24px;text-align:center;color:#ffffff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ccfbf1;margin-bottom:6px;">Delhi Mizo Zirlai Pawl (DMZP)</div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.2;">Your Tour Ticket is Confirmed! 🎟️</h1>
              <div style="margin-top:8px;font-size:13px;color:#99f6e4;">Ticket Reference: <strong>${ticketCode}</strong></div>
            </td>
          </tr>

          <!-- Intro Message -->
          <tr>
            <td style="padding:28px 28px 12px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Dear <strong>${registration.fullName}</strong>,</p>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                Congratulations! Your registration for <strong>${tour.title}</strong> has been officially confirmed. We are excited to have you join us for this tour.
              </p>
            </td>
          </tr>

          <!-- Ticket Summary Box -->
          <tr>
            <td style="padding:12px 28px 24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;padding:20px;">
                <tr>
                  <td colspan="2" style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Tour</span>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${tour.title}</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-top:12px;padding-right:8px;vertical-align:top;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Destination</span>
                    <div style="font-size:13px;font-weight:600;color:#0d9488;margin-top:2px;">📍 ${tour.location}</div>
                  </td>
                  <td width="50%" style="padding-top:12px;padding-left:8px;vertical-align:top;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Dates</span>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">📅 ${formattedDates}</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-top:12px;padding-right:8px;vertical-align:top;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Passenger</span>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${registration.fullName}</div>
                  </td>
                  <td width="50%" style="padding-top:12px;padding-left:8px;vertical-align:top;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Payment</span>
                    <div style="font-size:13px;font-weight:700;color:#16a34a;margin-top:2px;">Confirmed (${paidText})</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${tour.whatsappGroupUrl ? `
          <!-- WhatsApp Community Callout -->
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:20px;text-align:center;">
                <tr>
                  <td>
                    <div style="font-size:16px;font-weight:800;color:#166534;margin-bottom:6px;">
                      💬 Join the Official Tour WhatsApp Group
                    </div>
                    <p style="margin:0 0 16px;font-size:13px;color:#15803d;line-height:1.5;">
                      Stay updated with real-time departure details, boarding locations, packing lists, and group coordination:
                    </p>
                    <a href="${tour.whatsappGroupUrl}" target="_blank" style="display:inline-block;background-color:#25D366;color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(37,211,102,0.35);">
                      Join Tour WhatsApp Group →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- View Online Ticket CTA -->
          <tr>
            <td style="padding:0 28px 24px 28px;text-align:center;">
              <a href="${ticketWebUrl}" target="_blank" style="display:inline-block;background-color:#0d9488;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
                🎫 View & Print Ticket Pass Online
              </a>
              <div style="margin-top:10px;font-size:12px;color:#64748b;">
                Your official PDF ticket is also attached to this email.
              </div>
            </td>
          </tr>

          <!-- Important Guidelines -->
          <tr>
            <td style="padding:16px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <h4 style="margin:0 0 8px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Important Tour Guidelines</h4>
              <ul style="margin:0;padding-left:18px;font-size:12px;color:#64748b;line-height:1.6;">
                <li>Please present your digital ticket or printout at the boarding desk.</li>
                <li>Carry a valid original government photo ID (Aadhaar / Voter ID / Passport).</li>
                <li>Arrive at the designated boarding point at least 30 minutes prior to departure.</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px;text-align:center;background-color:#1e293b;color:#94a3b8;font-size:12px;">
              <p style="margin:0 0 4px;font-weight:600;color:#f8fafc;">Delhi Mizo Zirlai Pawl (DMZP)</p>
              <p style="margin:0;">Fostering unity and community since 1959 · New Delhi, India</p>
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

// ── 3. Send Ticket Email ──────────────────────────────────────────────────────

export async function sendTourTicketEmail(
  tour: Tour,
  registration: TourRegistration
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const toEmail = registration.email.trim()
    if (!toEmail) {
      return { success: false, error: 'Registration has no email address' }
    }

    // Resolve web origin for the ticket link
    const frontendOrigin = config.cors.origin && config.cors.origin !== '*'
      ? config.cors.origin
      : 'http://localhost:5173'

    const ticketWebUrl = `${frontendOrigin}/tour/${tour.slug}/ticket/${registration.id}`

    // Generate PDF Ticket Buffer
    const pdfBuffer = await generateTourTicketPdfBuffer(tour, registration)
    const safeTourTitle = tour.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
    const safeName = registration.fullName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
    const pdfFilename = `DMZP_Tour_Ticket_${safeTourTitle}_${safeName}.pdf`

    const html = generateTourTicketHtml(tour, registration, ticketWebUrl)

    const attachments: nodemailer.SendMailOptions['attachments'] = [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ]

    const transporter = createTransporter()
    if (!transporter) {
      console.warn(`[TourTicket] ⚠️ SMTP unconfigured. Simulated ticket email for ${toEmail}:`)
      console.log(`[TourTicket] Ticket URL: ${ticketWebUrl}`)
      if (tour.whatsappGroupUrl) {
        console.log(`[TourTicket] WhatsApp Group: ${tour.whatsappGroupUrl}`)
      }

      // Record ticket sent timestamp even in local mock mode
      await db.update(tourRegistrations)
        .set({ ticketSentAt: new Date() })
        .where(eq(tourRegistrations.id, registration.id))

      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      }
    }

    const from = process.env.SMTP_FROM || `DMZP Tours <${process.env.SMTP_USER}>`

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `🎟️ Your Tour Ticket: ${tour.title} — DMZP`,
      html,
      text: `Dear ${registration.fullName},\n\nYour tour registration for "${tour.title}" has been confirmed!\n\nDates: ${formatDate(tour.startDate)} – ${formatDate(tour.endDate)}\nDestination: ${tour.location}\nTicket Reference: ${registration.ticketCode || `DMZP-TOUR-${registration.id}`}\n\n${tour.whatsappGroupUrl ? `Join the official tour WhatsApp group:\n${tour.whatsappGroupUrl}\n\n` : ''}View your digital ticket online:\n${ticketWebUrl}\n\nPlease find your official ticket PDF attached.\n\nDelhi Mizo Zirlai Pawl (DMZP)`,
      attachments,
    })

    console.log(`[TourTicket] ✅ Ticket email successfully sent to ${toEmail} (messageId: ${info.messageId})`)

    // Update ticketSentAt in database
    await db.update(tourRegistrations)
      .set({ ticketSentAt: new Date() })
      .where(eq(tourRegistrations.id, registration.id))

    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('[TourTicket] ❌ Failed to send ticket email:', error.message)
    return { success: false, error: error.message || 'Failed to send ticket email' }
  }
}
