import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient, pushToRavelry } from '@/lib/ravelry-push'
import { emitActivity } from '@/lib/activity'

function reverseMapStatus(stitchStatus: string): string {
  const map: Record<string, string> = {
    active: 'In Progress',
    completed: 'Finished',
    frogged: 'Frogged',
    hibernating: 'Hibernating',
  }
  return map[stitchStatus] ?? 'In Progress'
}

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await prisma.projects.findFirst({
    where: { id: params.id, user_id: user.id, deleted_at: null },
    include: {
      sections: { orderBy: { sort_order: 'asc' } },
      gauge: true,
      photos: { orderBy: { sort_order: 'asc' } },
      yarns: { include: { yarn: { include: { company: true } } } },
      pdf_upload: true,
      tags: { include: { tag: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  console.log('[project-detail]', project.id, 'photos:', project.photos?.length, 'yarns:', project.yarns?.length, 'gauge:', !!project.gauge)
  return NextResponse.json({ success: true, data: project })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await prisma.projects.findFirst({
    where: { id: params.id, user_id: user.id, deleted_at: null },
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['title', 'description', 'status', 'craft_type', 'size_made', 'mods_notes', 'started_at', 'finished_at', 'pdf_upload_id'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Validate pdf_upload_id ownership if provided
  if ('pdf_upload_id' in updates && updates.pdf_upload_id !== null) {
    const pdfUpload = await prisma.pdf_uploads.findFirst({
      where: { id: updates.pdf_upload_id as string, user_id: user.id },
    })
    if (!pdfUpload) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }
  }

  const updated = await prisma.projects.update({ where: { id: params.id }, data: updates })

  // Emit activity for status changes
  if ('status' in updates && updates.status !== project.status) {
    if (updates.status === 'completed') {
      emitActivity({ userId: user.id, type: 'project_completed', projectId: project.id })
    } else if (updates.status === 'frogged') {
      emitActivity({ userId: user.id, type: 'project_frogged', projectId: project.id })
    }
  }

  // Ravelry write-back
  if (updated.ravelry_permalink) {
    const push = await getRavelryPushClient(user.id)
    if (push) {
      const ravelryUpdates: Record<string, string> = {}
      if ('title' in updates) ravelryUpdates.name = updated.title
      if ('status' in updates) ravelryUpdates.status_name = reverseMapStatus(updated.status)
      if ('description' in updates && updated.description) ravelryUpdates.notes = updated.description
      if ('finished_at' in updates && updated.finished_at) {
        ravelryUpdates.completed = updated.finished_at.toISOString().slice(0, 10)
      }
      if (Object.keys(ravelryUpdates).length > 0) {
        pushToRavelry(() => push.client.updateProject(updated.ravelry_permalink!, ravelryUpdates))
      }
    }
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const project = await prisma.projects.findFirst({
    where: { id: params.id, user_id: user.id, deleted_at: null },
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  await prisma.projects.update({
    where: { id: params.id },
    data: { deleted_at: new Date() },
  })

  // Ravelry write-back
  if (project.ravelry_permalink) {
    const push = await getRavelryPushClient(user.id)
    if (push) {
      pushToRavelry(() => push.client.deleteProject(project.ravelry_permalink!))
    }
  }

  return NextResponse.json({ success: true, message: 'Project deleted' })
}
