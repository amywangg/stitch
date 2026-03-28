/**
 * Shared helpers for pattern generation (AI and template routes).
 * Extracted from the AI pattern builder route to avoid duplication.
 */

import { prisma } from '@/lib/prisma'
import { generateUniqueSlug } from '@/lib/route-helpers'
import {
  estimateEffectiveWeight,
  estimateGaugeRange,
  NEEDLE_RANGES,
  type YarnWeight,
} from '@/lib/yarn-math'
import type { PatternBuilderInput, AIPatternOutput, SizeSpec, Gauge, PatternBlueprint } from './types'
import { HAT_SIZES, SWEATER_SIZES, SOCK_SIZES, MITTEN_SIZES, BLANKET_PRESETS } from './size-charts'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResolvedGauge {
  gauge: Gauge
  needleMm: number
  effectiveWeight: YarnWeight
}

interface DbUser {
  id: string
  [key: string]: unknown
}

// ─── Size chart lookup ──────────────────────────────────────────────────────

export function getSizeChart(projectType: string): Record<string, Record<string, number>> {
  switch (projectType) {
    case 'hat': return HAT_SIZES as unknown as Record<string, Record<string, number>>
    case 'sweater': return SWEATER_SIZES as unknown as Record<string, Record<string, number>>
    case 'socks': return SOCK_SIZES as unknown as Record<string, Record<string, number>>
    case 'mittens': return MITTEN_SIZES as unknown as Record<string, Record<string, number>>
    case 'blanket': return BLANKET_PRESETS as unknown as Record<string, Record<string, number>>
    default: return {}
  }
}

// ─── Gauge resolution ───────────────────────────────────────────────────────

export function resolveGaugeAndNeedle(input: PatternBuilderInput): ResolvedGauge {
  const combo = input.yarns.map((y) => ({
    weight: y.weight as YarnWeight,
    fiber_content: y.fiber_content,
    strands: y.strands,
  }))
  const effectiveWeight = estimateEffectiveWeight(combo)
  const gauge = input.gauge_override ?? estimateGaugeRange(effectiveWeight, input.needle_size_mm)
  const needleMm = input.needle_size_mm ?? NEEDLE_RANGES[effectiveWeight].typical_mm

  return { gauge, needleMm, effectiveWeight }
}

// ─── Size resolution ────────────────────────────────────────────────────────

export async function resolveSizes(
  input: PatternBuilderInput,
  userId: string,
): Promise<SizeSpec[]> {
  const sizeChart = getSizeChart(input.project_type)
  let sizes: SizeSpec[] = []

  if (input.project_type === 'scarf_cowl') {
    const opts = input.options as { width_cm?: number; length_cm?: number; circumference_cm?: number; form?: string }
    sizes = [{
      name: 'One Size',
      measurements: {
        width_cm: opts.width_cm ?? 20,
        length_cm: opts.length_cm ?? 150,
        circumference_cm: opts.circumference_cm ?? 60,
      },
    }]
  } else if (input.custom_measurements) {
    sizes = [{ name: 'Custom', measurements: input.custom_measurements }]
  } else if (input.use_my_measurements) {
    const measurements = await prisma.user_measurements.findUnique({
      where: { user_id: userId },
    })
    if (measurements) {
      const m: Record<string, number> = {}
      if (measurements.head_circumference_cm) m.head_circumference_cm = measurements.head_circumference_cm
      if (measurements.bust_cm) m.bust_cm = measurements.bust_cm
      if (measurements.shoulder_width_cm) m.shoulder_width_cm = measurements.shoulder_width_cm
      if (measurements.arm_length_cm) m.arm_length_cm = measurements.arm_length_cm
      if (measurements.upper_arm_cm) m.upper_arm_cm = measurements.upper_arm_cm
      if (measurements.back_length_cm) m.back_length_cm = measurements.back_length_cm
      if (measurements.foot_length_cm) m.foot_length_cm = measurements.foot_length_cm
      if (measurements.foot_circumference_cm) m.foot_circumference_cm = measurements.foot_circumference_cm
      sizes = [{ name: 'My Measurements', measurements: m }]
    }
  }

  // Fall back to full size chart
  if (sizes.length === 0) {
    sizes = Object.entries(sizeChart).map(([name, measurements]) => ({
      name,
      measurements: measurements as Record<string, number>,
    }))
  }

  return sizes
}

// ─── DB write ───────────────────────────────────────────────────────────────

export async function writePatternToDb(
  user: DbUser,
  blueprint: PatternBlueprint,
  output: AIPatternOutput,
  input: PatternBuilderInput,
  sizes: SizeSpec[],
  targetSize: string,
  gauge: Gauge,
  needleMm: number,
  effectiveWeight: YarnWeight,
  aiGenerated: boolean,
) {
  const title = output.title || blueprint.title_suggestion
  const slug = await generateUniqueSlug(prisma.patterns, user.id, title)

  const pattern = await prisma.$transaction(async (tx) => {
    const pat = await tx.patterns.create({
      data: {
        user_id: user.id,
        slug,
        title,
        description: output.description || null,
        craft_type: 'knitting',
        difficulty: blueprint.difficulty,
        garment_type: blueprint.garment_type,
        yarn_weight: effectiveWeight,
        needle_size_mm: needleMm,
        gauge_stitches_per_10cm: gauge.stitches_per_10cm,
        gauge_rows_per_10cm: gauge.rows_per_10cm,
        ai_parsed: false,
        ai_generated: aiGenerated,
        builder_input: JSON.parse(JSON.stringify(input)),
        source_free: true,
        selected_size: targetSize,
      },
    })

    // Create pattern_yarns
    for (let i = 0; i < input.yarns.length; i++) {
      const y = input.yarns[i]
      await tx.pattern_yarns.create({
        data: {
          pattern_id: pat.id,
          name: y.name,
          weight: y.weight,
          fiber_content: y.fiber_content ?? null,
          strands: y.strands,
          sort_order: i,
        },
      })
    }

    // Create pattern_sizes (all sizes)
    const sizeRecords: Record<string, string> = {}
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i]
      const sizeData: Record<string, unknown> = {
        pattern_id: pat.id,
        name: s.name,
        sort_order: i,
      }
      if (s.measurements.finished_bust_cm ?? s.measurements.bust_cm) {
        sizeData.finished_bust_cm = s.measurements.finished_bust_cm ?? s.measurements.bust_cm
      }
      if (s.measurements.head_circumference_cm) sizeData.head_circumference_cm = s.measurements.head_circumference_cm
      if (s.measurements.foot_length_cm) sizeData.foot_length_cm = s.measurements.foot_length_cm
      if (s.measurements.foot_circumference_cm) sizeData.foot_circumference_cm = s.measurements.foot_circumference_cm
      if (s.measurements.hand_circumference_cm) sizeData.hand_circumference_cm = s.measurements.hand_circumference_cm
      if (s.measurements.shoulder_width_cm) sizeData.shoulder_width_cm = s.measurements.shoulder_width_cm
      if (s.measurements.arm_length_cm) sizeData.arm_length_cm = s.measurements.arm_length_cm
      if (s.measurements.upper_arm_cm) sizeData.upper_arm_cm = s.measurements.upper_arm_cm
      if (s.measurements.back_length_cm) sizeData.back_length_cm = s.measurements.back_length_cm
      if (s.measurements.finished_length_cm) sizeData.finished_length_cm = s.measurements.finished_length_cm

      const sizeRecord = await tx.pattern_sizes.create({ data: sizeData as any })
      sizeRecords[s.name] = sizeRecord.id
    }

    // Create sections + rows for the target size only
    const targetSizeId = sizeRecords[targetSize]
    for (const section of output.sections) {
      const blueprintSections = blueprint.sections_per_size[targetSize] ?? []
      const bpSection = blueprintSections.find((s) => s.name === section.name)
      const sortOrder = bpSection?.sort_order ?? 0

      const dbSection = await tx.pattern_sections.create({
        data: {
          pattern_id: pat.id,
          size_id: targetSizeId,
          name: section.name,
          sort_order: sortOrder,
        },
      })

      const bpSteps = bpSection?.steps ?? []

      for (const step of section.steps) {
        const bpStep = bpSteps.find((s) => s.step_number === step.step_number)

        await tx.pattern_rows.create({
          data: {
            section_id: dbSection.id,
            size_id: targetSizeId,
            row_number: step.step_number,
            instruction: step.instruction,
            notes: step.notes ?? null,
            stitch_count: step.stitch_count ?? bpStep?.stitch_count ?? null,
            row_type: bpStep?.row_type ?? null,
            rows_in_step: bpStep?.rows_in_step ?? null,
            is_repeat: bpStep?.is_repeat ?? false,
            repeat_count: bpStep?.repeat_count ?? null,
            rows_per_repeat: bpStep?.rows_per_repeat ?? null,
            target_measurement_cm: bpStep?.target_measurement_cm ?? null,
          },
        })
      }
    }

    return pat
  })

  // Fetch the full pattern with includes
  const fullPattern = await prisma.patterns.findUnique({
    where: { id: pattern.id },
    include: {
      sizes: { orderBy: { sort_order: 'asc' } },
      sections: {
        orderBy: { sort_order: 'asc' },
        include: { rows: { orderBy: { row_number: 'asc' } } },
      },
      pattern_yarns: { orderBy: { sort_order: 'asc' } },
    },
  })

  return fullPattern
}

// ─── Size generation helpers ────────────────────────────────────────────────

/** Write sections + rows for a single additional size on an existing pattern. */
export async function writeSectionsForSize(
  patternId: string,
  sizeId: string,
  blueprint: PatternBlueprint,
  output: AIPatternOutput,
  sizeName: string,
) {
  await prisma.$transaction(async (tx) => {
    const blueprintSections = blueprint.sections_per_size[sizeName] ?? []

    for (const section of output.sections) {
      const bpSection = blueprintSections.find((s) => s.name === section.name)
      const sortOrder = bpSection?.sort_order ?? 0

      const dbSection = await tx.pattern_sections.create({
        data: {
          pattern_id: patternId,
          size_id: sizeId,
          name: section.name,
          sort_order: sortOrder,
        },
      })

      const bpSteps = bpSection?.steps ?? []

      for (const step of section.steps) {
        const bpStep = bpSteps.find((s) => s.step_number === step.step_number)

        await tx.pattern_rows.create({
          data: {
            section_id: dbSection.id,
            size_id: sizeId,
            row_number: step.step_number,
            instruction: step.instruction,
            notes: step.notes ?? null,
            stitch_count: step.stitch_count ?? bpStep?.stitch_count ?? null,
            row_type: bpStep?.row_type ?? null,
            rows_in_step: bpStep?.rows_in_step ?? null,
            is_repeat: bpStep?.is_repeat ?? false,
            repeat_count: bpStep?.repeat_count ?? null,
            rows_per_repeat: bpStep?.rows_per_repeat ?? null,
            target_measurement_cm: bpStep?.target_measurement_cm ?? null,
          },
        })
      }
    }
  })
}

/** Fetch a full pattern with sizes, sections, rows, and yarns. */
export async function fetchFullPattern(patternId: string) {
  return prisma.patterns.findUnique({
    where: { id: patternId },
    include: {
      sizes: { orderBy: { sort_order: 'asc' } },
      sections: {
        orderBy: { sort_order: 'asc' },
        include: { rows: { orderBy: { row_number: 'asc' } } },
      },
      pattern_yarns: { orderBy: { sort_order: 'asc' } },
    },
  })
}
