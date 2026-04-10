import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load from the project root .env (works for both monorepo root and server-only runs)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
// Fallback: also try server/.env for backwards compatibility
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dashboard',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  googleSheets: {
    csvUrl: process.env.GOOGLE_SHEETS_CSV_URL || 'https://docs.google.com/spreadsheets/d/1eHZ09KfWKh5ueauYeGIvFE6zGfA1erxXncsBH9jyAdc/export?format=csv',
    sheetUrl: process.env.GOOGLE_SHEETS_URL || 'https://docs.google.com/spreadsheets/d/1eHZ09KfWKh5ueauYeGIvFE6zGfA1erxXncsBH9jyAdc/edit?usp=sharing',
  },
  form: {
    url: process.env.FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSfenQGkrJat7FccR0Ok6gcjZKVYaPW-dyValkZ-lxmteGXUNA/viewform?usp=header',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.AWS_BUCKET_NAME || 'dmzpbucket',
    region: process.env.AWS_REGION || 'ap-south-1',
    maxFileSize: parseInt(process.env.AWS_MAX_FILE_SIZE || '10485760', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'DMZP <noreply@dmzp.org>',
  },
}
