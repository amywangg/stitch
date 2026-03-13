import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
    include: { sections: { orderBy: { sort_order: 'asc' } } },
  })

  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: pattern })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const pattern = await prisma.patterns.findFirst({ where: { id, user_id: user.id, deleted_at: null } })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['title', 'description', 'difficulty', 'garment_type', 'is_public', 'source_url', 'folder_id'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.patterns.update({ where: { id }, data: updates })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const pattern = await prisma.patterns.findFirst({ where: { id, user_id: user.id, deleted_at: null } })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  await prisma.patterns.update({ where: { id }, data: { deleted_at: new Date() } })
  return NextResponse.json({ success: true, message: 'Pattern deleted' })
}
