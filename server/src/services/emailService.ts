import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import PDFDocument from 'pdfkit'

// Ensure .env is always fresh
dotenv.config()

interface MemberCardData {
  name: string
  email: string
  id?: string
  bloodGroup?: string
  address?: string
  fees?: string
}

export function generateMembershipCardPdfBuffer(member: MemberCardData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // A5 Landscape: 595.28 x 420 pts
    const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 0 })
    const chunks: Buffer[] = []
    const logoRelPath = 'src/assets/logo.png'
    const logoFullPath = `y:\\Code PR\\DmzpDashboardTur\\server\\${logoRelPath}`

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // 1. TOP HEADER BAR
    doc.rect(0, 0, 595.28, 45).fill('#f3f4f6')

    // Header Logos (small) on both sides
    try {
      doc.image(logoFullPath, 90, 8, { width: 30 })
      doc.image(logoFullPath, 475, 8, { width: 30 })
    } catch (e) { /* skip logo if not found */ }

    // Organization Name
    doc.fillColor('#2e3859')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('DELHI MIZO ZIRLAI PAWL', 0, 16, { align: 'center' })

    // 2. MAIN TITLE
    doc.fillColor('#2e3859')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text('MEMBERSHIP CARD 2026-27', 0, 65, { align: 'center' })

    // 3. BACKGROUND DECORATION (MESH PATTERN)
    // Draw subtle wavy lines for the mesh pattern in the background
    doc.save()
    doc.lineWidth(0.5).strokeColor('#e2e8f0').opacity(0.3)
    for (let i = 0; i < 5; i++) {
      doc.moveTo(300, 420 - (i * 15))
        .bezierCurveTo(400, 380 - (i * 15), 500, 440 - (i * 15), 595, 360 - (i * 15))
        .stroke()
      
      doc.moveTo(250, 420 - (i * 10))
        .bezierCurveTo(350, 340 - (i * 10), 450, 460 - (i * 10), 540, 320 - (i * 10))
        .stroke()
    }
    doc.restore()

    // 4. MAIN LOGO (Left Side)
    try {
      doc.image(logoFullPath, 45, 120, { width: 180 })
    } catch (e) { /* skip logo if not found */ }

    // 5. INFO BOX (Right Side)
    // Dark Blue Rounded Background (More rounded as requested)
    const boxX = 235
    const boxY = 125
    const boxW = 325
    const boxH = 210
    doc.roundedRect(boxX, boxY, boxW, boxH, 30).fill('#2e3859') // Changed to same navy blue for consistency

    // Info Text (White)
    const labelX = boxX + 25
    const separatorX = boxX + 115
    const valueX = boxX + 130
    let currentY = boxY + 45

    const fields = [
      { label: 'Name', value: member.name || 'N/A' },
      { label: 'ID number', value: member.id || '002' },
      { label: 'Blood group', value: member.bloodGroup || 'N/A' },
      { label: 'Address', value: member.address || 'N/A' },
    ]

    fields.forEach(field => {
      // Label
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14)
      doc.text(field.label, labelX, currentY)
      
      // Separator (Colon) - Perfectly aligned
      doc.text(':', separatorX, currentY)
      
      // Value - Slightly lighter or italic if needed, but bold white is clear
      doc.font('Helvetica').fontSize(14)
      doc.text(field.value, valueX, currentY, { width: boxW - 145, lineBreak: true })
      
      currentY += 38
    })

    // 6. BOTTOM LEFT DOTS
    doc.fillColor('#cbd5e1').opacity(0.4)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 11; col++) {
        doc.circle(45 + (col * 14), 365 + (row * 14), 2).fill()
      }
    }

    doc.end()
  })
}

function generateMembershipCardHtml(member: MemberCardData): string {
  const isPaid = member.fees?.toLowerCase() === 'yes'
  const memberInitial = member.name?.charAt(0)?.toUpperCase() || '?'
  const memberId = `DMZP-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  const whatsappLink = process.env.WHATSAPP_GROUP_LINK || '[Insert Your WhatsApp Group Link Here]'
  const orgName = process.env.ORG_NAME || 'Delhi Mizo Zirlai Pawl'
  const orgContact = process.env.ORG_CONTACT || '1959dmzp@gmail.com'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>DMZP Membership Card</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="text-align:center;padding-bottom:16px;">
              <h2 style="margin:0;color:#1e3a5f;font-size:22px;font-weight:700;letter-spacing:1px;">Delhi Mizo Zirlai Pawl</h2>
              <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Tan Rual Hi Chakna A Ni — Est. 1959</p>
            </td>
          </tr>
        </table>

        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin-bottom:24px;">
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 16px;color:#1e3a5f;font-size:16px;font-weight:600;">Hi ${member.name},</p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Welcome! Your official Membership Card is attached to this email.</p>
              
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Next step: It's time to join the members-only WhatsApp community.</p>
              
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${whatsappLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">Join WhatsApp Group</a>
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:8px;padding:16px;margin:20px 0;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:#92400e;font-size:12px;font-weight:600;">⚠️ Important Security Notice:</p>
                    <p style="margin:0;color:#a16207;font-size:12px;line-height:1.5;">To protect our community, this group requires admin approval. When you click the link above, your request will be placed in a waiting room. Our system admins will verify your WhatsApp number against the one you provided during registration.</p>
                    <p style="margin:12px 0 0;color:#a16207;font-size:12px;line-height:1.5;">Please do not share this link with anyone else. Unrecognized phone numbers will be permanently denied entry.</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">Let us know if you run into any issues, and we'll see you inside!</p>
              
              <p style="margin:24px 0 0;color:#1e3a5f;font-size:14px;font-weight:600;">Best,<br/>${orgName}</p>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-align:center;">— Your Membership Card —</p>

        <!-- Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eef2f6;border-radius:24px;overflow:hidden;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
          <!-- Header Bar -->
          <tr>
            <td colspan="2" style="background:#f3f4f6;padding:12px;text-align:center;border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="20%" align="right"><img src="cid:logo_img" alt="" width="24" style="display:inline-block;" /></td>
                  <td width="60%" align="center">
                    <span style="color:#2e3859;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Delhi Mizo Zirlai Pawl</span>
                  </td>
                  <td width="20%" align="left"><img src="cid:logo_img" alt="" width="24" style="display:inline-block;" /></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card Title -->
          <tr>
            <td colspan="2" style="padding:20px 10px 10px;text-align:center;">
              <h1 style="margin:0;color:#2e3859;font-size:28px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;">Membership Card 2026-27</h1>
            </td>
          </tr>
          <!-- Main Body -->
          <tr>
            <!-- Logo Column -->
            <td width="38%" style="padding:20px 10px 30px 30px;vertical-align:middle;text-align:center;">
              <img src="cid:logo_img" alt="Logo" width="160" style="display:inline-block;" />
            </td>
            <!-- Info Box Column -->
            <td width="62%" style="padding:20px 35px 30px 10px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#2e3859;border-radius:30px;padding:30px;color:#ffffff;">
                <tr>
                  <td width="35%" style="padding-bottom:12px;font-size:14px;font-weight:700;white-space:nowrap;color:#e2e8f0;">Name</td>
                  <td width="5%" style="padding-bottom:12px;font-size:14px;font-weight:700;color:#e2e8f0;">:</td>
                  <td width="60%" style="padding-bottom:12px;font-size:14px;font-weight:600;line-height:1.2;">${member.name}</td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;font-size:14px;font-weight:700;white-space:nowrap;color:#e2e8f0;">ID number</td>
                  <td style="padding-bottom:12px;font-size:14px;font-weight:700;color:#e2e8f0;">:</td>
                  <td style="padding-bottom:12px;font-size:14px;font-family:monospace;font-weight:600;">${member.id || '001'}</td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;font-size:14px;font-weight:700;white-space:nowrap;color:#e2e8f0;">Blood group</td>
                  <td style="padding-bottom:12px;font-size:14px;font-weight:700;color:#e2e8f0;">:</td>
                  <td style="padding-bottom:12px;font-size:14px;font-weight:600;">${member.bloodGroup || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;font-weight:700;white-space:nowrap;vertical-align:top;color:#e2e8f0;">Address</td>
                  <td style="font-size:14px;font-weight:700;vertical-align:top;color:#e2e8f0;">:</td>
                  <td style="font-size:14px;line-height:1.3;font-weight:600;">${member.address || 'N/A'}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Decoration -->
          <tr>
            <td colspan="2" style="padding:0 35px 30px;text-align:left;">
              <div style="font-size:14px;color:#cbd5e1;line-height:0.8;letter-spacing:8px;opacity:0.6;">•••••••••••</div>
              <div style="font-size:14px;color:#cbd5e1;line-height:0.8;letter-spacing:8px;opacity:0.6;">•••••••••••</div>
            </td>
          </tr>
        </table>

        <table width="520" cellpadding="0" cellspacing="0" style="margin-top:28px;">
          <tr>
            <td style="text-align:center;padding:0 20px;">
              <p style="margin:0 0 8px;color:#475569;font-size:14px;">This is your official DMZP membership card. Please keep this safe.</p>
              <p style="margin:0 0 8px;color:#475569;font-size:13px;">Download your card as PDF: <strong>DMZP_Membership_Card_${member.name.replace(/\s+/g, '_')}.pdf</strong></p>
              <p style="margin:0;color:#94a3b8;font-size:12px;">DMZP · Est. 1959 · Mizoram, India</p>
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

function createTransporter() {
  // Always read fresh from process.env to avoid stale config cache
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''

  console.log(`[Email] SMTP config: host=${host} port=${port} user=${user} pass=${pass ? '***set***' : 'NOT SET'}`)

  if (!user || !pass) {
    console.error('[Email] SMTP_USER or SMTP_PASS is missing in .env')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })
}

// Initialize the transporter once at the module level for pooling/performance
export const transporter = createTransporter()

export async function sendMembershipCard(member: MemberCardData): Promise<{ success: boolean; error?: string }> {
  try {
    if (!transporter) {
      return { success: false, error: 'Email service not configured. Set SMTP_USER and SMTP_PASS in server/.env' }
    }

    const html = generateMembershipCardHtml(member)
    const from = process.env.SMTP_FROM || `DMZP <${process.env.SMTP_USER}>`
    const pdfBuffer = await generateMembershipCardPdfBuffer(member)
    const safeName = member.name.replace(/[^a-zA-Z0-9]/g, '_')
    const pdfFilename = `DMZP_Membership_Card_${safeName}.pdf`

    const info = await transporter.sendMail({
      from,
      to: member.email,
      subject: `Welcome to DMZP — Your Membership Card`,
      html,
      text: `Dear ${member.name},\n\nWelcome to DMZP!\n\nMember Since: 2026-27\nDues: ${member.fees?.toLowerCase() === 'yes' ? 'Paid' : 'Pending'}\n\nDownload your membership card PDF attached to this email.\n\nJoin our WhatsApp community: ${process.env.WHATSAPP_GROUP_LINK || '[WhatsApp Link]'}\n\nDMZP`,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        {
          filename: 'logo.png',
          path: `y:\\Code PR\\DmzpDashboardTur\\server\\src\\assets\\logo.png`,
          cid: 'logo_img',
        },
      ],
    })

    console.log(`[Email] Card sent to ${member.email} — messageId: ${info.messageId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[Email] sendMail error:', error.message)
    return { success: false, error: error.message || 'Unknown email error' }
  }
}

export { generateMembershipCardHtml }
