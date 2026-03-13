import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const items = await prisma.user_needles.findMany({
    where: { user_id: user.id },
    orderBy: [{ type: 'asc' }, { size_mm: 'asc' }],
  })

  return NextResponse.json({ success: true, data: { items } })
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const body = await req.json()
  const { type, size_mm, size_label, length_cm, material, brand, notes, tool_set_id } = body

  if (!type || !size_mm) {
    return NextResponse.json({ error: 'type and size_mm are required' }, { status: 400 })
  }

  const item = await prisma.user_needles.create({
    data: {
      user_id: user.id,
      type,
      size_mm: parseFloat(size_mm),
      size_label: size_label ?? null,
      length_cm: length_cm ? parseInt(length_cm) : null,
      material: material ?? null,
      brand: brand ?? null,
      notes: notes ?? null,
      tool_set_id: tool_set_id ?? null,
    },
  })

  return NextResponse.json({ success: true, data: item }, { status: 201 })
}
