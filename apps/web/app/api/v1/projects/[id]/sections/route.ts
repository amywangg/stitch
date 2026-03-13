import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: { id: string } }

async function getProject(projectId: string, userId: string) {
  return prisma.projects.findFirst({
    where: { id: projectId, user_id: userId, deleted_at: null },
  })
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await getProject(params.id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const sections = await prisma.project_sections.findMany({
    where: { project_id: params.id },
    orderBy: { sort_order: 'asc' },
  })

  return NextResponse.json({ success: true, data: sections })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await getProject(params.id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Section name is required' }, { status: 400 })
  }

  const maxOrder = await prisma.project_sections.aggregate({
    where: { project_id: params.id },
    _max: { sort_order: true },
  })

  const section = await prisma.project_sections.create({
    data: {
      project_id: params.id,
      name: body.name.trim(),
      description: body.description ?? null,
      target_rows: body.target_rows ?? null,
      sort_order: (maxOrder._max.sort_order ?? -1) + 1,
    },
  })

  return NextResponse.json({ success: true, data: section }, { status: 201 })
}
