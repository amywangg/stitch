import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/tutorials — list tutorials (no auth required)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const craftType = searchParams.get('craft_type')
  const difficulty = searchParams.get('difficulty')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))

  const where: Record<string, unknown> = { is_published: true }

  if (category) where.category = category
  if (craftType && craftType !== 'all') {
    where.craft_type = { in: [craftType, 'both'] }
  }
  if (difficulty) where.difficulty = difficulty

  const [items, total] = await Promise.all([
    prisma.tutorials.findMany({
      where,
      include: {
        _count: { select: { steps: true } },
      },
      orderBy: [{ sort_order: 'asc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tutorials.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    },
  })
}
