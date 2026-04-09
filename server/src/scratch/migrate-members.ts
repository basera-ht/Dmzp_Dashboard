import { db } from '../database/index.js'
import { sql } from 'drizzle-orm'

async function run() {
  try {
    console.log('Adding columns to members table...')
    await db.execute(sql`
      ALTER TABLE members 
      ADD COLUMN IF NOT EXISTS phone varchar(50),
      ADD COLUMN IF NOT EXISTS institution varchar(255),
      ADD COLUMN IF NOT EXISTS course varchar(255),
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS blood_group varchar(20),
      ADD COLUMN IF NOT EXISTS fees varchar(20) DEFAULT 'no'
    `)
    console.log('Columns added successfully')
    process.exit(0)
  } catch (e) {
    console.error('Migration failed:', e)
    process.exit(1)
  }
}

run()
