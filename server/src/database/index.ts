import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../models/index.js'
import { config } from '../config/index.js'

const connectionString = config.database.url

const client = postgres(connectionString, {
  max: 1,              // Keep connection count low for serverless
  idle_timeout: 20,    // Close idle connections quickly
  connect_timeout: 10, // Fail fast if DB is unreachable
})

export const db = drizzle(client, { schema })
