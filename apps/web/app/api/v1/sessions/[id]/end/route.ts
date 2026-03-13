import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { emitActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/sessions/[id]/end
 * End a crafting session. Calculates total and active duration.
 * Snapshots ending progress for the session summary.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const session = await prisma.crafting_sessions.findFirst({
    where: { id, user_id: user.id },
    include: { pauses: true },
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  if (session.ended_at) {
    return NextResponse.json({ error: 'Session already ended' }, { status: 400 })
  }

  if (!session.started_at) {
    return NextResponse.json({ error: 'Session has no start time' }, { status: 422 })
  }

  const now = new Date()
  const totalMs = now.getTime() - session.started_at.getTime()
  const totalMinutes = Math.max(1, Math.round(totalMs / 60000))

  // Calculate active time (subtract pause durations)
  let pausedMs = 0
  for (const pause of session.pauses) {
    const resumedAt = pause.resumed_at ?? now // if still paused, count up to now
    pausedMs += resumedAt.getTime() - pause.paused_at.getTime()
  }
  const activeMinutes = Math.max(1, Math.round((totalMs - pausedMs) / 60000))

  // Snapshot ending progress
  let sectionEnd: string | null = null
  let stepEnd: number | null = null
  let rowsEnd: number | null = null

  if (session.project_id) {
    const currentSection = await prisma.project_sections.findFirst({
      where: { project_id: session.project_id, completed: false },
      orderBy: { sort_order: 'asc' },
    })
    if (currentSection) {
      sectionEnd = currentSection.name
      stepEnd = currentSection.current_step
      rowsEnd = currentSection.current_row
    }
  }

  // Close any open pauses
  await prisma.session_pauses.updateMany({
    where: { session_id: id, resumed_at: null },
    data: { resumed_at: now },
  })

  const updated = await prisma.crafting_sessions.update({
    where: { id },
    data: {
      ended_at: now,
      duration_minutes: totalMinutes,
      active_minutes: activeMinutes,
      section_end: sectionEnd,
      step_end: stepEnd,
      rows_end: rowsEnd,
    },
    include: {
      photos: { orderBy: { created_at: 'asc' } },
      project: { select: { id: true, title: true, slug: true } },
    },
  })

  // Build a summary for the activity event
  const rowsWorked = (rowsEnd ?? 0) - (session.rows_start ?? 0)

  emitActivity({
    userId: user.id,
    type: 'session_logged',
    projectId: session.project_id ?? undefined,
    metadata: {
      duration_minutes: activeMinutes,
      total_minutes: totalMinutes,
      rows_worked: rowsWorked > 0 ? rowsWorked : 0,
      section_start: session.section_start ?? '',
      section_end: sectionEnd ?? '',
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      session: updated,
      summary: {
        total_minutes: totalMinutes,
        active_minutes: activeMinutes,
        rows_worked: rowsWorked > 0 ? rowsWorked : 0,
        section_start: session.section_start,
        section_end: sectionEnd,
        step_start: session.step_start,
        step_end: stepEnd,
      },
    },
  })
}
