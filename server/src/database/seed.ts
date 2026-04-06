import { db } from './index.js'
import { chapters, members, events, reports, users, settings } from '../models/index.js'
import { hashPassword } from '../utils/security.js'

async function seed() {
  console.log('Seeding database...')

  try {
    const { hash, salt } = hashPassword('Admin@123')
    const adminPassword = `${hash}:${salt}`

    const existingUsers = await db.select().from(users).limit(1)
    if (existingUsers.length > 0) {
      console.log('Database already seeded. Skipping...')
      return
    }

    const chapterData = [
      { name: 'Mumbai Metro', region: 'South Asia', description: 'Mumbai metropolitan region chapter' },
      { name: 'Delhi Central', region: 'North India', description: 'Delhi NCR region chapter' },
      { name: 'Bangalore Tech', region: 'South India', description: 'Bangalore technology hub chapter' },
      { name: 'Chennai Hub', region: 'South India', description: 'Chennai coastal region chapter' },
      { name: 'Kolkata Guild', region: 'East India', description: 'Kolkata eastern region chapter' },
    ]

    const insertedChapters = await db.insert(chapters).values(chapterData).returning()
    console.log(`Created ${insertedChapters.length} chapters`)

    const adminUser = await db.insert(users).values({
      email: 'admin@impact.org',
      password: adminPassword,
      name: 'Admin User',
      role: 'Admin',
    }).returning()
    console.log(`Created admin user: admin@impact.org`)

    await db.insert(settings).values({
      userId: adminUser[0].id,
      emailNotifications: 1,
      newMemberAlerts: 1,
      weeklyReports: 0,
      chapterActivityUpdates: 1,
      language: 'English',
      timezone: 'IST',
      dateFormat: 'DD/MM/YYYY',
    })
    console.log('Created user settings')

    const memberData = [
      { name: 'Priya Sharma', email: 'priya.sharma@email.com', chapterId: insertedChapters[0].id, memberType: 'Student' as const, status: 'Active' as const },
      { name: 'Raj Patel', email: 'raj.patel@email.com', chapterId: insertedChapters[1].id, memberType: 'Professional' as const, status: 'Active' as const },
      { name: 'Anita Kumar', email: 'anita.kumar@email.com', chapterId: insertedChapters[2].id, memberType: 'Professional' as const, status: 'Active' as const },
      { name: 'Vikram Singh', email: 'vikram.singh@email.com', chapterId: insertedChapters[3].id, memberType: 'Student' as const, status: 'Pending' as const },
      { name: 'Meera Reddy', email: 'meera.reddy@email.com', chapterId: insertedChapters[4].id, memberType: 'Professional' as const, status: 'Active' as const },
      { name: 'Arjun Desai', email: 'arjun.desai@email.com', chapterId: insertedChapters[0].id, memberType: 'Student' as const, status: 'Active' as const },
      { name: 'Kavya Nair', email: 'kavya.nair@email.com', chapterId: insertedChapters[2].id, memberType: 'Professional' as const, status: 'Active' as const },
      { name: 'Rohit Mehta', email: 'rohit.mehta@email.com', chapterId: insertedChapters[1].id, memberType: 'Organization' as const, status: 'Active' as const },
    ]

    const insertedMembers = await db.insert(members).values(memberData).returning()
    console.log(`Created ${insertedMembers.length} members`)

    const eventData = [
      { title: 'Annual Leadership Summit', description: 'Annual chapter leadership meeting', date: new Date('2026-04-15'), time: '10:00 AM', location: 'Mumbai Convention Center', chapterId: insertedChapters[0].id, attendees: 125, status: 'Upcoming' as const },
      { title: 'Community Outreach Program', description: 'Community service initiative', date: new Date('2026-04-18'), time: '2:00 PM', location: 'Delhi Community Hall', chapterId: insertedChapters[1].id, attendees: 78, status: 'Upcoming' as const },
      { title: 'Tech Workshop: Digital Skills', description: 'Digital literacy workshop', date: new Date('2026-04-22'), time: '9:00 AM', location: 'Bangalore Tech Hub', chapterId: insertedChapters[2].id, attendees: 95, status: 'Upcoming' as const },
      { title: 'Networking Mixer', description: 'Professional networking event', date: new Date('2026-04-25'), time: '6:00 PM', location: 'Chennai Business Center', chapterId: insertedChapters[3].id, attendees: 62, status: 'Upcoming' as const },
      { title: 'Youth Mentorship Program', description: 'Mentoring session for students', date: new Date('2026-04-28'), time: '3:00 PM', location: 'Kolkata Youth Center', chapterId: insertedChapters[4].id, attendees: 45, status: 'Upcoming' as const },
    ]

    const insertedEvents = await db.insert(events).values(eventData).returning()
    console.log(`Created ${insertedEvents.length} events`)

    const reportData = [
      { name: 'Monthly Member Growth Report', type: 'Growth Analysis' as const, status: 'Ready' as const },
      { name: 'Chapter Activity Summary', type: 'Activity Report' as const, status: 'Ready' as const },
      { name: 'Regional Performance Analysis', type: 'Performance' as const, status: 'Ready' as const },
      { name: 'Q1 2026 Impact Assessment', type: 'Quarterly Report' as const, status: 'Ready' as const },
      { name: 'Member Demographics Breakdown', type: 'Demographics' as const, status: 'Ready' as const },
      { name: 'Event Participation Trends', type: 'Engagement' as const, status: 'Ready' as const },
    ]

    const insertedReports = await db.insert(reports).values(reportData).returning()
    console.log(`Created ${insertedReports.length} reports`)

    console.log('Database seeded successfully!')
    console.log('\n--- Login Credentials ---')
    console.log('Email: admin@impact.org')
    console.log('Password: Admin@123')
    console.log('-------------------------')

  } catch (error) {
    console.error('Seed error:', error)
    process.exit(1)
  }
}

seed()
