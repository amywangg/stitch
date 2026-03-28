import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * DELETE /api/v1/needles/sets/[setId]
 * Deletes all needles belonging to a tool set for the current user.
 */
export const DELETE = withAuth(async (_req, user, params) => {
  const setId = params!.setId

  const count = await prisma.user_needles.count({
    where: { tool_set_id: setId, user_id: user.id },
  })

  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.user_needles.deleteMany({
    where: { tool_set_id: setId, user_id: user.id },
  })

  return NextResponse.json({ success: true, data: { deleted: count } })
})
