import { db } from './index.js'
import { users, tours } from '../models/index.js'
import { eq, like } from 'drizzle-orm'
import { TEST_CREDENTIALS } from './ensure-tables.js'

async function cleanup() {
  console.log('--- Cleaning Up Test Data & Credentials ---')

  // 1. Delete test user
  const deletedUsers = await db.delete(users).where(eq(users.email, TEST_CREDENTIALS.email)).returning()
  if (deletedUsers.length > 0) {
    console.log(`✅ Deleted temporary test user: ${TEST_CREDENTIALS.email} (ID: ${deletedUsers[0].id})`)
  } else {
    console.log(`ℹ️ Test user ${TEST_CREDENTIALS.email} not found (already deleted).`)
  }

  // 2. Delete only test tours created with dedicated internal test fixture prefixes
  const deletedTours = await db.delete(tours).where(like(tours.slug, '__test_fixture_%')).returning()
  if (deletedTours.length > 0) {
    console.log(`✅ Deleted ${deletedTours.length} temporary test tour(s).`)
  }

  console.log('✅ Cleanup completed.')
  process.exit(0)
}

cleanup().catch((err) => {
  console.error('❌ Cleanup failed:', err)
  process.exit(1)
})
