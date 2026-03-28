import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/tool-catalog — list brands with set counts
export const GET = withAuth(async (req, _user) => {
  const search = req.nextUrl.searchParams.get('search')?.trim()
  const setType = req.nextUrl.searchParams.get('set_type')

  // Build where clause: filter brands that have sets of the given type
  const where: Record<string, unknown> = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }
  if (setType) where.tool_sets = { some: { set_type: setType } }

  const brands = await prisma.tool_brands.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          tool_sets: setType ? { where: { set_type: setType } } : true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, data: { items: brands } })
})
