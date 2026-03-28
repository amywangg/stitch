import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitActivity } from '@/lib/activity'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryUpdateProject, ravelryDeleteProject } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id, {
    include: {
      sections: {
        orderBy: { sort_order: 'asc' },
        include: {
          pattern_section: {
            include: { rows: { orderBy: { row_number: 'asc' } } },
          },
        },
      },
      pattern: {
        include: {
          sizes: { orderBy: { sort_order: 'asc' } },
          photos: { orderBy: { sort_order: 'asc' }, take: 1 },
        },
      },
      gauge: true,
      photos: { orderBy: { sort_order: 'asc' } },
      yarns: { include: { yarn: { include: { company: true } }, stash_item: true } },
      needles: { include: { needle: true } },
      pdf_upload: true,
      tags: { include: { tag: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  console.log('[project-detail]', (project as any).id, 'photos:', (project as any).photos?.length, 'yarns:', (project as any).yarns?.length, 'gauge:', !!(project as any).gauge)
  return NextResponse.json({ success: true, data: project })
})

export const PATCH = withAuth(async (req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['title', 'description', 'status', 'craft_type', 'size_made', 'mods_notes', 'category', 'started_at', 'finished_at', 'pdf_upload_id', 'progress_pct'] as const
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

  const updated = await prisma.projects.update({ where: { id }, data: updates })

  // Emit activity for status changes
  if ('status' in updates && updates.status !== (project as any).status) {
    if (updates.status === 'completed') {
      emitActivity({ userId: user.id, type: 'project_completed', projectId: (project as any).id })
    } else if (updates.status === 'frogged') {
      emitActivity({ userId: user.id, type: 'project_frogged', projectId: (project as any).id })
    }
  }

  // Push to Ravelry (non-blocking)
  if ((updated as any).ravelry_id) {
    getRavelryClient(user.id).then(async (client) => {
      if (!client) return
      const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
      if (!conn) return
      await ravelryUpdateProject(client, conn.ravelry_username, (updated as any).ravelry_id, {
        name: (updated as any).title,
        notes: (updated as any).description,
        status: (updated as any).status,
        craft_type: (updated as any).craft_type,
        started_at: (updated as any).started_at,
        completed_at: (updated as any).finished_at,
        progress: (updated as any).progress_pct ?? undefined,
      })
    }).catch(err => console.error('[ravelry-push] project update:', err))
  }

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withAuth(async (_req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const deletedProject = await prisma.projects.update({
    where: { id },
    data: { deleted_at: new Date() },
  })

  // Delete from Ravelry (non-blocking)
  if ((deletedProject as any).ravelry_id) {
    getRavelryClient(user.id).then(async (client) => {
      if (!client) return
      const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
      if (!conn) return
      await ravelryDeleteProject(client, conn.ravelry_username, (deletedProject as any).ravelry_id)
    }).catch(err => console.error('[ravelry-push] project delete:', err))
  }

  return NextResponse.json({ success: true, data: {} })
})
