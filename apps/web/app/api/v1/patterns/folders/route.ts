import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

// Rename Prisma's _count to count for cleaner client decoding
function transformFolder(folder: Record<string, unknown>): Record<string, unknown> {
  const { _count, children, ...rest } = folder
  return {
    ...rest,
    count: _count,
    ...(Array.isArray(children) ? { children: children.map(transformFolder) } : {}),
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await getDbUser(clerkId)

    const folders = await prisma.pattern_folders.findMany({
      where: { user_id: user.id },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { patterns: { where: { deleted_at: null } } } },
      },
    })

    return NextResponse.json({ success: true, data: folders.map(transformFolder) })
  } catch (err) {
    console.error('[GET /patterns/folders]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const body = await req.json()
  const { name, parent_id, color } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
  }

  // Verify parent exists and belongs to user
  if (parent_id) {
    const parent = await prisma.pattern_folders.findFirst({
      where: { id: parent_id, user_id: user.id },
    })
    if (!parent) {
      return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
    }
  }

  // Check for duplicate name in same parent
  const existing = await prisma.pattern_folders.findFirst({
    where: { user_id: user.id, parent_id: parent_id ?? null, name: name.trim() },
  })
  if (existing) {
    return NextResponse.json({ error: 'A folder with this name already exists here' }, { status: 409 })
  }

  const folder = await prisma.pattern_folders.create({
    data: {
      user_id: user.id,
      parent_id: parent_id ?? null,
      name: name.trim(),
      color: color ?? null,
    },
    include: {
      _count: { select: { patterns: { where: { deleted_at: null } } } },
    },
  })

  return NextResponse.json({ success: true, data: transformFolder(folder as unknown as Record<string, unknown>) }, { status: 201 })
}
