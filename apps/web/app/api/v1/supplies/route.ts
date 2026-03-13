import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const items = await prisma.user_supplies.findMany({
    where: { user_id: user.id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ success: true, data: { items } })
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
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
}
