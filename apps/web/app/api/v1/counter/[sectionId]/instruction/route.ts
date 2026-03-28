import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { resolveStep, getStepPosition, getSectionProgress } from '@/lib/instruction-resolver'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/counter/[sectionId]/instruction?step=4&tap=8
 * Returns the current instruction step, position within it, and progress.
 * Defaults to the section's current_step and current_row (tap count).
 * Also includes any step overrides and notes for context.
 */
export const GET = withAuth(async (req, user, params) => {
  const sectionId = params!.sectionId

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  if (!section.pattern_section_id) {
    return NextResponse.json(
      { error: 'This section is not linked to a pattern. No instructions available.' },
      { status: 422 }
    )
  }

  const patternSteps = await prisma.pattern_rows.findMany({
    where: { section_id: section.pattern_section_id },
    orderBy: { row_number: 'asc' },
  })

  if (patternSteps.length === 0) {
    return NextResponse.json(
      { error: 'No instructions found for this section.' },
      { status: 422 }
    )
  }

  const stepParam = req.nextUrl.searchParams.get('step')
  const tapParam = req.nextUrl.searchParams.get('tap')
  // Clamp to valid range — completed sections may have current_step past the last step
  const maxStep = patternSteps.length
  const rawStep = stepParam ? parseInt(stepParam, 10) : section.current_step
  const targetStep = Math.min(Math.max(rawStep, 1), maxStep)
  const tapInStep = tapParam ? parseInt(tapParam, 10) : section.current_row

  if (isNaN(targetStep) || targetStep < 1) {
    return NextResponse.json({ error: 'Invalid step number' }, { status: 400 })
  }

  const resolved = resolveStep(patternSteps, targetStep)
  if (!resolved) {
    return NextResponse.json({ error: `Step ${targetStep} not found` }, { status: 404 })
  }

  const position = getStepPosition(resolved, tapInStep)
  const progress = getSectionProgress(patternSteps, targetStep, tapInStep)

  // Check for user overrides on this step
  const override = await prisma.step_overrides.findUnique({
    where: { project_section_id_step_number: { project_section_id: sectionId, step_number: targetStep } },
  })

  // Fetch notes for this step
  const notes = await prisma.step_notes.findMany({
    where: { project_section_id: sectionId, step_number: targetStep },
    orderBy: { created_at: 'asc' },
  })

  // Get prev/next step info
  const prevStep = targetStep > 1 ? resolveStep(patternSteps, targetStep - 1) : null
  const nextStep = resolveStep(patternSteps, targetStep + 1)

  // Get section name
  const patternSection = await prisma.pattern_sections.findUnique({
    where: { id: section.pattern_section_id },
    select: { name: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      section_name: patternSection?.name ?? section.name,
      section_completed: section.completed,

      // Current step
      step: {
        step_number: resolved.step_number,
        instruction: override?.custom_instruction ?? resolved.instruction,
        has_override: !!override,
        original_instruction: override ? resolved.instruction : null,
        stitch_count: resolved.stitch_count,
        row_type: resolved.row_type,
        notes: resolved.notes,
        is_open_ended: resolved.is_open_ended,
        target_measurement_cm: resolved.target_measurement_cm,
        is_repeat: resolved.is_repeat,
        repeat_count: resolved.repeat_count,
        rows_per_repeat: resolved.rows_per_repeat,
      },

      // Position within step
      position,

      // Section-level progress
      progress,

      // User notes on this step
      user_notes: notes,

      // Context
      context: {
        previous: prevStep
          ? { step_number: prevStep.step_number, instruction: prevStep.instruction, row_type: prevStep.row_type }
          : null,
        next: nextStep
          ? { step_number: nextStep.step_number, instruction: nextStep.instruction, row_type: nextStep.row_type }
          : null,
      },
    },
  })
})
