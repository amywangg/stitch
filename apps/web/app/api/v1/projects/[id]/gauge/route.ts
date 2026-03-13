import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await prisma.projects.findFirst({ where: { id: params.id, user_id: user.id, deleted_at: null } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const gauge = await prisma.project_gauge.findUnique({ where: { project_id: params.id } })
  return NextResponse.json({ success: true, data: gauge })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await prisma.projects.findFirst({ where: { id: params.id, user_id: user.id, deleted_at: null } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const gauge = await prisma.project_gauge.upsert({
    where: { project_id: params.id },
    create: { project_id: params.id, ...body },
    update: body,
  })

  return NextResponse.json({ success: true, data: gauge })
}
