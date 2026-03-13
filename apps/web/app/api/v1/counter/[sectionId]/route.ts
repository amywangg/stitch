import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ sectionId: string }> }

async function getSectionForUser(sectionId: string, userId: string) {
  return prisma.project_sections.findFirst({
    where: {
      id: sectionId,
      project: { user_id: userId, deleted_at: null },
    },
  })
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const section = await getSectionForUser(sectionId, user.id)
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: { sectionId: section.id, currentRow: section.current_row, targetRows: section.target_rows },
  })
}
