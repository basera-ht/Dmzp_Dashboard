import { db } from './index.js'
import { users } from '../models/index.js'
import { hashPassword } from '../utils/security.js'
import { eq } from 'drizzle-orm'

async function seedUser() {
  const email = '1959dmzp@gmail.com'
  const password = 'Dmzp@2025!'
  const name = 'DMZP Admin'

  console.log(`Checking if user ${email} exists...`)

  try {
    const existing = await db.select().from(users).where(eq(users.email, email))
    
    const { hash, salt } = hashPassword(password)
    const hashedPassword = `${hash}:${salt}`

    if (existing.length > 0) {
      console.log('User already exists. Updating password...')
      await db.update(users)
        .set({ password: hashedPassword, name, role: 'Admin' })
        .where(eq(users.email, email))
      console.log('User updated successfully.')
    } else {
      console.log('User does not exist. Creating...')
      await db.insert(users).values({
        email,
        password: hashedPassword,
        name,
        role: 'Admin'
      })
      console.log('User created successfully.')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Seeding error:', error)
    process.exit(1)
  }
}

seedUser()
