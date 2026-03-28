import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * POST /api/v1/sessions/[id]/pause
 * Pause or resume a session. Toggles between paused/active states.
 */
export const POST = withAuth(async (_req, user, params) => {
  const id = params!.id

  const session = await prisma.crafting_sessions.findFirst({
    where: { id, user_id: user.id },
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  if (session.ended_at) {
    return NextResponse.json({ error: 'Session already ended' }, { status: 400 })
  }

  // Check if there's an open pause (no resumed_at)
  const openPause = await prisma.session_pauses.findFirst({
    where: { session_id: id, resumed_at: null },
  })

  const now = new Date()

  if (openPause) {
    // Resume — close the open pause
    const updated = await prisma.session_pauses.update({
      where: { id: openPause.id },
      data: { resumed_at: now },
    })

    return NextResponse.json({
      success: true,
      data: { action: 'resumed', pause: updated },
    })
  } else {
    // Pause — create a new open pause
    const pause = await prisma.session_pauses.create({
      data: { session_id: id, paused_at: now },
    })

    return NextResponse.json({
      success: true,
      data: { action: 'paused', pause },
    })
  }
})
