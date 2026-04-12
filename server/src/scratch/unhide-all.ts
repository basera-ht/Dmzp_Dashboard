import { db } from '../database/index.js';
import { hiddenMembers } from '../models/index.js';

async function unhideAll() {
  console.log('--- Unhiding All Members ---');
  try {
    const result = await db.delete(hiddenMembers).execute();
    console.log('Successfully cleared hidden_members table.');
    console.log('All members should now be visible in the dashboard.');
  } catch (err) {
    console.error('Failed to unhide members:', err);
  } finally {
    process.exit(0);
  }
}

unhideAll();
