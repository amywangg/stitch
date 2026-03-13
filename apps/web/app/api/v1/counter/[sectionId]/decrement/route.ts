import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: { sectionId: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const section = await prisma.project_sections.findFirst({
    where: { id: params.sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const previous = section.current_row
  const newRow = Math.max(0, previous - 1)

  await prisma.$transaction([
    prisma.project_sections.update({
      where: { id: params.sectionId },
      data: { current_row: newRow },
    }),
    prisma.row_counter_history.create({
      data: { section_id: params.sectionId, action: 'decrement', value: newRow, previous },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: { sectionId: params.sectionId, currentRow: newRow, previousRow: previous },
  })
}
