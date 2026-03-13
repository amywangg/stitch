import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { subscription } = await prisma.users.findUniqueOrThrow({
    where: { id: user.id },
    select: { subscription: true },
  })

  return NextResponse.json({
    success: true,
    data: { ...user, subscription },
  })
}

export async function PATCH(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const body = await req.json()

  const allowed = ['display_name', 'bio', 'avatar_url'] as const
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.users.update({
    where: { id: user.id },
    data: updates,
  })

  return NextResponse.json({ success: true, data: updated })
}
