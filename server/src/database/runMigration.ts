import postgres from 'postgres'
import { config } from '../config/index.js'

const sql = postgres(config.database.url)

async function runMigration() {
  console.log('Running migration...')
  
  try {
    // Create event_email_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS event_email_logs (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'sent' NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log('✓ event_email_logs table created')
    
    // Create indexes for event_email_logs
    await sql`CREATE INDEX IF NOT EXISTS idx_event_email_logs_event_id ON event_email_logs(event_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_event_email_logs_email ON event_email_logs(email)`
    console.log('✓ event_email_logs indexes created')
    
    // Create event_posters table
    await sql`
      CREATE TABLE IF NOT EXISTS event_posters (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL UNIQUE,
        poster_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log('✓ event_posters table created')
    
    // Create index for event_posters
    await sql`CREATE INDEX IF NOT EXISTS idx_event_posters_event_id ON event_posters(event_id)`
    console.log('✓ event_posters index created')
    
    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
