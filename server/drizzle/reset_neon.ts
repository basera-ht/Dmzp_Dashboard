import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })
dotenv.config({ path: resolve(__dirname, '../.env') })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

console.log('Connecting to:', dbUrl.replace(/:([^:@]+)@/, ':***@'))

const sql = postgres(dbUrl)
const query = readFileSync(resolve(__dirname, 'reset_neon.sql'), 'utf8')

try {
  await sql.unsafe(query)
  console.log('✓ Database reset complete')
} catch (err) {
  console.error('Reset error:', err)
} finally {
  await sql.end()
}
