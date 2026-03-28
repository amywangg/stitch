import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const gauge = await prisma.project_gauge.findUnique({ where: { project_id: id } })
  return NextResponse.json({ success: true, data: gauge })
})

export const PUT = withAuth(async (req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const gauge = await prisma.project_gauge.upsert({
    where: { project_id: id },
    create: { project_id: id, ...body },
    update: body,
  })

  return NextResponse.json({ success: true, data: gauge })
})
