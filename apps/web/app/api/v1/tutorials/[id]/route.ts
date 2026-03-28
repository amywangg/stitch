import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// GET /api/v1/tutorials/[id] — single tutorial with all steps (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const tutorial = await prisma.tutorials.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { step_number: 'asc' },
      },
    },
  })

  if (!tutorial || !tutorial.is_published) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: tutorial })
}
