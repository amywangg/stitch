import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id

  const needle = await findOwned(prisma.user_needles, id, user.id, { softDelete: false })
  if (!needle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.user_needles.delete({ where: { id } })

  return NextResponse.json({ success: true, data: { deleted: true } })
})
