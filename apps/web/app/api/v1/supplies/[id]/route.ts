import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const PATCH = withAuth(async (req, user, params) => {
  const id = params!.id
  const body = await req.json()

  const existing = await findOwned(prisma.user_supplies, id, user.id, { softDelete: false })
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
})

export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id

  const existing = await findOwned(prisma.user_supplies, id, user.id, { softDelete: false })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.user_supplies.delete({ where: { id } })

  return NextResponse.json({ success: true, data: { id } })
})
