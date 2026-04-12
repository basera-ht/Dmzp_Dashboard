import { db } from '../database/index.js'
import { sql } from 'drizzle-orm'

async function run() {
  console.log('[Security] Starting RLS enablement...')

  const tables = [
    'chapters',
    'members',
    'events',
    'event_email_logs',
    'event_posters',
    'reports',
    'users',
    'membership_card_logs',
    'hidden_members',
    'settings'
  ]

  try {
    for (const table of tables) {
      console.log(`[Security] Enabling RLS for table: ${table}...`)
      await db.execute(sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`))
      
      // We also add a policy to allow EVERYTHING for the service_role and postgres roles
      // though postgres role usually bypasses RLS anyway.
      // This ensures Supabase dashboard remains fully functional.
      console.log(`[Security] Adding bypass/service policy for table: ${table}...`)
      await db.execute(sql.raw(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'Allow all for postgres'
          ) THEN
            CREATE POLICY "Allow all for postgres" ON "${table}" FOR ALL TO postgres USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `))
    }

    console.log('[Security] RLS enablement complete for all tables.')
    process.exit(0)
  } catch (error) {
    console.error('[Security] Error during RLS enablement:', error)
    process.exit(1)
  }
}

run()
