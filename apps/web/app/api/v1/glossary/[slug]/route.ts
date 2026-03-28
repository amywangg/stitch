import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// GET /api/v1/glossary/[slug] — single term detail (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const term = await prisma.glossary_terms.findUnique({
    where: { slug },
    include: { synonyms: true },
  })

  if (!term) {
    return NextResponse.json({ error: 'Term not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: term })
}
