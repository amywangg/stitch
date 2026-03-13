import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ sectionId: string }> }

/**
 * POST /api/v1/counter/[sectionId]/notes
 * Add a note, modification, or measurement to a specific step.
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

  const body = await req.json()
  const content = body.content as string | undefined
  const noteType = (body.note_type as string) ?? 'note'
  const stepNumber = (body.step_number as number) ?? section.current_step
  const measurementValue = body.measurement_value as number | undefined
  const measurementTarget = body.measurement_target as number | undefined

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  if (!['note', 'modification', 'measurement'].includes(noteType)) {
    return NextResponse.json({ error: 'note_type must be "note", "modification", or "measurement"' }, { status: 400 })
  }

  if (noteType === 'measurement' && measurementValue == null) {
    return NextResponse.json({ error: 'measurement_value is required for measurement notes' }, { status: 400 })
  }

  const note = await prisma.step_notes.create({
    data: {
      project_section_id: sectionId,
      step_number: stepNumber,
      content,
      note_type: noteType,
      measurement_value: measurementValue ?? null,
      measurement_target: measurementTarget ?? null,
      row_at: section.current_row,
    },
  })

  return NextResponse.json({ success: true, data: note })
}

/**
 * GET /api/v1/counter/[sectionId]/notes?step=4
 * List notes for a section, optionally filtered by step.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const stepParam = req.nextUrl.searchParams.get('step')
  const where: Record<string, unknown> = { project_section_id: sectionId }
  if (stepParam) where.step_number = parseInt(stepParam, 10)

  const notes = await prisma.step_notes.findMany({
    where,
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({ success: true, data: notes })
}
