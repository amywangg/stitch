import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import {
  calculateSpeed,
  estimateProjectTime,
  calculateSessionFrequency,
  estimateCalendarDays,
  type SessionData,
  type SectionInput,
} from '@/lib/time-math'
import { buildTimeEstimatePrompt, type TimeEstimateAIResponse } from '@/lib/prompts/time-estimate'

export const maxDuration = 30

// ─── Input validation ────────────────────────────────────────────────────────

const requestSchema = z.object({
  project_id: z.string().uuid(),
  // Optional: override rows_per_hour if the user knows their speed
  rows_per_hour: z.number().positive().optional(),
})

// ─── Route handler ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/time-estimate
 * Project time estimation — calculates remaining time per section,
 * estimated completion date, and contextual progress summary.
 *
 * Speed is derived from the user's crafting_sessions (row tracking + timer data).
 * Falls back to a default 15 rows/hour if no session data exists.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'time estimation')
  if (proError) return proError

  let body: z.infer<typeof requestSchema>
  try {
    const raw = await req.json()
    body = requestSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: err.errors },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // ─── 1. Fetch project + sections ──────────────────────────────────────

  const project = await prisma.projects.findFirst({
    where: { id: body.project_id, user_id: user.id, deleted_at: null },
    include: {
      pattern: { select: { title: true } },
      sections: { orderBy: { sort_order: 'asc' } },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (project.sections.length === 0) {
    return NextResponse.json(
      { error: 'Project has no sections — add sections to track progress', code: 'NO_SECTIONS' },
      { status: 422 },
    )
  }

  // ─── 2. Calculate knitting speed ──────────────────────────────────────

  let speed

  if (body.rows_per_hour) {
    // User provided their own speed
    speed = {
      rows_per_hour: body.rows_per_hour,
      confidence: 'high' as const,
      sessions_analyzed: 0,
      total_rows_tracked: 0,
      total_minutes_tracked: 0,
    }
  } else {
    // Derive from crafting sessions — look at this project first, then all user sessions
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90)

    const sessions = await prisma.crafting_sessions.findMany({
      where: {
        user_id: user.id,
        created_at: { gte: thirtyDaysAgo },
        duration_minutes: { gt: 0 },
      },
      select: {
        duration_minutes: true,
        active_minutes: true,
        rows_start: true,
        rows_end: true,
        project_id: true,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    // Prefer sessions from this specific project
    const projectSessions = sessions.filter((s) => s.project_id === project.id)
    const sessionData: SessionData[] = (projectSessions.length >= 2 ? projectSessions : sessions).map(
      (s) => ({
        duration_minutes: s.duration_minutes,
        active_minutes: s.active_minutes,
        rows_start: s.rows_start,
        rows_end: s.rows_end,
      }),
    )

    speed = calculateSpeed(sessionData)
  }

  // ─── 3. Estimate time per section ─────────────────────────────────────

  const sectionInputs: SectionInput[] = project.sections.map((s) => ({
    name: s.name,
    target_rows: s.target_rows,
    current_row: s.current_row,
    completed: s.completed,
  }))

  const estimate = estimateProjectTime(sectionInputs, speed)

  // ─── 4. Calculate session frequency + calendar estimate ───────────────

  const recentSessions = await prisma.crafting_sessions.findMany({
    where: {
      user_id: user.id,
      created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { date: true, duration_minutes: true },
    orderBy: { date: 'desc' },
  })

  const frequency = calculateSessionFrequency(
    recentSessions.map((s) => ({ date: s.date, duration_minutes: s.duration_minutes })),
  )

  const calendar = estimateCalendarDays(estimate.total_remaining_minutes, frequency)

  // ─── 5. Find current section ──────────────────────────────────────────

  const currentSection = project.sections.find((s) => !s.completed) ?? null

  // ─── 6. AI contextual summary ─────────────────────────────────────────

  const prompt = buildTimeEstimatePrompt({
    project_title: project.title,
    pattern_title: project.pattern?.title ?? null,
    craft_type: project.craft_type,
    percent_complete: estimate.percent_complete,
    current_section: currentSection?.name ?? null,
    sections: estimate.sections,
    speed: estimate.speed,
    frequency,
    total_remaining_hours: estimate.total_remaining_hours,
    estimated_days: calendar.estimated_days,
    estimated_date: calendar.estimated_date,
  })

  let aiResult: TimeEstimateAIResponse
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })
    const content = completion.choices[0].message.content ?? '{}'
    aiResult = JSON.parse(content) as TimeEstimateAIResponse
  } catch {
    aiResult = {
      summary: `About ${estimate.total_remaining_hours} hours of knitting remaining (${estimate.percent_complete}% complete).`,
      section_context: null,
      pacing_advice: `At your current pace, this should take about ${calendar.estimated_days} days.`,
      milestone_note: null,
    }
  }

  // ─── 7. Response ──────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    data: {
      progress: {
        percent_complete: estimate.percent_complete,
        total_remaining_rows: estimate.total_remaining_rows,
        total_remaining_hours: estimate.total_remaining_hours,
        current_section: currentSection?.name ?? null,
      },
      speed: estimate.speed,
      sections: estimate.sections,
      schedule: {
        sessions_per_week: frequency.sessions_per_week,
        avg_session_minutes: frequency.avg_session_minutes,
        estimated_days: calendar.estimated_days,
        estimated_completion_date: calendar.estimated_date,
      },
      summary: aiResult.summary,
      section_context: aiResult.section_context,
      pacing_advice: aiResult.pacing_advice,
      milestone_note: aiResult.milestone_note,
    },
  })
}
