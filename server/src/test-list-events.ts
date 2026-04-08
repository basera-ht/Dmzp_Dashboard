import { db } from './database/index.js';
import { events } from './models/index.js';

async function listEvents() {
  const allEvents = await db.select().from(events);
  console.log('All Events:');
  console.log(allEvents);
  process.exit(0);
}

listEvents().catch(console.error);
