import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const sections = await prisma.project_sections.findMany({
    where: { project_id: id },
    orderBy: { sort_order: 'asc' },
  })

  return NextResponse.json({ success: true, data: sections })
})

export const POST = withAuth(async (req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Section name is required' }, { status: 400 })
  }

  const maxOrder = await prisma.project_sections.aggregate({
    where: { project_id: id },
    _max: { sort_order: true },
  })

  const section = await prisma.project_sections.create({
    data: {
      project_id: id,
      name: body.name.trim(),
      description: body.description ?? null,
      target_rows: body.target_rows ?? null,
      sort_order: (maxOrder._max.sort_order ?? -1) + 1,
    },
  })

  return NextResponse.json({ success: true, data: section }, { status: 201 })
})
