import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS membership_card_logs (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  }
}

run();
