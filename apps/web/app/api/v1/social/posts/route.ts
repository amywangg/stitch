import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  // Social posting requires Pro
  const proError = requirePro(user, 'social posting')
  if (proError) return proError

  const body = await req.json()
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const post = await prisma.posts.create({
    data: {
      user_id: user.id,
      content: body.content.trim(),
      image_url: body.image_url ?? null,
      project_id: body.project_id ?? null,
    },
    include: {
      user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
    },
  })

  return NextResponse.json({ success: true, data: post }, { status: 201 })
}
