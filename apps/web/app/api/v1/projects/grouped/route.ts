import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const projectInclude = {
    sections: { orderBy: { sort_order: 'asc' as const } },
    photos: { orderBy: { sort_order: 'asc' as const }, take: 1 },
    pdf_upload: true,
    tags: { include: { tag: true } },
  }

  const [inProgress, completed, queue] = await Promise.all([
    prisma.projects.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        status: { in: ['active', 'hibernating'] },
      },
      orderBy: { updated_at: 'desc' },
      include: projectInclude,
    }),
    prisma.projects.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        status: { in: ['completed', 'frogged'] },
      },
      orderBy: { finished_at: 'desc' },
      include: projectInclude,
    }),
    prisma.pattern_queue.findMany({
      where: { user_id: user.id },
      orderBy: { sort_order: 'asc' },
      include: { pattern: true, pdf_upload: true },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: { inProgress, completed, queue },
  })
}
