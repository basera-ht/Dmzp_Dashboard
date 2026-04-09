import { db } from './index.js';
import { membershipCardLogs } from '../models/index.js';
import { desc } from 'drizzle-orm';

async function run() {
  try {
    const logs = await db.select().from(membershipCardLogs).orderBy(desc(membershipCardLogs.sentAt)).limit(10);
    console.log('Recent Membership Card Logs:');
    console.log(JSON.stringify(logs, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching logs:', err);
    process.exit(1);
  }
}

run();
