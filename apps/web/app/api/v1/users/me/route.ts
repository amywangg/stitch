import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user) => {
  const { subscription } = await prisma.users.findUniqueOrThrow({
    where: { id: user.id },
    select: { subscription: true },
  })

  return NextResponse.json({
    success: true,
    data: { ...user, subscription },
  })
})

export const PATCH = withAuth(async (req, user) => {
  const body = await req.json()

  const allowed = ['display_name', 'bio', 'avatar_url', 'craft_preference', 'knitting_style', 'experience_level'] as const
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.users.update({
    where: { id: user.id },
    data: updates,
  })

  return NextResponse.json({ success: true, data: updated })
})
