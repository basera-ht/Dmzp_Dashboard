import { db } from './index.js'
import { sql } from 'drizzle-orm'
import { users } from '../models/index.js'
import { hashPassword } from '../utils/security.js'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

export const TEST_CREDENTIALS = {
  email: 'test.temp.admin@dmzp.local',
  password: process.env.TEST_ADMIN_PASSWORD || `${crypto.randomBytes(8).toString('hex')}Aa1!`,
  name: '[TEMP TEST ACCOUNT - DELETE AFTERWARDS]',
  role: 'Admin',
}

export async function ensureTablesAndTestUser() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_SETUP) {
    throw new Error('Refusing to set up test credentials in production without explicit ALLOW_TEST_SETUP')
  }

  console.log('--- Ensuring Database Tables & Enums ---')

  // 1. Create Enums if not exist
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."tour_status" AS ENUM('draft', 'published', 'archived');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."payment_status" AS ENUM('pending_verification', 'verified', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // 2. Create tours table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tours" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar(255) NOT NULL,
      "slug" varchar(300) NOT NULL UNIQUE,
      "description" text,
      "cover_image" varchar(500),
      "start_date" timestamp NOT NULL,
      "end_date" timestamp NOT NULL,
      "location" varchar(255) NOT NULL,
      "capacity" integer DEFAULT 0,
      "is_paid" boolean DEFAULT false NOT NULL,
      "price" integer DEFAULT 0 NOT NULL,
      "upi_id" varchar(255),
      "upi_qr_image" varchar(500),
      "whatsapp_group_url" varchar(500),
      "custom_form_fields" jsonb DEFAULT '[]'::jsonb,
      "status" "tour_status" DEFAULT 'draft' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `)

  // 3. Create tour_registrations table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tour_registrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "tour_id" integer NOT NULL REFERENCES "public"."tours"("id") ON DELETE cascade,
      "full_name" varchar(255) NOT NULL,
      "email" varchar(255) NOT NULL,
      "phone_number" varchar(50) NOT NULL,
      "custom_responses" jsonb DEFAULT '{}'::jsonb,
      "amount_paid" integer DEFAULT 0 NOT NULL,
      "upi_transaction_id" varchar(100),
      "payment_screenshot_url" varchar(500),
      "payment_status" "payment_status" DEFAULT 'pending_verification' NOT NULL,
      "ticket_code" varchar(50),
      "ticket_sent_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `)

  // Safe migrations for existing databases
  await db.execute(sql`ALTER TABLE "tours" ADD COLUMN IF NOT EXISTS "whatsapp_group_url" varchar(500);`)
  await db.execute(sql`ALTER TABLE "tour_registrations" ADD COLUMN IF NOT EXISTS "ticket_code" varchar(50);`)
  await db.execute(sql`ALTER TABLE "tour_registrations" ADD COLUMN IF NOT EXISTS "ticket_sent_at" timestamp;`)
  await db.execute(sql`UPDATE "tour_registrations" SET "ticket_code" = 'DMZP-TOUR-' || LPAD(id::text, 5, '0') WHERE "ticket_code" IS NULL;`)

  console.log('✅ Tables "tours" and "tour_registrations" ready.')

  // 4. Create or update test credentials securely
  console.log('--- Setting Up Marked Test Credentials ---')
  const existingTestUser = await db.select().from(users).where(eq(users.email, TEST_CREDENTIALS.email)).limit(1)

  const { hash, salt } = hashPassword(TEST_CREDENTIALS.password)
  const passwordHash = `${hash}:${salt}`

  if (existingTestUser.length > 0) {
    await db.update(users).set({
      password: passwordHash,
      name: TEST_CREDENTIALS.name,
      role: TEST_CREDENTIALS.role,
      updatedAt: new Date(),
    }).where(eq(users.email, TEST_CREDENTIALS.email))
    console.log(`✅ Updated existing test user: ${TEST_CREDENTIALS.email}`)
  } else {
    await db.insert(users).values({
      email: TEST_CREDENTIALS.email,
      password: passwordHash,
      name: TEST_CREDENTIALS.name,
      role: TEST_CREDENTIALS.role,
    })
    console.log(`✅ Created marked temporary test user: ${TEST_CREDENTIALS.email}`)
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('ensure-tables')) {
  ensureTablesAndTestUser()
    .then(() => {
      console.log('\n--- Test Account Ready ---')
      console.log(`Email:    ${TEST_CREDENTIALS.email}`)
      console.log(`Password: ${TEST_CREDENTIALS.password}`)
      console.log(`Role:     ${TEST_CREDENTIALS.role}`)
      console.log(`Marking:  ${TEST_CREDENTIALS.name}`)
      console.log('---------------------------\n')
      process.exit(0)
    })
    .catch((err) => {
      console.error('❌ Setup failed:', err)
      process.exit(1)
    })
}
