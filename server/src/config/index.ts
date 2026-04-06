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
}
