import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/tool-catalog/sets/[id] — get set detail with all items
export const GET = withAuth(async (_req, _user, params) => {
  const id = params!.id

  const set = await prisma.tool_sets.findUnique({
    where: { id },
    include: {
      brand: true,
      items: { orderBy: { sort_order: 'asc' } },
    },
  })

  if (!set) return NextResponse.json({ error: 'Set not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: set })
})
