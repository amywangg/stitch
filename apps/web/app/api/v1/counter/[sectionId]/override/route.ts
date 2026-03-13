import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ sectionId: string }> }

/**
 * PUT /api/v1/counter/[sectionId]/override
 * Create or update a custom instruction override for a step.
 * The original pattern instruction is preserved — override takes display priority.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const body = await req.json()
  const stepNumber = body.step_number as number | undefined
  const customInstruction = body.custom_instruction as string | undefined

  if (!stepNumber || !customInstruction) {
    return NextResponse.json({ error: 'step_number and custom_instruction are required' }, { status: 400 })
  }

  const override = await prisma.step_overrides.upsert({
    where: {
      project_section_id_step_number: {
        project_section_id: sectionId,
        step_number: stepNumber,
      },
    },
    create: {
      project_section_id: sectionId,
      step_number: stepNumber,
      custom_instruction: customInstruction,
    },
    update: {
      custom_instruction: customInstruction,
    },
  })

  return NextResponse.json({ success: true, data: override })
}

/**
 * DELETE /api/v1/counter/[sectionId]/override
 * Remove a custom instruction override, reverting to the original pattern.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const stepNumber = parseInt(req.nextUrl.searchParams.get('step_number') ?? '0', 10)
  if (!stepNumber) {
    return NextResponse.json({ error: 'step_number query param is required' }, { status: 400 })
  }

  await prisma.step_overrides.deleteMany({
    where: { project_section_id: sectionId, step_number: stepNumber },
  })

  return NextResponse.json({ success: true })
}
