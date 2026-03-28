import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { explainPatternRow } from '@/lib/agent'


export const dynamic = 'force-dynamic'
/**
 * POST /api/v1/ai/explain-row
 * "What does this row mean?" — explains a pattern instruction in plain language.
 * Uses gpt-4o-mini so it's cheap enough to not Pro-gate.
 *
 * Body: {
 *   instruction: string,
 *   craft_type?: string,
 *   experience_level?: string,
 *   previous_row?: string,
 * }
 */
export const POST = withAuth(async (req, _user) => {
  const body = await req.json()
  const { instruction, craft_type, experience_level, previous_row } = body as {
    instruction: string
    craft_type?: string
    experience_level?: string
    previous_row?: string
  }

  if (!instruction?.trim()) {
    return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
  }

  try {
    const result = await explainPatternRow(instruction, { craft_type, experience_level, previous_row })
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Explanation failed' },
      { status: 500 },
    )
  }
})
