import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// Rename Prisma's _count to count for cleaner client decoding
function transformFolder(folder: Record<string, unknown>): Record<string, unknown> {
  const { _count, children, ...rest } = folder
  return {
    ...rest,
    count: _count,
    ...(Array.isArray(children) ? { children: children.map(transformFolder) } : {}),
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const folder = await prisma.pattern_folders.findFirst({
    where: { id, user_id: user.id },
    include: {
      children: {
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { patterns: { where: { deleted_at: null } } } } },
      },
      patterns: {
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
      },
      _count: { select: { patterns: { where: { deleted_at: null } } } },
    },
  })

  if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: transformFolder(folder as unknown as Record<string, unknown>) })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const folder = await prisma.pattern_folders.findFirst({
    where: { id, user_id: user.id },
  })
  if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if ('name' in body && body.name?.trim()) updates.name = body.name.trim()
  if ('color' in body) updates.color = body.color ?? null
  if ('sort_order' in body) updates.sort_order = body.sort_order
  if ('parent_id' in body) {
    if (body.parent_id === id) {
      return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 })
    }
    updates.parent_id = body.parent_id ?? null
  }

  const updated = await prisma.pattern_folders.update({
    where: { id },
    data: updates,
    include: { _count: { select: { patterns: { where: { deleted_at: null } } } } },
  })

  return NextResponse.json({ success: true, data: transformFolder(updated as unknown as Record<string, unknown>) })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const folder = await prisma.pattern_folders.findFirst({
    where: { id, user_id: user.id },
  })
  if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

  // Move patterns out of folder (unfile them) before deleting
  await prisma.patterns.updateMany({
    where: { folder_id: id },
    data: { folder_id: null },
  })

  // Move subfolders to parent (or root)
  await prisma.pattern_folders.updateMany({
    where: { parent_id: id },
    data: { parent_id: folder.parent_id },
  })

  await prisma.pattern_folders.delete({ where: { id } })

  return NextResponse.json({ success: true, message: 'Folder deleted' })
}
