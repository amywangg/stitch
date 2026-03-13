import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/tool-catalog/sets/[id] — get set detail with all items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const set = await prisma.tool_sets.findUnique({
    where: { id },
    include: {
      brand: true,
      items: { orderBy: { sort_order: 'asc' } },
    },
  })

  if (!set) return NextResponse.json({ error: 'Set not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: set })
}
