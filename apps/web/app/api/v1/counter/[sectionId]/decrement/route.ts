import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { resolveStep, getStepPosition, getSectionProgress } from '@/lib/instruction-resolver'

type Params = { params: Promise<{ sectionId: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const previous = section.current_row
  let newTap = Math.max(0, previous - 1)
  let newStep = section.current_step

  // If we're at tap 0 and decrement, go back to previous step
  if (previous === 0 && section.current_step > 1 && section.pattern_section_id) {
    const prevStepData = await prisma.pattern_rows.findFirst({
      where: { section_id: section.pattern_section_id, row_number: section.current_step - 1 },
    })
    if (prevStepData) {
      newStep = section.current_step - 1
      // Set tap to the last tap of the previous step
      newTap = prevStepData.rows_in_step ?? 0
    }
  }

  await prisma.$transaction([
    prisma.project_sections.update({
      where: { id: sectionId },
      data: {
        current_row: newTap,
        current_step: newStep,
        completed: false, // un-complete if going backwards
      },
    }),
    prisma.row_counter_history.create({
      data: { section_id: sectionId, action: 'decrement', value: newTap, previous },
    }),
  ])

  // Resolve instruction for response
  let instruction = null
  if (section.pattern_section_id) {
    const patternSteps = await prisma.pattern_rows.findMany({
      where: { section_id: section.pattern_section_id },
      orderBy: { row_number: 'asc' },
    })
    if (patternSteps.length > 0) {
      const resolved = resolveStep(patternSteps, newStep)
      const progress = getSectionProgress(patternSteps, newStep, newTap)

      const override = await prisma.step_overrides.findUnique({
        where: { project_section_id_step_number: { project_section_id: sectionId, step_number: newStep } },
      })

      instruction = resolved ? {
        step_number: resolved.step_number,
        instruction: override?.custom_instruction ?? resolved.instruction,
        stitch_count: resolved.stitch_count,
        row_type: resolved.row_type,
        is_repeat: resolved.is_repeat,
        position: getStepPosition(resolved, newTap),
        progress,
      } : null
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      sectionId,
      currentRow: newTap,
      currentStep: newStep,
      previousRow: previous,
      instruction,
    },
  })
}
