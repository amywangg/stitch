import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

/**
 * POST /api/v1/sessions
 * Start a new crafting session. Snapshots current project progress.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const body = await req.json()
  const projectId = body.project_id as string | undefined
  const source = (body.source as string) || 'timer'
  const manualDuration = body.duration_minutes as number | undefined
  const manualDate = body.date ? new Date(body.date as string) : null
  const manualNotes = body.notes as string | undefined

  let sectionSnapshot: { name: string; step: number; row: number } | null = null

  // Validate project ownership and snapshot progress
  if (projectId) {
    const project = await prisma.projects.findFirst({
      where: { id: projectId, user_id: user.id, deleted_at: null },
      include: { sections: { where: { completed: false }, orderBy: { sort_order: 'asc' }, take: 1 } },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Snapshot the current active section
    if (project.sections[0]) {
      sectionSnapshot = {
        name: project.sections[0].name,
        step: project.sections[0].current_step,
        row: project.sections[0].current_row,
      }
    }
  }

  const now = new Date()

  // Manual sessions are created already ended with the specified duration
  if (source === 'manual' && manualDuration) {
    const sessionDate = manualDate ?? now
    const startedAt = new Date(sessionDate.getTime() - manualDuration * 60000)
    const session = await prisma.crafting_sessions.create({
      data: {
        user_id: user.id,
        project_id: projectId ?? null,
        date: sessionDate,
        started_at: startedAt,
        ended_at: sessionDate,
        duration_minutes: manualDuration,
        active_minutes: manualDuration,
        source: 'manual',
        notes: manualNotes ?? null,
        section_start: sectionSnapshot?.name ?? null,
        step_start: sectionSnapshot?.step ?? null,
        rows_start: sectionSnapshot?.row ?? null,
        rows_end: sectionSnapshot?.row ?? null,
      },
    })
    return NextResponse.json({ success: true, data: session })
  }

  // Timer-based session — starts now, ended later via /sessions/[id]/end
  const session = await prisma.crafting_sessions.create({
    data: {
      user_id: user.id,
      project_id: projectId ?? null,
      date: now,
      started_at: now,
      duration_minutes: 0,
      source: 'timer',
      section_start: sectionSnapshot?.name ?? null,
      step_start: sectionSnapshot?.step ?? null,
      rows_start: sectionSnapshot?.row ?? null,
    },
  })

  return NextResponse.json({ success: true, data: session })
}

/**
 * GET /api/v1/sessions?project_id=...&from=...&to=...
 * List crafting sessions with optional filters. Includes pauses and photos.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const projectId = req.nextUrl.searchParams.get('project_id')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('page_size') ?? '20', 10)))

  const where: Record<string, unknown> = { user_id: user.id }
  if (projectId) where.project_id = projectId
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [sessions, total] = await Promise.all([
    prisma.crafting_sessions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        photos: { orderBy: { created_at: 'asc' } },
        project: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.crafting_sessions.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items: sessions,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    },
  })
}
