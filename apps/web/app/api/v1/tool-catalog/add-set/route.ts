import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// POST /api/v1/tool-catalog/add-set — add all items from a catalog set to user's needles
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { set_id } = body

  if (!set_id) {
    return NextResponse.json({ error: 'set_id is required' }, { status: 400 })
  }

  const set = await prisma.tool_sets.findUnique({
    where: { id: set_id },
    include: {
      brand: true,
      items: { orderBy: { sort_order: 'asc' } },
    },
  })

  if (!set) return NextResponse.json({ error: 'Set not found' }, { status: 404 })

  // Create user_needles entries for each item in the set
  const createdItems = await prisma.$transaction(
    set.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () =>
        prisma.user_needles.create({
          data: {
            user_id: user.id,
            type: item.type,
            size_mm: item.size_mm,
            size_label: item.size_label,
            length_cm: item.length_cm,
            material: item.material,
            brand: set.brand.name,
            tool_set_id: set.id,
            notes: `From ${set.brand.name} ${set.name}`,
          },
        })
      )
    )
  )

  return NextResponse.json({
    success: true,
    data: { added: createdItems.length, setName: `${set.brand.name} ${set.name}` },
  }, { status: 201 })
})
