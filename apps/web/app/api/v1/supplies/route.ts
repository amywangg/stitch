import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user) => {
  const items = await prisma.user_supplies.findMany({
    where: { user_id: user.id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ success: true, data: { items } })
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { name, category, brand, quantity, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const item = await prisma.user_supplies.create({
    data: {
      user_id: user.id,
      name: name.trim(),
      category: category ?? 'other',
      brand: brand?.trim() ?? null,
      quantity: quantity ?? 1,
      notes: notes?.trim() ?? null,
    },
  })

  return NextResponse.json({ success: true, data: item }, { status: 201 })
})
