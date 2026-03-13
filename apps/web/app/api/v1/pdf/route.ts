import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

/**
 * GET /api/v1/pdf
 * Paginated list of user's uploaded PDFs.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') ?? '20', 10)))
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.pdf_uploads.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.pdf_uploads.count({ where: { user_id: user.id } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      hasMore: skip + items.length < total,
    },
  })
}
