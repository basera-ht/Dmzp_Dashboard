import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function test() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`Testing with: ${host}:${port}, User: ${user}`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log('Verification Success!');
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: user,
      subject: 'SMTP Test',
      text: 'If you see this, SMTP is working!'
    });
    console.log('Send Success! MessageID:', info.messageId);
  } catch (err) {
    console.error('SMTP Error:', err);
  }
}

test();
