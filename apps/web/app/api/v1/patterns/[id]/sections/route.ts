import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// POST — Create a new section in a pattern
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const { name, content, size_id } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Section name is required' }, { status: 400 })
  }

  // Validate size_id belongs to this pattern if provided
  if (size_id) {
    const size = await prisma.pattern_sizes.findFirst({
      where: { id: size_id, pattern_id: id },
    })
    if (!size) return NextResponse.json({ error: 'Size not found' }, { status: 404 })
  }

  // Get next sort_order
  const maxSort = await prisma.pattern_sections.aggregate({
    where: { pattern_id: id, size_id: size_id ?? null },
    _max: { sort_order: true },
  })
  const sortOrder = (maxSort._max.sort_order ?? -1) + 1

  const section = await prisma.pattern_sections.create({
    data: {
      pattern_id: id,
      name: name.trim(),
      content: content?.trim() ?? null,
      size_id: size_id ?? null,
      sort_order: sortOrder,
    },
    include: { rows: { orderBy: { row_number: 'asc' } } },
  })

  return NextResponse.json({ success: true, data: section }, { status: 201 })
})

// PUT — Reorder sections
export const PUT = withAuth(async (req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const { section_ids } = body as { section_ids: string[] }

  if (!Array.isArray(section_ids) || section_ids.length === 0) {
    return NextResponse.json({ error: 'section_ids array is required' }, { status: 400 })
  }

  // Verify all sections belong to this pattern
  const sections = await prisma.pattern_sections.findMany({
    where: { id: { in: section_ids }, pattern_id: id },
  })
  if (sections.length !== section_ids.length) {
    return NextResponse.json({ error: 'One or more sections not found' }, { status: 400 })
  }

  await prisma.$transaction(
    section_ids.map((sectionId, idx) =>
      prisma.pattern_sections.update({
        where: { id: sectionId },
        data: { sort_order: idx },
      })
    )
  )

  return NextResponse.json({ success: true, data: {} })
})
