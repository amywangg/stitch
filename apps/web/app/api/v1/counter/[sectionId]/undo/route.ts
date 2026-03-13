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

  // Find the last history entry
  const lastEntry = await prisma.row_counter_history.findFirst({
    where: { section_id: params.sectionId },
    orderBy: { created_at: 'desc' },
  })

  if (!lastEntry) {
    return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 })
  }

  const restoredRow = lastEntry.previous

  await prisma.$transaction([
    prisma.project_sections.update({
      where: { id: params.sectionId },
      data: { current_row: restoredRow },
    }),
    prisma.row_counter_history.delete({ where: { id: lastEntry.id } }),
  ])

  return NextResponse.json({
    success: true,
    data: { sectionId: params.sectionId, currentRow: restoredRow },
  })
}
