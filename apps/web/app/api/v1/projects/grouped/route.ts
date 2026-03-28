import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (_req, user) => {
  const projectInclude = {
    sections: { orderBy: { sort_order: 'asc' as const } },
    photos: { orderBy: { sort_order: 'asc' as const }, take: 1 },
    pattern: { select: { id: true, title: true, cover_image_url: true, designer_name: true, craft_type: true, ai_parsed: true } },
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
      include: {
        pattern: {
          include: {
            photos: { orderBy: { sort_order: 'asc' } },
            pdf_uploads: { orderBy: { created_at: 'desc' }, take: 1 },
          },
        },
        pdf_upload: true,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: { inProgress, completed, queue },
  })
})
