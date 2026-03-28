import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitActivity } from '@/lib/activity'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryAddToQueue } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req, 50)

  const [items, total] = await Promise.all([
    prisma.pattern_queue.findMany({
      where: { user_id: user.id },
      orderBy: { sort_order: 'asc' },
      skip,
      take: limit,
      include: { pattern: true, pdf_upload: true },
    }),
    prisma.pattern_queue.count({ where: { user_id: user.id } }),
  ])

  return paginatedResponse(items, total, page, limit)
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { pattern_id, notes, pdf_upload_id } = body

  if (!pattern_id) return NextResponse.json({ error: 'pattern_id is required' }, { status: 400 })

  const pattern = await prisma.patterns.findFirst({
    where: { id: pattern_id, deleted_at: null },
  })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  // Validate pdf_upload_id ownership if provided
  if (pdf_upload_id) {
    const pdfUpload = await prisma.pdf_uploads.findFirst({
      where: { id: pdf_upload_id, user_id: user.id },
    })
    if (!pdfUpload) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }
  }

  const item = await prisma.pattern_queue.upsert({
    where: { user_id_pattern_id: { user_id: user.id, pattern_id } },
    update: { notes: notes ?? null, ...(pdf_upload_id !== undefined ? { pdf_upload_id: pdf_upload_id ?? null } : {}) },
    create: { user_id: user.id, pattern_id, notes: notes ?? null, pdf_upload_id: pdf_upload_id ?? null },
    include: { pattern: true, pdf_upload: true },
  })

  emitActivity({ userId: user.id, type: 'pattern_queued', patternId: pattern_id })

  // Push to Ravelry queue (non-blocking)
  if (!item.ravelry_queue_id) {
    getRavelryClient(user.id).then(async (client) => {
      if (!client) return
      const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
      if (!conn) return
      const ravelryQueueId = await ravelryAddToQueue(client, conn.ravelry_username)
      if (ravelryQueueId) {
        await prisma.pattern_queue.update({
          where: { id: item.id },
          data: { ravelry_queue_id: String(ravelryQueueId) },
        })
      }
    }).catch(err => console.error('[ravelry-push] queue add:', err))
  }

  return NextResponse.json({ success: true, data: item }, { status: 201 })
})
