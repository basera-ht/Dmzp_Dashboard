import dotenv from 'dotenv'

dotenv.config()

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
    csvUrl: process.env.GOOGLE_SHEETS_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQegjxV-anGx98G9eyhcxLoJwJTkkeLiBsSo0W82QgOhrQDEVrd0S2hkMvD3C9CpFFeqldwmkU9KyBh/pub?output=csv',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.AWS_BUCKET_NAME || 'dmzpbucket',
    region: process.env.AWS_REGION || 'ap-south-1',
    maxFileSize: parseInt(process.env.AWS_MAX_FILE_SIZE || '10485760', 10),
  },
}
