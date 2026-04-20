import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../models/index.js'
import { config } from '../config/index.js'

const connectionString = config.database.url

const client = postgres(connectionString, {
  max: 5,              // Allow few more connections for parallel queries
  idle_timeout: 20,    // Close idle connections quickly
  connect_timeout: 15, // Fail if DB is unreachable
  prepare: false,      // Necessary for Supabase Transaction mode poolers
})

export const db = drizzle(client, { schema })
