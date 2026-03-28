import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
async function getSectionForUser(sectionId: string, userId: string) {
  return prisma.project_sections.findFirst({
    where: {
      id: sectionId,
      project: { user_id: userId, deleted_at: null },
    },
  })
}

export const GET = withAuth(async (_req, user, params) => {
  const sectionId = params!.sectionId

  const section = await getSectionForUser(sectionId, user.id)
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: { sectionId: section.id, currentRow: section.current_row, targetRows: section.target_rows },
  })
})
