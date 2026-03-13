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

  // Fetch tool set details for needles that came from catalog sets
  const setIds = [...new Set(items.map(i => i.tool_set_id).filter(Boolean))] as string[]
  let setLookup: Record<string, { name: string; set_type: string; brand_name: string; image_url: string | null }> = {}

  if (setIds.length > 0) {
    const sets = await prisma.tool_sets.findMany({
      where: { id: { in: setIds } },
      include: { brand: { select: { name: true } } },
    })
    for (const s of sets) {
      setLookup[s.id] = {
        name: s.name,
        set_type: s.set_type,
        brand_name: s.brand.name,
        image_url: s.image_url,
      }
    }
  }

  // Enrich items with set info
  const enriched = items.map(item => {
    const set = item.tool_set_id ? setLookup[item.tool_set_id] : null
    return {
      ...item,
      tool_set_name: set?.name ?? null,
      tool_set_type: set?.set_type ?? null,
      tool_set_brand_name: set?.brand_name ?? null,
      tool_set_image_url: set?.image_url ?? null,
    }
  })

  return NextResponse.json({ success: true, data: { items: enriched } })
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
