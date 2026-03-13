import { prisma } from '@/lib/prisma'
import { Prisma } from '@stitch/db'

type ActivityType =
  | 'project_started'
  | 'project_completed'
  | 'project_frogged'
  | 'pattern_saved'
  | 'pattern_queued'
  | 'review_posted'
  | 'stash_added'
  | 'row_milestone'
  | 'session_logged'

export async function emitActivity(params: {
  userId: string
  type: ActivityType
  projectId?: string
  patternId?: string
  metadata?: Record<string, string | number | boolean>
}): Promise<void> {
  try {
    // For row_milestone, deduplicate within 24h for same project+milestone
    if (params.type === 'row_milestone' && params.projectId && params.metadata?.milestone) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const existing = await prisma.activity_events.findFirst({
        where: {
          user_id: params.userId,
          type: 'row_milestone',
          project_id: params.projectId,
          created_at: { gte: twentyFourHoursAgo },
          metadata: { path: ['milestone'], equals: params.metadata.milestone },
        },
      })
      if (existing) return
    }

    await prisma.activity_events.create({
      data: {
        user_id: params.userId,
        type: params.type,
        project_id: params.projectId ?? null,
        pattern_id: params.patternId ?? null,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    })
  } catch {
    // Fire-and-forget — never break the calling route
  }
}
