import { db } from './index.js'
import { users } from '../models/index.js'
import { hashPassword } from '../utils/security.js'
import { eq } from 'drizzle-orm'

async function createUser() {
  const email = '1959dmzp@gmail.com'
  const password = 'Dmzp@2025!'
  const name = 'DMZP User'

  console.log('Creating user...')

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
    if (existingUser.length > 0) {
      console.log('User already exists:', email)
      return
    }

    const { hash, salt } = hashPassword(password)
    const hashedPassword = `${hash}:${salt}`

    const result = await db.insert(users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'Admin',
    }).returning()

    console.log('User created successfully!')
    console.log('Email:', email)
    console.log('Password:', password)
  } catch (error) {
    console.error('Error creating user:', error)
    process.exit(1)
  }
}

createUser()
