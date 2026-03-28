import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// DELETE /api/v1/projects/:id/needles/:needleId — remove a project needle
export const DELETE = withAuth(async (_req, user, params) => {
  const { id, needleId } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const existing = await prisma.project_needles.findFirst({
    where: { id: needleId, project_id: id },
  })
  if (!existing) return NextResponse.json({ error: 'Needle not found' }, { status: 404 })

  await prisma.project_needles.delete({ where: { id: needleId } })

  return NextResponse.json({ success: true, data: {} })
})
