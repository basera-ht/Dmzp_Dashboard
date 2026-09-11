import { syncSheetsToDatabase } from '../services/syncService.js'

async function run() {
  try {
    const result = await syncSheetsToDatabase()
    console.log(`✅ Synchronization completed!`)
    console.log(`   - New members inserted: ${result.inserted}`)
    console.log(`   - Existing members updated: ${result.updated}`)
    console.log(`   - Total members in Supabase DB: ${result.totalInDb}`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

run()

