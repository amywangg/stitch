import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { requirePro } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import { buildBlueprint } from '@/lib/pattern-builder/math'
import { buildPatternBuilderPrompt } from '@/lib/prompts/pattern-builder'
import type { PatternBuilderInput, AIPatternOutput } from '@/lib/pattern-builder/types'
import {
  resolveGaugeAndNeedle,
  getSizeChart,
  writeSectionsForSize,
  fetchFullPattern,
} from '@/lib/pattern-builder/generate-helpers'
import type { SizeSpec } from '@/lib/pattern-builder/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GenerateSizeSchema = z.object({
  size_name: z.string().trim().min(1).max(50),
})

/**
 * POST /api/v1/ai/pattern-builder/[patternId]/generate-size
 * Generate instructions for an additional size of an existing AI-generated pattern.
 * Pro-gated.
 */
export const POST = withAuth(async (req, user, params) => {
  const proError = requirePro(user, 'AI pattern builder')
  if (proError) return proError

  const { patternId } = params!

  const pattern = await findOwned<any>(prisma.patterns, patternId, user.id, {
    include: { sizes: true, sections: { include: { rows: true } } },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (!pattern.ai_generated) {
    return NextResponse.json(
      { error: 'Only AI-generated patterns support AI size generation', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  if (!pattern.builder_input) {
    return NextResponse.json(
      { error: 'Pattern is missing builder input data', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const body = await req.json()
  const parsed = GenerateSizeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { size_name } = parsed.data

  const targetSizeRecord = pattern.sizes.find((s: any) => s.name === size_name)
  if (!targetSizeRecord) {
    return NextResponse.json(
      { error: `Size "${size_name}" not found on this pattern`, code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // Check if sections already exist for this size (cache hit)
  const existingSections = pattern.sections.filter((s: any) => s.size_id === targetSizeRecord.id)
  if (existingSections.length > 0) {
    const fullPattern = await fetchFullPattern(pattern.id)
    return NextResponse.json({ success: true, data: fullPattern })
  }

  // Reconstruct input from stored builder_input
  const input = pattern.builder_input as unknown as PatternBuilderInput
  const { gauge, needleMm } = resolveGaugeAndNeedle(input)

  // Resolve sizes from chart
  const sizeChart = getSizeChart(input.project_type)
  let sizes: SizeSpec[]

  if (input.project_type === 'scarf_cowl') {
    const opts = input.options as { width_cm?: number; length_cm?: number; circumference_cm?: number }
    sizes = [{
      name: 'One Size',
      measurements: {
        width_cm: opts.width_cm ?? 20,
        length_cm: opts.length_cm ?? 150,
        circumference_cm: opts.circumference_cm ?? 60,
      },
    }]
  } else {
    sizes = Object.entries(sizeChart).map(([name, measurements]) => ({
      name,
      measurements: measurements as Record<string, number>,
    }))
  }

  if (!sizes.find((s) => s.name === size_name)) {
    return NextResponse.json(
      { error: `Size "${size_name}" not found in size chart`, code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const blueprint = buildBlueprint(input.project_type, gauge, needleMm, sizes, input.options)

  // Call AI for requested size
  const prompt = buildPatternBuilderPrompt(blueprint, size_name, input.options)

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const aiContent = completion.choices[0].message.content ?? '{}'
  let aiOutput: AIPatternOutput
  try {
    aiOutput = JSON.parse(aiContent) as AIPatternOutput
  } catch {
    return NextResponse.json(
      { error: 'AI returned invalid JSON', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  if (!aiOutput.sections || !Array.isArray(aiOutput.sections)) {
    return NextResponse.json(
      { error: 'AI returned invalid pattern structure', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  // Write sections + rows for this size
  await writeSectionsForSize(pattern.id, targetSizeRecord.id, blueprint, aiOutput, size_name)

  const fullPattern = await fetchFullPattern(pattern.id)
  return NextResponse.json({ success: true, data: fullPattern })
})
