import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'
import path from 'path'

// Load from project root .env first, then server/.env as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '.env') })

export default defineConfig({
  schema: './src/models/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
