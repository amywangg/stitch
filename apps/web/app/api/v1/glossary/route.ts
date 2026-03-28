import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// GET /api/v1/glossary — list/search glossary terms (no auth required)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const craftType = searchParams.get('craft_type')
  const search = searchParams.get('search')?.trim()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('page_size') ?? '50', 10)))

  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category
  }

  if (craftType && craftType !== 'all') {
    where.craft_type = { in: [craftType, 'both'] }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { abbreviation: { contains: search, mode: 'insensitive' } },
      { synonyms: { some: { synonym: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.glossary_terms.findMany({
      where,
      include: { synonyms: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.glossary_terms.count({ where }),
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
