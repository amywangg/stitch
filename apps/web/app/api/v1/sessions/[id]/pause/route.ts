import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/sessions/[id]/pause
 * Pause or resume a session. Toggles between paused/active states.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

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
}
