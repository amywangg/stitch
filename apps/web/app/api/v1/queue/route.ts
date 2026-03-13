import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient } from '@/lib/ravelry-push'
import { emitActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50')

  const [items, total] = await Promise.all([
    prisma.pattern_queue.findMany({
      where: { user_id: user.id },
      orderBy: { sort_order: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { pattern: true, pdf_upload: true },
    }),
    prisma.pattern_queue.count({ where: { user_id: user.id } }),
  ])

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize: limit, hasMore: total > page * limit },
  })
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
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

  // Ravelry write-back: only if pattern has a ravelry_id
  if (pattern.ravelry_id) {
    const push = await getRavelryPushClient(user.id)
    if (push) {
      try {
        const { queued_project: rq } = await push.client.addToQueue({
          pattern_id: Number(pattern.ravelry_id),
          notes: notes ?? undefined,
        })
        await prisma.pattern_queue.update({
          where: { id: item.id },
          data: { ravelry_queue_id: String(rq.id) },
        })
      } catch {
        // Ravelry unavailable — queue item still created in Stitch
      }
    }
  }

  return NextResponse.json({ success: true, data: item }, { status: 201 })
}
