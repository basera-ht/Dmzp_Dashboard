import { pgTable, serial, text, varchar, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'

export const memberStatusEnum = pgEnum('member_status', ['Active', 'Pending', 'Inactive'])
export const memberTypeEnum = pgEnum('member_type', ['Student', 'Professional', 'Organization'])
export const eventStatusEnum = pgEnum('event_status', ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'])
export const reportStatusEnum = pgEnum('report_status', ['Ready', 'Processing', 'Failed'])
export const reportTypeEnum = pgEnum('report_type', ['Growth Analysis', 'Activity Report', 'Performance', 'Demographics', 'Quarterly Report', 'Engagement'])

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  region: varchar('region', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  chapterId: integer('chapter_id').references(() => chapters.id),
  joinDate: timestamp('join_date').defaultNow().notNull(),
  memberType: memberTypeEnum('member_type').notNull(),
  status: memberStatusEnum('member_status').default('Active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  time: varchar('time', { length: 50 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  chapterId: integer('chapter_id').references(() => chapters.id),
  attendees: integer('attendees').default(0).notNull(),
  status: eventStatusEnum('event_status').default('Upcoming').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: reportTypeEnum('report_type').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  status: reportStatusEnum('report_status').default('Processing').notNull(),
  fileUrl: varchar('file_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('Admin').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  emailNotifications: integer('email_notifications').default(1),
  newMemberAlerts: integer('new_member_alerts').default(1),
  weeklyReports: integer('weekly_reports').default(0),
  chapterActivityUpdates: integer('chapter_activity_updates').default(1),
  language: varchar('language', { length: 50 }).default('English'),
  timezone: varchar('timezone', { length: 50 }).default('IST'),
  dateFormat: varchar('date_format', { length: 50 }).default('DD/MM/YYYY'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Chapter = typeof chapters.$inferSelect
export type NewChapter = typeof chapters.$inferInsert
export type Member = typeof members.$inferSelect
export type NewMember = typeof members.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
