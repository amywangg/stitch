import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/tool-catalog — list brands with set counts
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim()

  const brands = await prisma.tool_brands.findMany({
    where: search
      ? { name: { contains: search, mode: 'insensitive' } }
      : undefined,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { tool_sets: true } },
    },
  })

  return NextResponse.json({ success: true, data: { items: brands } })
}
