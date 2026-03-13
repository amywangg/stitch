import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.user_supplies.findFirst({
    where: { id, user_id: user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowedFields = ['name', 'category', 'brand', 'quantity', 'notes', 'photo_url'] as const
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  const item = await prisma.user_supplies.update({
    where: { id },
    data: updates,
  })

  return NextResponse.json({ success: true, data: item })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { id } = await params

  const existing = await prisma.user_supplies.findFirst({
    where: { id, user_id: user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.user_supplies.delete({ where: { id } })

  return NextResponse.json({ success: true, data: { id } })
}
