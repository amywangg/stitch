import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient, pushToRavelry } from '@/lib/ravelry-push'
import { emitActivity } from '@/lib/activity'
import { resolveStep, getStepPosition, shouldAutoAdvance, getSectionProgress } from '@/lib/instruction-resolver'

type Params = { params: Promise<{ sectionId: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
    include: { project: true },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  if (section.completed) {
    return NextResponse.json({ error: 'Section is already completed' }, { status: 422 })
  }

  const previous = section.current_row
  const newTap = previous + 1

  // Check if we should auto-advance to the next step
  let newStep = section.current_step
  let newTapInStep = newTap
  let autoAdvanced = false
  let sectionCompleted = false

  if (section.pattern_section_id) {
    const patternSteps = await prisma.pattern_rows.findMany({
      where: { section_id: section.pattern_section_id },
      orderBy: { row_number: 'asc' },
    })

    if (patternSteps.length > 0) {
      const currentStepData = resolveStep(patternSteps, section.current_step)
      if (currentStepData && shouldAutoAdvance(currentStepData, newTap)) {
        const nextStepData = resolveStep(patternSteps, section.current_step + 1)
        if (nextStepData) {
          // Move to next step, reset tap counter
          newStep = section.current_step + 1
          newTapInStep = 0
          autoAdvanced = true
        } else {
          // No next step — last step finished, section is complete
          sectionCompleted = true
        }
      }
    }
  }

  // Also complete section when target_rows reached (basic counter without pattern steps)
  if (!sectionCompleted && section.target_rows && newTap >= section.target_rows) {
    sectionCompleted = true
  }

  await prisma.$transaction([
    prisma.project_sections.update({
      where: { id: sectionId },
      data: {
        current_row: autoAdvanced ? newTapInStep : newTap,
        current_step: newStep,
        completed: sectionCompleted || undefined,
      },
    }),
    prisma.row_counter_history.create({
      data: { section_id: sectionId, action: 'increment', value: newTap, previous },
    }),
  ])

  // Row milestone events (based on total taps across all steps, not just current)
  const milestones = [50, 100, 250, 500, 1000, 2000, 5000]
  if (milestones.includes(newTap)) {
    emitActivity({
      userId: user.id,
      type: 'row_milestone',
      projectId: section.project_id,
      metadata: { milestone: newTap, currentRow: newTap, projectTitle: section.project.title },
    })
  }

  // Auto-finish: only when ALL sections in the project are completed
  if (sectionCompleted || (section.target_rows && newTap >= section.target_rows)) {
    // Check if every other section is also completed
    const allSections = await prisma.project_sections.findMany({
      where: { project_id: section.project_id },
      select: { id: true, completed: true, current_row: true, target_rows: true },
    })

    const allDone = allSections.every((s) => {
      if (s.id === sectionId) return true // this section just finished
      if (s.completed) return true
      if (s.target_rows && s.current_row >= s.target_rows) return true
      return false
    })

    if (allDone) {
      const today = new Date()
      await prisma.projects.update({
        where: { id: section.project_id },
        data: { status: 'completed', finished_at: today },
      })

      emitActivity({ userId: user.id, type: 'project_completed', projectId: section.project_id })

      if (section.project.ravelry_permalink) {
        const push = await getRavelryPushClient(user.id)
        if (push) {
          pushToRavelry(() =>
            push.client.updateProject(section.project.ravelry_permalink!, {
              status_name: 'Finished',
              completed: today.toISOString().slice(0, 10),
            }),
          )
        }
      }
    }
  }

  // Resolve instruction for response
  let instruction = null
  if (section.pattern_section_id) {
    const patternSteps = await prisma.pattern_rows.findMany({
      where: { section_id: section.pattern_section_id },
      orderBy: { row_number: 'asc' },
    })
    if (patternSteps.length > 0) {
      const effectiveTap = autoAdvanced ? 0 : newTap
      const resolved = resolveStep(patternSteps, newStep)
      const progress = getSectionProgress(patternSteps, newStep, effectiveTap)

      // Check for override
      const override = await prisma.step_overrides.findUnique({
        where: { project_section_id_step_number: { project_section_id: sectionId, step_number: newStep } },
      })

      instruction = resolved ? {
        step_number: resolved.step_number,
        instruction: override?.custom_instruction ?? resolved.instruction,
        stitch_count: resolved.stitch_count,
        row_type: resolved.row_type,
        is_repeat: resolved.is_repeat,
        is_open_ended: resolved.is_open_ended ?? false,
        position: resolved ? getStepPosition(resolved, effectiveTap) : null,
        progress,
        auto_advanced: autoAdvanced,
        section_completed: sectionCompleted,
      } : null
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      sectionId,
      currentRow: autoAdvanced ? newTapInStep : newTap,
      currentStep: newStep,
      previousRow: previous,
      instruction,
    },
  })
}
