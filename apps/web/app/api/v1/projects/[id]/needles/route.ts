import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/projects/:id/needles — list project needles
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const needles = await prisma.project_needles.findMany({
    where: { project_id: id },
    include: { needle: true },
  })

  return NextResponse.json({ success: true, data: needles })
})

// POST /api/v1/projects/:id/needles — add needle to project
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const { needle_id, type, size_mm, size_label, length_cm, material, brand, notes } = body

  // If linking to an existing needle from user's collection
  if (needle_id) {
    const needle = await prisma.user_needles.findFirst({
      where: { id: needle_id, user_id: user.id },
    })
    if (!needle) return NextResponse.json({ error: 'Needle not found' }, { status: 404 })

    const created = await prisma.project_needles.create({
      data: {
        project_id: id,
        needle_id: needle.id,
        type: needle.type,
        size_mm: needle.size_mm,
        size_label: needle.size_label,
        length_cm: needle.length_cm,
        material: needle.material,
        brand: needle.brand,
      },
      include: { needle: true },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  }

  // Manual entry — type and size_mm required
  if (!type || size_mm === undefined) {
    return NextResponse.json({ error: 'type and size_mm are required' }, { status: 400 })
  }

  const created = await prisma.project_needles.create({
    data: {
      project_id: id,
      type,
      size_mm,
      size_label: size_label ?? null,
      length_cm: length_cm ?? null,
      material: material ?? null,
      brand: brand ?? null,
      notes: notes ?? null,
    },
    include: { needle: true },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
