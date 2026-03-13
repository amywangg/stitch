import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { explainPatternRow } from '@/lib/agent'

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
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await getDbUser(clerkId)

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
}
