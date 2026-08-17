import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './index.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigrations() {
  console.log('Running database migrations...')
  try {
    const migrationsFolder = path.resolve(__dirname, '../../drizzle')
    await migrate(db, { migrationsFolder })
    console.log('✅ Database migrations applied successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()
