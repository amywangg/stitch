import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/tool-catalog/sets?brand_id=X&type=Y — list sets, optionally filtered
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brand_id')
  const setType = req.nextUrl.searchParams.get('type')
  const search = req.nextUrl.searchParams.get('search')?.trim()
  const includeItems = req.nextUrl.searchParams.get('include_items') === 'true'

  const sets = await prisma.tool_sets.findMany({
    where: {
      ...(brandId ? { brand_id: brandId } : {}),
      ...(setType ? { set_type: setType } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { name: 'asc' },
    include: {
      brand: true,
      ...(includeItems ? { items: { orderBy: { sort_order: 'asc' } } } : {}),
      _count: { select: { items: true } },
    },
  })

  return NextResponse.json({ success: true, data: { items: sets } })
}
