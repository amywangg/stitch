import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

async function getProject(projectId: string, userId: string) {
  return prisma.projects.findFirst({
    where: { id: projectId, user_id: userId, deleted_at: null },
  })
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await getProject(id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const projectTags = await prisma.project_tags.findMany({
    where: { project_id: id },
    include: { tag: true },
  })

  const tags = projectTags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name }))
  return NextResponse.json({ success: true, data: tags })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await getProject(id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  if (!Array.isArray(body.tags) || body.tags.length === 0) {
    return NextResponse.json({ error: 'tags must be a non-empty array of strings' }, { status: 400 })
  }

  const tagNames: string[] = body.tags.map((t: string) => t.trim()).filter(Boolean)
  if (tagNames.length === 0) {
    return NextResponse.json({ error: 'tags must contain at least one non-empty string' }, { status: 400 })
  }

  // Upsert each tag (find or create by name)
  const tagRecords = await Promise.all(
    tagNames.map((name) =>
      prisma.tags.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    )
  )

  // Create project_tags join records, skipping duplicates
  await prisma.project_tags.createMany({
    data: tagRecords.map((tag) => ({
      project_id: id,
      tag_id: tag.id,
    })),
    skipDuplicates: true,
  })

  // Return updated tags list
  const projectTags = await prisma.project_tags.findMany({
    where: { project_id: id },
    include: { tag: true },
  })

  const tags = projectTags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name }))
  return NextResponse.json({ success: true, data: tags }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await getProject(id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  if (!body.tag_id) {
    return NextResponse.json({ error: 'tag_id is required' }, { status: 400 })
  }

  await prisma.project_tags.deleteMany({
    where: { project_id: id, tag_id: body.tag_id },
  })

  return NextResponse.json({ success: true })
}
