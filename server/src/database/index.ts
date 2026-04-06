import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../models/index.js'
import { config } from '../config/index.js'

const connectionString = config.database.url

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
