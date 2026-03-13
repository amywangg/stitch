import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ sectionId: string }> }

/**
 * POST /api/v1/counter/[sectionId]/advance-step
 * Manually advance to the next step. Used for open-ended steps (work_to_measurement)
 * where the knitter decides when they're done rather than auto-advancing.
 *
 * Also supports going back: { "direction": "back" }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  if (!section.pattern_section_id) {
    return NextResponse.json({ error: 'Section not linked to a pattern' }, { status: 422 })
  }

  const body = await req.json().catch(() => ({}))
  const direction = (body.direction as string) ?? 'forward'

  const totalSteps = await prisma.pattern_rows.count({
    where: { section_id: section.pattern_section_id },
  })

  let newStep: number
  let completed = false

  if (direction === 'back') {
    newStep = Math.max(1, section.current_step - 1)
  } else {
    newStep = section.current_step + 1
    if (newStep > totalSteps) {
      completed = true
      newStep = totalSteps // stay on last step, mark section complete
    }
  }

  await prisma.project_sections.update({
    where: { id: sectionId },
    data: {
      current_step: newStep,
      current_row: 0, // reset tap count for new step
      completed,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      sectionId,
      current_step: newStep,
      total_steps: totalSteps,
      section_completed: completed,
    },
  })
}
