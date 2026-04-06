import { sql } from 'drizzle-orm'
import { db } from '../database/index.js'
import { members, chapters, events, reports } from '../models/index.js'
import type { ApiResponse } from '../types/index.js'

export const dashboardController = {
  async getMetrics(): Promise<ApiResponse<any>> {
    const [totalMembers, activeChapters, newSignups, mostActiveRegion] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(members),
      db.select({ count: sql<number>`count(*)` }).from(chapters),
      db.select({ count: sql<number>`count(*)` }).from(members),
      db.select({ region: chapters.region, count: sql<number>`count(*)` })
        .from(members)
        .leftJoin(chapters, sql`members.chapter_id = chapters.id`)
        .groupBy(chapters.region)
        .orderBy(sql`count(*) DESC`)
        .limit(1),
    ])
    
    return {
      success: true,
      data: {
        totalMembers: Number(totalMembers[0]?.count || 0),
        activeChapters: Number(activeChapters[0]?.count || 0),
        newSignupsLast30Days: Number(newSignups[0]?.count || 0),
        mostActiveRegion: mostActiveRegion[0]?.region || 'N/A',
      },
    }
  },

  async getDemographics(): Promise<ApiResponse<any>> {
    const result = await db.select({
      ageRange: sql<string>`CASE 
        WHEN EXTRACT(YEAR FROM AGE(join_date)) < 25 THEN '18-24'
        WHEN EXTRACT(YEAR FROM AGE(join_date)) < 35 THEN '25-34'
        WHEN EXTRACT(YEAR FROM AGE(join_date)) < 45 THEN '35-44'
        ELSE '45+'
      END as age_range`,
      count: sql<number>`count(*)`,
    })
      .from(members)
      .groupBy(sql`1`)
    
    return { success: true, data: result }
  },

  async getChapterStats(): Promise<ApiResponse<any>> {
    const result = await db.select({
      chapter: chapters.name,
      region: chapters.region,
      studentCount: sql<number>`count(CASE WHEN members.member_type = 'Student' THEN 1 END)`,
      professionalCount: sql<number>`count(CASE WHEN members.member_type = 'Professional' THEN 1 END)`,
      organizationCount: sql<number>`count(CASE WHEN members.member_type = 'Organization' THEN 1 END)`,
    })
      .from(chapters)
      .leftJoin(members, sql`chapters.id = members.chapter_id`)
      .groupBy(chapters.id, chapters.name, chapters.region)
      .orderBy(sql`count(members.id) DESC`)
      .limit(5)
    
    return { success: true, data: result }
  },
}
