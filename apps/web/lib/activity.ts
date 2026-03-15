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

/** All activity types and their default sharing state (all on) */
export const ACTIVITY_TYPES: { key: ActivityType; label: string }[] = [
  { key: 'project_started', label: 'Started a project' },
  { key: 'project_completed', label: 'Finished a project' },
  { key: 'project_frogged', label: 'Frogged a project' },
  { key: 'stash_added', label: 'Added to stash' },
  { key: 'row_milestone', label: 'Row milestones' },
  { key: 'pattern_queued', label: 'Queued a pattern' },
  { key: 'pattern_saved', label: 'Saved a pattern' },
  { key: 'review_posted', label: 'Posted a review' },
  { key: 'session_logged', label: 'Logged a session' },
]

/** Check if a user has sharing enabled for a given activity type.
 *  null activity_sharing = all types enabled (default). */
function isSharingEnabled(
  activitySharing: Record<string, boolean> | null | undefined,
  type: ActivityType
): boolean {
  if (!activitySharing) return true // null = all on
  return activitySharing[type] !== false // missing key = on, explicit false = off
}

export async function emitActivity(params: {
  userId: string
  type: ActivityType
  projectId?: string
  patternId?: string
  metadata?: Record<string, string | number | boolean>
  createdAt?: Date
}): Promise<void> {
  try {
    // Check user's sharing preferences
    const user = await prisma.users.findUnique({
      where: { id: params.userId },
      select: { activity_sharing: true },
    })
    if (!isSharingEnabled(user?.activity_sharing as Record<string, boolean> | null, params.type)) {
      return // user opted out of sharing this type
    }

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
        ...(params.createdAt ? { created_at: params.createdAt } : {}),
      },
    })
  } catch {
    // Fire-and-forget — never break the calling route
  }
}
