import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

/**
 * GET /api/v1/ravelry/patterns/saved
 * List user's saved Ravelry pattern snapshots.
 *
 * Query params: weight, craft, page, page_size
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') ?? '20')))

  const where: Record<string, unknown> = { user_id: user.id }
  if (searchParams.get('weight')) where.weight = searchParams.get('weight')
  if (searchParams.get('craft')) where.craft = searchParams.get('craft')

  const [items, total] = await Promise.all([
    prisma.saved_patterns.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.saved_patterns.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, hasMore: page * pageSize < total },
  })
}
