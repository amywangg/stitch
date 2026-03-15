import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const lookupSchema = z.object({
  terms: z.array(z.string().min(1)).min(1).max(100),
})

// POST /api/v1/glossary/lookup — batch lookup by abbreviation or slug (no auth required)
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = lookupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { terms } = parsed.data
  const lowerTerms = terms.map((t) => t.toLowerCase())

  const results = await prisma.glossary_terms.findMany({
    where: {
      OR: [
        { slug: { in: lowerTerms } },
        { abbreviation: { in: terms, mode: 'insensitive' } },
        { synonyms: { some: { synonym: { in: terms, mode: 'insensitive' } } } },
      ],
    },
    include: { synonyms: true },
  })

  return NextResponse.json({ success: true, data: results })
}
