import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/tool-catalog — list brands with set counts
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
}
