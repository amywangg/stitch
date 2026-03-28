import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const POST = withAuth(async (_req, user, params) => {
  const sectionId = params!.sectionId

  const section = await prisma.project_sections.findFirst({
    where: { id: sectionId, project: { user_id: user.id, deleted_at: null } },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  // Find the last history entry
  const lastEntry = await prisma.row_counter_history.findFirst({
    where: { section_id: sectionId },
    orderBy: { created_at: 'desc' },
  })

  if (!lastEntry) {
    return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 })
  }

  const restoredRow = lastEntry.previous

  await prisma.$transaction([
    prisma.project_sections.update({
      where: { id: sectionId },
      data: { current_row: restoredRow },
    }),
    prisma.row_counter_history.delete({ where: { id: lastEntry.id } }),
  ])

  return NextResponse.json({
    success: true,
    data: { sectionId, currentRow: restoredRow },
  })
})
