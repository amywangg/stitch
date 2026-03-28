import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// PATCH /api/v1/projects/:id/yarns/:yarnId — update a project yarn
export const PATCH = withAuth(async (req, user, params) => {
  const { id, yarnId } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const existing = await prisma.project_yarns.findFirst({
    where: { id: yarnId, project_id: id },
  })
  if (!existing) return NextResponse.json({ error: 'Yarn not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['colorway', 'skeins_used', 'name_override'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.project_yarns.update({
    where: { id: yarnId },
    data: updates,
    include: { yarn: { include: { company: true } }, stash_item: true },
  })

  return NextResponse.json({ success: true, data: updated })
})

// DELETE /api/v1/projects/:id/yarns/:yarnId — remove a project yarn
export const DELETE = withAuth(async (_req, user, params) => {
  const { id, yarnId } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const existing = await prisma.project_yarns.findFirst({
    where: { id: yarnId, project_id: id },
  })
  if (!existing) return NextResponse.json({ error: 'Yarn not found' }, { status: 404 })

  await prisma.project_yarns.delete({ where: { id: yarnId } })

  return NextResponse.json({ success: true, data: {} })
})
