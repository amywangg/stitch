/**
 * Deterministic pattern construction math.
 * Pure functions — no AI, no DB, no network.
 * All knitting rules encoded as constants and logic, NOT in AI prompts.
 */

import type {
  Gauge,
  SizeSpec,
  StepBlueprint,
  SectionBlueprint,
  PatternBlueprint,
  ProjectOptions,
  HatOptions,
  SweaterOptions,
  SockOptions,
  MittenOptions,
  ScarfCowlOptions,
  BlanketOptions,
} from './types'
import type { YarnWeight } from '@/lib/yarn-math'
import { HAT_SIZES, SWEATER_SIZES, SOCK_SIZES, MITTEN_SIZES, BLANKET_PRESETS } from './size-charts'

// ─── Shared utilities ───────────────────────────────────────────────────────

/** Round target to nearest multiple of divisor */
export function nearestDivisible(target: number, divisor: number): number {
  return Math.round(target / divisor) * divisor
}

/** Least common multiple */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b)
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

/** Get the stitch repeat divisor for a ribbing style */
export function ribbingDivisor(style: string): number {
  switch (style) {
    case 'rib_1x1': return 2
    case 'rib_2x2': return 4
    case 'seed': return 2
    case 'moss': return 2
    case 'garter': return 1
    default: return 1
  }
}

/** cm → stitches using gauge */
export function cmToStitches(cm: number, gauge: Gauge): number {
  return Math.round(cm * gauge.stitches_per_10cm / 10)
}

/** cm → rows using gauge */
export function cmToRows(cm: number, gauge: Gauge): number {
  return Math.round(cm * gauge.rows_per_10cm / 10)
}

/** rows → cm using gauge */
function rowsToCm(rows: number, gauge: Gauge): number {
  return Math.round((rows * 10 / gauge.rows_per_10cm) * 10) / 10
}

/**
 * Calculate evenly spaced decrease schedule.
 * Returns array of decrease rounds where each round removes `perRound` stitches.
 */
export function calculateDecreaseSchedule(
  startSts: number,
  sections: number,
  gauge: Gauge,
): { decrease_rounds: number; final_sts: number; depth_cm: number } {
  const decreasePerRound = sections
  let sts = startSts
  let rounds = 0

  // Alternate decrease round with plain round
  while (sts > sections * 2) {
    sts -= decreasePerRound
    rounds += 2 // decrease round + plain round
  }

  return {
    decrease_rounds: rounds,
    final_sts: Math.max(sts, sections),
    depth_cm: rowsToCm(rounds, gauge),
  }
}

/**
 * Calculate taper schedule (e.g., sleeve taper).
 * Uses quotient/remainder algorithm for even spacing.
 */
export function calculateTaper(
  startSts: number,
  endSts: number,
  availableRows: number,
): { decrease_every_n_rows: number; extra_rows_at_start: number; total_decreases: number } {
  const totalDec = Math.floor((startSts - endSts) / 2) // 2 decreases per decrease row (1 each side)
  if (totalDec <= 0) return { decrease_every_n_rows: 0, extra_rows_at_start: 0, total_decreases: 0 }

  const spacing = Math.floor(availableRows / totalDec)
  const remainder = availableRows - spacing * totalDec

  return {
    decrease_every_n_rows: Math.max(2, spacing), // at least every 2nd row
    extra_rows_at_start: remainder,
    total_decreases: totalDec,
  }
}

// ─── Step builder helper ────────────────────────────────────────────────────

let stepCounter = 0

function resetSteps(): void {
  stepCounter = 0
}

function step(
  description: string,
  overrides: Partial<StepBlueprint> = {},
): StepBlueprint {
  stepCounter++
  return {
    step_number: stepCounter,
    description,
    stitch_count: null,
    row_type: 'work_rows',
    rows_in_step: null,
    is_repeat: false,
    repeat_count: null,
    rows_per_repeat: null,
    target_measurement_cm: null,
    math_notes: null,
    ...overrides,
  }
}

// ─── Scarf / Cowl ───────────────────────────────────────────────────────────

/** Get border stitch count per side for a given edge treatment */
function edgeBorderStitches(treatment: string): number {
  switch (treatment) {
    case 'garter_border': return 3
    case 'seed_border': return 3
    case 'i_cord': return 3
    case 'slip_stitch': return 1
    case 'no_border': return 0
    default: return 0
  }
}

export function buildScarfCowlBlueprint(
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: ScarfCowlOptions,
): PatternBlueprint {
  const ribbingNeedleMm = Math.max(2, needleMm - 0.5)
  const isScarf = options.form === 'scarf'
  const isBias = isScarf && options.scarf_construction === 'bias_diagonal'

  const sectionsPerSize: Record<string, SectionBlueprint[]> = {}

  for (const size of sizes) {
    resetSteps()

    // Cowl wrap: double wrap = 2× circumference
    const wrapMult = (!isScarf && options.cowl_wrap === 'double') ? 2 : 1
    const widthCm = isScarf
      ? (options.width_cm ?? size.measurements.width_cm ?? 20)
      : (options.circumference_cm ?? size.measurements.circumference_cm ?? 60) * wrapMult
    const lengthCm = isScarf
      ? (options.length_cm ?? size.measurements.length_cm ?? 150)
      : (options.height_cm ?? size.measurements.height_cm ?? 25)

    const div = ribbingDivisor(options.stitch_pattern)
    let castOn: number

    if (isBias) {
      // Bias/diagonal: cast on 3 stitches, increase to target width, then decrease
      castOn = 3
    } else {
      castOn = cmToStitches(widthCm, gauge)
      // Add border stitches for scarves with edge treatments
      const edgeSts = isScarf ? edgeBorderStitches(options.edge_treatment ?? 'no_border') : 0
      if (edgeSts > 0) {
        castOn = nearestDivisible(castOn - edgeSts * 2, div) + edgeSts * 2
      } else {
        castOn = nearestDivisible(castOn, div)
      }
      if (castOn < div) castOn = div
    }

    const sections: SectionBlueprint[] = []
    const steps: StepBlueprint[] = []

    if (isBias) {
      // Bias diagonal scarf
      const targetSts = cmToStitches(options.width_cm ?? 20, gauge)
      const diagTargetSts = nearestDivisible(targetSts, 2)
      steps.push(step(
        `Cast on 3 stitches on ${needleMm}mm needles`,
        { stitch_count: 3, row_type: 'setup', rows_in_step: 1 },
      ))
      steps.push(step(
        `Increase section: K1, M1L, knit to last st, M1R, k1 (inc 2 sts per row). Repeat until you have ${diagTargetSts} stitches.`,
        {
          stitch_count: diagTargetSts,
          row_type: 'repeat',
          rows_in_step: Math.floor((diagTargetSts - 3) / 2),
          is_repeat: true,
          repeat_count: Math.floor((diagTargetSts - 3) / 2),
          rows_per_repeat: 1,
          math_notes: `Increase from 3 to ${diagTargetSts} sts`,
        },
      ))
      steps.push(step(
        `Straight section: Row 1: K1, M1L, knit to last 3 sts, k2tog, k1.\nRepeat until piece measures ${lengthCm}cm along the longer edge.`,
        {
          stitch_count: diagTargetSts,
          row_type: 'work_to_measurement',
          target_measurement_cm: lengthCm,
          math_notes: 'Maintain stitch count — bias shifts the fabric diagonally',
        },
      ))
      steps.push(step(
        `Decrease section: K1, ssk, knit to last 3 sts, k2tog, k1 (dec 2 sts per row). Repeat until 3 sts remain. Bind off.`,
        { stitch_count: 0, row_type: 'finishing', rows_in_step: Math.floor((diagTargetSts - 3) / 2) },
      ))
    } else if (isScarf) {
      // Flat scarf
      const joinText = ''
      const edgeTreatment = options.edge_treatment ?? 'no_border'
      const edgeSts = edgeBorderStitches(edgeTreatment)

      steps.push(step(
        `Cast on ${castOn} stitches on ${needleMm}mm needles`,
        { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
      ))

      let bodyDesc: string
      if (edgeSts > 0 && options.stitch_pattern === 'stockinette') {
        const borderName = edgeTreatment === 'i_cord' ? 'i-cord edge' : edgeTreatment.replace('_', ' ')
        bodyDesc = `Work in stockinette with ${edgeSts}-stitch ${borderName} on each side until piece measures ${lengthCm}cm`
      } else if (edgeTreatment === 'slip_stitch') {
        bodyDesc = `Work in ${options.stitch_pattern.replace('_', ' ')} with slipped selvedge stitches until piece measures ${lengthCm}cm`
      } else {
        bodyDesc = `Work in ${options.stitch_pattern.replace('_', ' ')} until piece measures ${lengthCm}cm`
      }

      steps.push(step(bodyDesc, {
        stitch_count: castOn,
        row_type: 'work_to_measurement',
        target_measurement_cm: lengthCm,
        math_notes: `${options.stitch_pattern.replace('_', ' ')} throughout`,
      }))

      steps.push(step('Bind off all stitches', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))

      // Fringe
      if (options.fringe) {
        steps.push(step(
          'Cut yarn into 30cm lengths. Attach fringe evenly along both short edges using a crochet hook.',
          { row_type: 'finishing', rows_in_step: 1, math_notes: '2-3 strands per fringe bundle' },
        ))
      }

      steps.push(step('Block to measurements, weave in ends', {
        row_type: 'finishing', rows_in_step: 1,
      }))
    } else {
      // Cowl
      const cowlConstruction = options.cowl_construction ?? 'joined_round'
      if (cowlConstruction === 'mobius') {
        steps.push(step(
          `Using a möbius cast-on, cast on ${castOn} stitches on ${needleMm}mm circular needles`,
          { stitch_count: castOn, row_type: 'setup', rows_in_step: 1, math_notes: 'Möbius produces a half-twist' },
        ))
        steps.push(step(
          `Work in ${options.stitch_pattern.replace('_', ' ')} for ${Math.round(lengthCm / 2)} rounds (fabric grows from both edges of cast-on)`,
          { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: Math.round(lengthCm / 2) },
        ))
      } else if (cowlConstruction === 'flat_seamed') {
        steps.push(step(
          `Cast on ${castOn} stitches on ${needleMm}mm needles (worked flat, seamed at end)`,
          { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
        ))
        steps.push(step(
          `Work in ${options.stitch_pattern.replace('_', ' ')} until piece measures ${lengthCm}cm`,
          { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: lengthCm },
        ))
      } else {
        // joined_round
        steps.push(step(
          `Cast on ${castOn} stitches on ${needleMm}mm circular needles, join in the round`,
          { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
        ))
        steps.push(step(
          `Work in ${options.stitch_pattern.replace('_', ' ')} until piece measures ${lengthCm}cm`,
          { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: lengthCm },
        ))
      }

      steps.push(step(
        cowlConstruction === 'flat_seamed'
          ? 'Bind off all stitches. Seam short edges together. Weave in ends.'
          : 'Bind off all stitches. Weave in ends.',
        { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
      ))
    }

    sections.push({ name: 'Body', sort_order: 0, steps })
    sectionsPerSize[size.name] = sections
  }

  const difficulty = isBias ? 'easy' : 'beginner'
  const titleMap: Record<string, string> = {
    scarf: isBias ? 'Bias Knit Scarf' : 'Classic Knit Scarf',
    cowl: options.cowl_construction === 'mobius' ? 'Möbius Cowl' : 'Knit Cowl',
  }

  return {
    title_suggestion: titleMap[options.form] ?? 'Knit Scarf',
    difficulty,
    garment_type: isScarf ? 'scarf' : 'cowl',
    gauge,
    needle_size_mm: needleMm,
    ribbing_needle_mm: ribbingNeedleMm,
    yarn_weight: 'worsted' as YarnWeight,
    sizes,
    sections_per_size: sectionsPerSize,
  }
}

// ─── Blanket ────────────────────────────────────────────────────────────────

/** Build border section for blanket if border !== 'no_border' */
function buildBlanketBorder(
  borderType: string,
  castOn: number,
  needleMm: number,
): StepBlueprint[] | null {
  if (borderType === 'no_border') return null
  const borderSteps: StepBlueprint[] = []
  resetSteps()
  if (borderType === 'i_cord') {
    borderSteps.push(step(
      `Pick up stitches along all 4 edges on ${needleMm}mm circular needles. Work applied i-cord border around entire blanket.`,
      { row_type: 'finishing', rows_in_step: 1, math_notes: 'CO 3 sts, *k2, k2tog-tbl (1 picked-up st), slip 3 back*' },
    ))
  } else {
    const borderName = borderType === 'garter' ? 'garter stitch' : 'seed stitch'
    borderSteps.push(step(
      `Pick up stitches along all 4 edges on ${needleMm}mm circular needles. Work 6 rounds in ${borderName}. Bind off loosely.`,
      { row_type: 'work_rows', rows_in_step: 6, math_notes: 'Mitre corners with double decreases' },
    ))
  }
  return borderSteps
}

export function buildBlanketBlueprint(
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: BlanketOptions,
): PatternBlueprint {
  const ribbingNeedleMm = Math.max(2, needleMm - 0.5)
  const sectionsPerSize: Record<string, SectionBlueprint[]> = {}
  const border = options.border ?? 'no_border'

  for (const size of sizes) {
    resetSteps()

    const widthCm = options.custom_width_cm ?? size.measurements.width_cm ?? 100
    const heightCm = options.custom_height_cm ?? size.measurements.height_cm ?? 130
    const div = Math.max(ribbingDivisor(options.stitch_pattern), 2)
    const allSections: SectionBlueprint[] = []

    if (options.construction === 'single_piece') {
      let castOn = cmToStitches(widthCm, gauge)
      castOn = nearestDivisible(castOn, div)
      if (castOn < div) castOn = div

      const steps: StepBlueprint[] = []
      steps.push(step(
        `Cast on ${castOn} stitches on ${needleMm}mm needles`,
        { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
      ))
      steps.push(step(
        `Work in ${options.stitch_pattern.replace('_', ' ')} until piece measures ${heightCm}cm`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: heightCm },
      ))
      steps.push(step('Bind off all stitches loosely', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))
      allSections.push({ name: 'Blanket', sort_order: 0, steps })

    } else if (options.construction === 'modular_squares') {
      const squareSizeCm = 15
      const squaresWide = Math.ceil(widthCm / squareSizeCm)
      const squaresTall = Math.ceil(heightCm / squareSizeCm)
      const totalSquares = squaresWide * squaresTall
      let squareCastOn = cmToStitches(squareSizeCm, gauge)
      squareCastOn = nearestDivisible(squareCastOn, div)

      const squareSteps: StepBlueprint[] = []
      resetSteps()
      squareSteps.push(step(
        `Cast on ${squareCastOn} stitches on ${needleMm}mm needles`,
        { stitch_count: squareCastOn, row_type: 'setup', rows_in_step: 1 },
      ))
      squareSteps.push(step(
        `Work in ${options.stitch_pattern.replace('_', ' ')} until square measures ${squareSizeCm}cm`,
        { stitch_count: squareCastOn, row_type: 'work_to_measurement', target_measurement_cm: squareSizeCm },
      ))
      squareSteps.push(step('Bind off all stitches', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))

      const asmSteps: StepBlueprint[] = []
      resetSteps()
      asmSteps.push(step(
        `Seam ${totalSquares} squares into a ${squaresWide} × ${squaresTall} grid using mattress stitch or whip stitch`,
        { row_type: 'finishing', rows_in_step: 1, math_notes: `${squaresWide} wide × ${squaresTall} tall` },
      ))
      allSections.push(
        { name: `Square (make ${totalSquares})`, sort_order: 0, steps: squareSteps },
        { name: 'Assembly', sort_order: 1, steps: asmSteps },
      )

    } else if (options.construction === 'mitered_squares') {
      // Mitered squares: cast on diagonal, decrease to center
      const squareSizeCm = 15
      const squaresWide = Math.ceil(widthCm / squareSizeCm)
      const squaresTall = Math.ceil(heightCm / squareSizeCm)
      const totalSquares = squaresWide * squaresTall
      const diagonalSts = cmToStitches(squareSizeCm * Math.SQRT2, gauge)
      let miterCO = nearestDivisible(diagonalSts, 2) + 1 // must be odd for center stitch

      const sqSteps: StepBlueprint[] = []
      resetSteps()
      sqSteps.push(step(
        `Cast on ${miterCO} stitches on ${needleMm}mm needles`,
        { stitch_count: miterCO, row_type: 'setup', rows_in_step: 1 },
      ))
      sqSteps.push(step(
        `RS: Knit to 1 st before center, sl2-k1-p2sso, knit to end (2 sts dec'd).\nWS: Knit all (garter).\nRepeat until 1 st remains.`,
        {
          stitch_count: 1,
          row_type: 'repeat',
          rows_in_step: miterCO - 1,
          is_repeat: true,
          repeat_count: Math.floor(miterCO / 2),
          rows_per_repeat: 2,
          math_notes: 'Center double decrease creates the mitre',
        },
      ))
      sqSteps.push(step('Fasten off', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))

      const asmSteps: StepBlueprint[] = []
      resetSteps()
      asmSteps.push(step(
        `Join ${totalSquares} mitered squares into a ${squaresWide} × ${squaresTall} grid. Pick up stitches along edges of adjacent squares for seamless joins.`,
        { row_type: 'finishing', rows_in_step: 1 },
      ))
      allSections.push(
        { name: `Mitered Square (make ${totalSquares})`, sort_order: 0, steps: sqSteps },
        { name: 'Assembly', sort_order: 1, steps: asmSteps },
      )

    } else if (options.construction === 'log_cabin') {
      // Log cabin: start with center square, add strips around it
      const centerSizeCm = Math.min(widthCm, heightCm) / 3
      let centerCO = cmToStitches(centerSizeCm, gauge)
      centerCO = nearestDivisible(centerCO, div)

      const centerSteps: StepBlueprint[] = []
      resetSteps()
      centerSteps.push(step(
        `Cast on ${centerCO} stitches on ${needleMm}mm needles`,
        { stitch_count: centerCO, row_type: 'setup', rows_in_step: 1 },
      ))
      centerSteps.push(step(
        `Work in garter stitch until square (${centerSizeCm}cm × ${centerSizeCm}cm)`,
        { stitch_count: centerCO, row_type: 'work_to_measurement', target_measurement_cm: centerSizeCm },
      ))
      centerSteps.push(step('Bind off. Do not break yarn.', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))

      const stripSteps: StepBlueprint[] = []
      resetSteps()
      stripSteps.push(step(
        `Pick up stitches along one edge of the center square. Work in garter stitch until strip width equals center square height. Bind off.`,
        { row_type: 'work_rows', rows_in_step: null, math_notes: 'First log strip' },
      ))
      stripSteps.push(step(
        `Rotate 90°, pick up stitches along the combined edge (center + strip). Work in garter stitch to match strip width. Bind off.`,
        { row_type: 'work_rows', rows_in_step: null, math_notes: 'Second log strip' },
      ))
      stripSteps.push(step(
        `Continue adding strips around the center, rotating 90° each time, until blanket measures approximately ${widthCm}cm × ${heightCm}cm. Alternate colors for visual effect.`,
        {
          row_type: 'work_to_measurement',
          target_measurement_cm: widthCm,
          math_notes: `Target: ${widthCm}cm × ${heightCm}cm`,
        },
      ))

      allSections.push(
        { name: 'Center Square', sort_order: 0, steps: centerSteps },
        { name: 'Log Strips', sort_order: 1, steps: stripSteps },
      )

    } else if (options.construction === 'corner_to_corner') {
      // C2C: increase from corner, work diagonal, decrease to opposite corner
      const maxSts = cmToStitches(Math.max(widthCm, heightCm), gauge)
      const c2cMax = nearestDivisible(maxSts, 2)

      const steps: StepBlueprint[] = []
      steps.push(step(
        `Cast on 2 stitches on ${needleMm}mm needles`,
        { stitch_count: 2, row_type: 'setup', rows_in_step: 1 },
      ))
      steps.push(step(
        `Increase section: Knit to last st, kfb (1 st inc'd each row). Repeat until you have ${c2cMax} stitches.`,
        {
          stitch_count: c2cMax,
          row_type: 'repeat',
          rows_in_step: c2cMax - 2,
          is_repeat: true,
          repeat_count: c2cMax - 2,
          rows_per_repeat: 1,
          math_notes: `Increase from 2 to ${c2cMax} sts`,
        },
      ))
      steps.push(step(
        `Work even in ${options.stitch_pattern.replace('_', ' ')} for ${cmToRows(Math.abs(widthCm - heightCm), gauge)} rows to create rectangular shape (skip if square)`,
        { stitch_count: c2cMax, row_type: 'work_rows', rows_in_step: cmToRows(Math.abs(widthCm - heightCm), gauge) },
      ))
      steps.push(step(
        'Decrease section: K1, ssk, knit to end (1 st dec\'d each row). Repeat until 2 sts remain. Bind off.',
        { stitch_count: 0, row_type: 'finishing', rows_in_step: c2cMax - 2 },
      ))
      allSections.push({ name: 'Blanket', sort_order: 0, steps })

    } else {
      // Strips
      const stripWidthCm = 20
      const numStrips = Math.ceil(widthCm / stripWidthCm)
      let stripCastOn = cmToStitches(stripWidthCm, gauge)
      stripCastOn = nearestDivisible(stripCastOn, div)

      const stripSteps: StepBlueprint[] = []
      resetSteps()
      stripSteps.push(step(
        `Cast on ${stripCastOn} stitches on ${needleMm}mm needles`,
        { stitch_count: stripCastOn, row_type: 'setup', rows_in_step: 1 },
      ))
      stripSteps.push(step(
        `Work in ${options.stitch_pattern.replace('_', ' ')} until strip measures ${heightCm}cm`,
        { stitch_count: stripCastOn, row_type: 'work_to_measurement', target_measurement_cm: heightCm },
      ))
      stripSteps.push(step('Bind off all stitches', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))

      const asmSteps: StepBlueprint[] = []
      resetSteps()
      asmSteps.push(step(
        `Seam ${numStrips} strips together using mattress stitch`,
        { row_type: 'finishing', rows_in_step: 1 },
      ))
      allSections.push(
        { name: `Strip (make ${numStrips})`, sort_order: 0, steps: stripSteps },
        { name: 'Assembly', sort_order: 1, steps: asmSteps },
      )
    }

    // Add border section if requested
    const borderSteps = buildBlanketBorder(border, cmToStitches(widthCm, gauge), needleMm)
    if (borderSteps) {
      allSections.push({ name: 'Border', sort_order: allSections.length, steps: borderSteps })
    }

    // Final finishing
    const finSteps: StepBlueprint[] = []
    resetSteps()
    finSteps.push(step('Block to measurements, weave in all ends.', {
      row_type: 'finishing', rows_in_step: 1,
    }))
    allSections.push({ name: 'Finishing', sort_order: allSections.length, steps: finSteps })

    sectionsPerSize[size.name] = allSections
  }

  const difficultyMap: Record<string, string> = {
    single_piece: 'beginner', strips: 'beginner', modular_squares: 'easy',
    mitered_squares: 'intermediate', log_cabin: 'easy', corner_to_corner: 'easy',
  }

  return {
    title_suggestion: 'Handknit Blanket',
    difficulty: difficultyMap[options.construction] ?? 'easy',
    garment_type: 'blanket',
    gauge,
    needle_size_mm: needleMm,
    ribbing_needle_mm: ribbingNeedleMm,
    yarn_weight: 'worsted' as YarnWeight,
    sizes,
    sections_per_size: sectionsPerSize,
  }
}

// ─── Hat ────────────────────────────────────────────────────────────────────

/** Extra height multiplier by hat style */
const HAT_STYLE_DEPTH: Record<string, number> = {
  beanie: 1.0,
  watch_cap: 0.85,   // shorter, snugger
  slouchy: 1.35,     // extra depth for slouch
  beret: 1.15,       // slightly taller before decrease
}

export function buildHatBlueprint(
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: HatOptions,
): PatternBlueprint {
  const ribbingNeedleMm = Math.max(2, needleMm - 0.5)
  const sectionsPerSize: Record<string, SectionBlueprint[]> = {}

  const crownSections = options.crown_style === 'wedge_6' ? 6
    : options.crown_style === 'wedge_10' ? 10
    : options.crown_style === 'gathered' ? 1
    : options.crown_style === 'spiral' ? 6
    : 8 // wedge_8 default

  const hatStyle = options.hat_style ?? 'beanie'
  const styleDepthMult = HAT_STYLE_DEPTH[hatStyle] ?? 1.0
  const isBeret = hatStyle === 'beret'

  for (const size of sizes) {
    resetSteps()

    const headCirc = size.measurements.head_circumference_cm
    const hatCirc = headCirc * 0.90 // negative ease

    // Beret: needs wider body then decreases back to head circ
    const beretBodyCirc = isBeret ? headCirc * 1.25 : hatCirc

    // Divisibility: cast-on must be divisible by lcm(ribbing_divisor, crown_sections)
    const ribDiv = options.brim_style === 'no_brim' || options.brim_style === 'picot'
      ? 2 : ribbingDivisor(options.brim_style)
    const requiredDiv = options.crown_style === 'gathered' ? Math.max(ribDiv, 2) : lcm(ribDiv, crownSections)
    let castOn = cmToStitches(hatCirc, gauge)
    castOn = nearestDivisible(castOn, requiredDiv)
    if (castOn < requiredDiv) castOn = requiredDiv

    // Beret body stitch count (wider than brim)
    let beretBodySts = castOn
    if (isBeret) {
      beretBodySts = nearestDivisible(cmToStitches(beretBodyCirc, gauge), requiredDiv)
    }
    const bodySts = isBeret ? beretBodySts : castOn

    // Heights
    const baseHeight = headCirc * 0.75
    const totalHeight = baseHeight * styleDepthMult
    const brimDepth = options.brim_style === 'folded_rib' ? 5
      : options.brim_style === 'no_brim' ? 0
      : options.brim_style === 'picot' ? 3
      : 2.5
    const crownInfo = options.crown_style === 'gathered'
      ? { decrease_rounds: 2, final_sts: 0, depth_cm: rowsToCm(2, gauge) }
      : calculateDecreaseSchedule(bodySts, crownSections, gauge)
    const bodyDepth = Math.max(1, totalHeight - brimDepth - crownInfo.depth_cm)

    const sections: SectionBlueprint[] = []
    let sortIdx = 0

    // ── Brim ──
    if (options.brim_style !== 'no_brim') {
      const brimSteps: StepBlueprint[] = []
      resetSteps()

      brimSteps.push(step(
        `Cast on ${castOn} stitches on ${ribbingNeedleMm}mm needles, join in the round`,
        { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
      ))

      const brimRows = cmToRows(brimDepth, gauge)
      if (options.brim_style === 'picot') {
        const halfRows = Math.floor(brimRows / 2)
        brimSteps.push(step(
          `Work ${halfRows} rounds in stockinette`,
          { stitch_count: castOn, row_type: 'work_rows', rows_in_step: halfRows },
        ))
        brimSteps.push(step(
          'Picot round: *YO, k2tog* around',
          { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1, math_notes: 'Creates fold line for picot edge' },
        ))
        brimSteps.push(step(
          `Work ${halfRows} rounds in stockinette, then fold at picot line and knit together with cast-on edge`,
          { stitch_count: castOn, row_type: 'work_rows', rows_in_step: halfRows, math_notes: 'Join hem for clean picot edge' },
        ))
      } else {
        const brimDesc = options.brim_style === 'rolled_stockinette'
          ? `Work ${brimRows} rounds in stockinette (rolled edge)`
          : options.brim_style === 'garter'
            ? `Work ${brimRows} rounds in garter stitch (alternate knit and purl rounds)`
            : options.brim_style === 'seed'
              ? `Work ${brimRows} rounds in seed stitch`
              : `Work ${brimRows} rounds in ${options.brim_style.replace('_', ' ')}`

        brimSteps.push(step(brimDesc, {
          stitch_count: castOn,
          row_type: 'work_rows',
          rows_in_step: brimRows,
          math_notes: `${brimDepth}cm of brim`,
        }))
      }

      // Switch to body needles (except for patterns that stay on same size)
      const noNeedleSwitch = ['rolled_stockinette', 'garter', 'seed']
      if (!noNeedleSwitch.includes(options.brim_style)) {
        brimSteps.push(step(
          `Switch to ${needleMm}mm needles`,
          { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
        ))
      }

      sections.push({ name: 'Brim', sort_order: sortIdx++, steps: brimSteps })
    } else {
      // No brim — cast on directly on body needles
      const setupSteps: StepBlueprint[] = []
      resetSteps()
      setupSteps.push(step(
        `Cast on ${castOn} stitches on ${needleMm}mm needles, join in the round`,
        { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
      ))
      sections.push({ name: 'Cast On', sort_order: sortIdx++, steps: setupSteps })
    }

    // ── Beret increase section ──
    if (isBeret && beretBodySts > castOn) {
      const incSteps: StepBlueprint[] = []
      resetSteps()
      const incsNeeded = beretBodySts - castOn
      incSteps.push(step(
        `Increase round: *K${Math.floor(castOn / incsNeeded)}, M1L* ${incsNeeded} times (${beretBodySts} sts)`,
        { stitch_count: beretBodySts, row_type: 'work_rows', rows_in_step: 1, math_notes: `Increase from ${castOn} to ${beretBodySts} for beret fullness` },
      ))
      sections.push({ name: 'Beret Increases', sort_order: sortIdx++, steps: incSteps })
    }

    // ── Body ──
    const bodySteps: StepBlueprint[] = []
    resetSteps()

    const bodyDesc = options.body_stitch === 'cables'
      ? 'Work in stockinette with cable panels'
      : `Work in ${options.body_stitch.replace('_', ' ')}`

    bodySteps.push(step(
      `${bodyDesc} until piece measures ${Math.round(brimDepth + bodyDepth)}cm from cast-on edge`,
      {
        stitch_count: bodySts,
        row_type: 'work_to_measurement',
        target_measurement_cm: Math.round((brimDepth + bodyDepth) * 10) / 10,
        math_notes: `~${cmToRows(bodyDepth, gauge)} rounds of body`,
      },
    ))

    sections.push({ name: 'Body', sort_order: sortIdx++, steps: bodySteps })

    // ── Crown ──
    const crownSteps: StepBlueprint[] = []
    resetSteps()

    if (options.crown_style === 'gathered') {
      crownSteps.push(step(
        `*K2tog* around (${Math.floor(bodySts / 2)} sts remain)`,
        { stitch_count: Math.floor(bodySts / 2), row_type: 'work_rows', rows_in_step: 1 },
      ))
      crownSteps.push(step(
        'Break yarn, thread through remaining stitches, pull tight',
        { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
      ))
    } else if (options.crown_style === 'spiral') {
      // Spiral crown: decrease without plain rounds (continuous spiral)
      let currentSts = bodySts
      const decPerRound = crownSections
      const totalDecRounds = Math.floor((currentSts - decPerRound * 2) / decPerRound)
      currentSts -= totalDecRounds * decPerRound

      crownSteps.push(step(
        `Spiral decrease: *k${Math.floor(bodySts / crownSections) - 2}, k2tog* around. Repeat every round (no plain rounds between) ${totalDecRounds} times.`,
        {
          stitch_count: currentSts,
          row_type: 'repeat',
          rows_in_step: totalDecRounds,
          is_repeat: true,
          repeat_count: totalDecRounds,
          rows_per_repeat: 1,
          math_notes: `Spiral creates swirl pattern. ${currentSts} sts remain.`,
        },
      ))
      crownSteps.push(step(
        `Break yarn, thread through remaining ${currentSts} stitches, pull tight`,
        { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
      ))
    } else {
      // Wedge crown (6, 8, or 10 sections)
      let currentSts = bodySts

      while (currentSts > crownSections * 2) {
        const stsBeforeDec = Math.floor(currentSts / crownSections) - 2
        currentSts -= crownSections

        crownSteps.push(step(
          `Decrease round: *k${stsBeforeDec}, k2tog* ${crownSections} times`,
          {
            stitch_count: currentSts,
            row_type: 'work_rows',
            rows_in_step: 1,
            math_notes: `${currentSts} sts remain`,
          },
        ))

        if (currentSts > crownSections * 3) {
          crownSteps.push(step(
            'Knit 1 round plain',
            { stitch_count: currentSts, row_type: 'work_rows', rows_in_step: 1 },
          ))
        }
      }

      crownSteps.push(step(
        `Break yarn, thread through remaining ${currentSts} stitches, pull tight`,
        { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
      ))
    }

    sections.push({ name: 'Crown Decreases', sort_order: sortIdx++, steps: crownSteps })

    // ── Ear Flaps (optional) ──
    if (options.ear_flaps) {
      const flapSteps: StepBlueprint[] = []
      resetSteps()
      const flapSts = nearestDivisible(Math.round(castOn * 0.20), 2) // ~20% of cast-on per flap
      const flapRows = cmToRows(7, gauge) // ~7cm long

      flapSteps.push(step(
        `Mark ear flap positions: count ${flapSts} stitches centered over each ear (skip front and back center)`,
        { stitch_count: flapSts, row_type: 'setup', rows_in_step: 1 },
      ))
      flapSteps.push(step(
        `Pick up ${flapSts} stitches along cast-on edge at first ear position. Work back and forth in garter stitch, decreasing 1 st each side every 2 rows until 3-5 sts remain.`,
        {
          stitch_count: 3,
          row_type: 'repeat',
          rows_in_step: flapRows,
          is_repeat: true,
          repeat_count: Math.floor((flapSts - 3) / 2),
          rows_per_repeat: 2,
          math_notes: `Triangular flap from ${flapSts} sts`,
        },
      ))
      flapSteps.push(step(
        'Work 3-stitch i-cord for 20cm for tie. Bind off. Repeat for second ear flap.',
        { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
      ))
      sections.push({ name: 'Ear Flaps (make 2)', sort_order: sortIdx++, steps: flapSteps })
    }

    // ── Finishing ──
    const finishSteps: StepBlueprint[] = []
    resetSteps()
    const finishDesc = options.double_layered
      ? 'Weave in all ends. Make a second identical hat and sew the two together WS facing for double layer. Block if desired.'
      : 'Weave in all ends. Block if desired.'
    finishSteps.push(step(finishDesc, {
      row_type: 'finishing', rows_in_step: 1,
    }))
    sections.push({ name: 'Finishing', sort_order: sortIdx++, steps: finishSteps })

    sectionsPerSize[size.name] = sections
  }

  const titleMap: Record<string, string> = {
    beanie: 'Classic Beanie',
    slouchy: 'Slouchy Hat',
    beret: 'Knit Beret',
    watch_cap: 'Watch Cap',
  }
  const difficulty = options.body_stitch === 'cables' ? 'intermediate'
    : isBeret || options.ear_flaps ? 'easy'
    : 'beginner'

  return {
    title_suggestion: titleMap[hatStyle] ?? 'Classic Knit Hat',
    difficulty,
    garment_type: 'hat',
    gauge,
    needle_size_mm: needleMm,
    ribbing_needle_mm: ribbingNeedleMm,
    yarn_weight: 'worsted' as YarnWeight,
    sizes,
    sections_per_size: sectionsPerSize,
  }
}

// ─── Mittens ────────────────────────────────────────────────────────────────

export function buildMittenBlueprint(
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: MittenOptions,
): PatternBlueprint {
  const ribbingNeedleMm = Math.max(2, needleMm - 0.5)
  const sectionsPerSize: Record<string, SectionBlueprint[]> = {}
  const thumbConstruction = options.thumb_construction ?? 'gusset'
  const topShaping = options.top_shaping ?? 'rounded'
  const isFingerless = options.style === 'fingerless'
  const isConvertible = options.style === 'convertible'

  for (const size of sizes) {
    const handCirc = size.measurements.hand_circumference_cm
    const handLength = size.measurements.hand_length_cm ?? handCirc * 1.1
    const thumbLength = size.measurements.thumb_length_cm ?? handCirc * 0.3

    let castOn = cmToStitches(handCirc, gauge)
    castOn = nearestDivisible(castOn, 4)
    if (castOn < 4) castOn = 4

    const sections: SectionBlueprint[] = []
    let sortIdx = 0

    // ── Cuff ──
    const cuffSteps: StepBlueprint[] = []
    resetSteps()
    const cuffDepth = handCirc >= 18 ? 7 : 5
    const cuffRows = cmToRows(cuffDepth, gauge)

    cuffSteps.push(step(
      `Cast on ${castOn} stitches on ${ribbingNeedleMm}mm DPNs, join in the round`,
      { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
    ))
    cuffSteps.push(step(
      `Work ${cuffRows} rounds in ${options.cuff_ribbing.replace('_', ' ')}`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: cuffRows, math_notes: `${cuffDepth}cm cuff` },
    ))
    cuffSteps.push(step(
      `Switch to ${needleMm}mm needles`,
      { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
    ))
    sections.push({ name: 'Cuff', sort_order: sortIdx++, steps: cuffSteps })

    // ── Thumb construction ──
    const thumbStsRaw = Math.round(castOn * 0.30)
    const thumbGussetSts = thumbStsRaw % 2 === 0 ? thumbStsRaw : thumbStsRaw + 1

    if (thumbConstruction === 'gusset') {
      const thumbSteps: StepBlueprint[] = []
      resetSteps()
      const gussetIncreaseRounds = thumbGussetSts / 2

      thumbSteps.push(step(
        `Place thumb gusset marker, M1L, k1, M1R, place marker, knit to end`,
        { stitch_count: castOn + 2, row_type: 'work_rows', rows_in_step: 1, math_notes: '3 gusset sts' },
      ))
      thumbSteps.push(step(
        `Alternate: Rnd 1: Knit plain. Rnd 2: SM, M1L, knit to marker, M1R, SM, knit to end. Repeat ${gussetIncreaseRounds - 1} more times.`,
        {
          stitch_count: castOn + thumbGussetSts,
          row_type: 'repeat',
          rows_in_step: (gussetIncreaseRounds - 1) * 2,
          is_repeat: true,
          repeat_count: gussetIncreaseRounds - 1,
          rows_per_repeat: 2,
          math_notes: `${thumbGussetSts + 1} gusset sts total`,
        },
      ))
      thumbSteps.push(step(
        `Place ${thumbGussetSts + 1} gusset stitches on waste yarn, cast on 1 stitch over gap`,
        { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
      ))
      sections.push({ name: 'Thumb Gusset', sort_order: sortIdx++, steps: thumbSteps })

    } else if (thumbConstruction === 'afterthought') {
      const athSteps: StepBlueprint[] = []
      resetSteps()
      const athSts = thumbGussetSts
      athSteps.push(step(
        `When hand measures ${Math.round(cuffDepth + 2)}cm from cuff, knit ${athSts} stitches with waste yarn for afterthought thumb placement. Slip those stitches back to left needle and knit them again with working yarn.`,
        { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1, math_notes: `${athSts} waste yarn sts mark thumb opening` },
      ))
      sections.push({ name: 'Thumb Placement', sort_order: sortIdx++, steps: athSteps })

    } else {
      // Peasant thumb: simple slit
      const peasantSteps: StepBlueprint[] = []
      resetSteps()
      const peasantSts = thumbGussetSts
      peasantSteps.push(step(
        `When hand measures ${Math.round(cuffDepth + 2)}cm from cuff, bind off ${peasantSts} stitches for thumb opening. On next round, cast on ${peasantSts} stitches over the gap.`,
        { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 2, math_notes: 'Creates simple thumb hole' },
      ))
      sections.push({ name: 'Thumb Opening', sort_order: sortIdx++, steps: peasantSteps })
    }

    // ── Hand ──
    const handSteps: StepBlueprint[] = []
    resetSteps()
    const handAboveThumb = (isFingerless || isConvertible)
      ? Math.max(1, handLength * 0.3)
      : Math.max(1, handLength - cuffDepth - thumbLength - 2.5)

    if (isFingerless) {
      handSteps.push(step(
        `Work in stockinette until hand measures ${Math.round(handAboveThumb)}cm above thumb opening`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: Math.round(handAboveThumb * 10) / 10 },
      ))
      handSteps.push(step(
        `Work 4 rounds in ${options.cuff_ribbing.replace('_', ' ')}`,
        { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 4 },
      ))
      handSteps.push(step('Bind off loosely in pattern', {
        stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
      }))
    } else if (isConvertible) {
      // Convertible: work to just above knuckles, then split for flap
      handSteps.push(step(
        `Work in stockinette until hand measures ${Math.round(handAboveThumb)}cm above thumb opening (just above knuckles)`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: Math.round(handAboveThumb * 10) / 10 },
      ))
      handSteps.push(step(
        `Work 4 rounds in ${options.cuff_ribbing.replace('_', ' ')} for fold-back ribbing at flap hinge`,
        { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 4, math_notes: 'This ribbing is where the flap folds back' },
      ))
    } else {
      handSteps.push(step(
        `Work in stockinette until hand measures ${Math.round(handLength - 2.5)}cm from cuff`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: Math.round((handLength - 2.5) * 10) / 10 },
      ))
    }
    sections.push({ name: 'Hand', sort_order: sortIdx++, steps: handSteps })

    // ── Convertible flap ──
    if (isConvertible) {
      const flapSteps: StepBlueprint[] = []
      resetSteps()
      const flapLength = Math.max(3, handLength - handAboveThumb - cuffDepth - 2.5)
      flapSteps.push(step(
        `Continue in stockinette for ${Math.round(flapLength)}cm for mitten flap`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: Math.round(flapLength) },
      ))
      // Top decreases for flap
      flapSteps.push(step(
        'Shape flap top: decrease 4 sts every round until 8 sts remain. Break yarn, thread through.',
        { stitch_count: 0, row_type: 'work_rows', rows_in_step: null, math_notes: 'Same shaping as full mitten top' },
      ))
      flapSteps.push(step(
        'Sew a button on the back of the hand. Add a button loop to the flap tip so flap folds back and buttons open.',
        { row_type: 'finishing', rows_in_step: 1 },
      ))
      sections.push({ name: 'Convertible Flap', sort_order: sortIdx++, steps: flapSteps })
    }

    // ── Top decreases (full mittens only) ──
    if (options.style === 'full_mitten') {
      const decSteps: StepBlueprint[] = []
      resetSteps()

      if (topShaping === 'pointed') {
        // Pointed: decrease 4 sts every round (faster taper)
        let sts = castOn
        const totalDecRounds = Math.floor((sts - 4) / 4)
        sts = sts - totalDecRounds * 4
        decSteps.push(step(
          `Decrease round: *k1, ssk, knit to 3 sts before marker, k2tog, k1* twice (4 sts dec'd). Repeat every round ${totalDecRounds} times.`,
          {
            stitch_count: sts,
            row_type: 'repeat',
            rows_in_step: totalDecRounds,
            is_repeat: true,
            repeat_count: totalDecRounds,
            rows_per_repeat: 1,
            math_notes: `Pointed top, ${sts} sts remain`,
          },
        ))
        decSteps.push(step(
          `Graft remaining ${sts} stitches with Kitchener stitch`,
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      } else if (topShaping === 'gathered') {
        decSteps.push(step(
          `*K2tog* around (${Math.floor(castOn / 2)} sts remain)`,
          { stitch_count: Math.floor(castOn / 2), row_type: 'work_rows', rows_in_step: 1 },
        ))
        decSteps.push(step(
          'Break yarn, thread through remaining stitches, pull tight',
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      } else {
        // Rounded (default): alternate decrease round with plain round
        let sts = castOn
        while (sts > 8) {
          const half = sts / 2
          const stsBeforeDec = Math.floor(half) - 2
          sts -= 4
          decSteps.push(step(
            `Decrease round: *k1, ssk, k${stsBeforeDec}, k2tog, k1* twice`,
            { stitch_count: sts, row_type: 'work_rows', rows_in_step: 1, math_notes: `${sts} sts remain` },
          ))
          if (sts > 12) {
            decSteps.push(step('Knit 1 round plain', {
              stitch_count: sts, row_type: 'work_rows', rows_in_step: 1,
            }))
          }
        }
        decSteps.push(step(
          `Graft remaining ${sts} stitches together with Kitchener stitch`,
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      }

      sections.push({ name: 'Top Decreases', sort_order: sortIdx++, steps: decSteps })
    }

    // ── Thumb ──
    const thumbFinishSteps: StepBlueprint[] = []
    resetSteps()

    if (thumbConstruction === 'gusset') {
      const thumbTotalSts = thumbGussetSts + 2
      const thumbEvenSts = nearestDivisible(thumbTotalSts, 2)

      thumbFinishSteps.push(step(
        `Place ${thumbGussetSts + 1} held thumb stitches on ${needleMm}mm DPNs, pick up 1-2 stitches at gap (${thumbEvenSts} sts)`,
        { stitch_count: thumbEvenSts, row_type: 'setup', rows_in_step: 1 },
      ))

      if (isFingerless || isConvertible) {
        thumbFinishSteps.push(step(
          'Work 4 rounds in stockinette. Bind off loosely.',
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      } else {
        const thumbRows = cmToRows(thumbLength, gauge)
        thumbFinishSteps.push(step(
          `Work ${thumbRows} rounds in stockinette`,
          { stitch_count: thumbEvenSts, row_type: 'work_rows', rows_in_step: thumbRows, math_notes: `${thumbLength}cm` },
        ))
        thumbFinishSteps.push(step(
          '*K2tog* around, break yarn, thread through remaining stitches',
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      }
    } else if (thumbConstruction === 'afterthought') {
      const athSts = thumbGussetSts
      const athTotalSts = athSts * 2 + 2 // top and bottom of opening + corners
      const athEvenSts = nearestDivisible(athTotalSts, 2)

      thumbFinishSteps.push(step(
        `Carefully remove waste yarn from afterthought thumb. Place ${athSts} live stitches from top and ${athSts} from bottom on ${needleMm}mm DPNs, pick up 1 st at each corner (${athEvenSts} sts).`,
        { stitch_count: athEvenSts, row_type: 'setup', rows_in_step: 1 },
      ))
      if (isFingerless || isConvertible) {
        thumbFinishSteps.push(step('Work 4 rounds, bind off loosely', {
          stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
        }))
      } else {
        thumbFinishSteps.push(step(
          `Work until thumb measures ${thumbLength}cm. *K2tog* around, close top.`,
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      }
    } else {
      // Peasant thumb
      const thumbSts = Math.round(castOn * 0.25)
      const peasantTotal = nearestDivisible(thumbSts * 2, 2) // pick up around opening
      thumbFinishSteps.push(step(
        `Pick up ${peasantTotal} stitches around thumb opening on ${needleMm}mm DPNs`,
        { stitch_count: peasantTotal, row_type: 'setup', rows_in_step: 1 },
      ))
      if (isFingerless || isConvertible) {
        thumbFinishSteps.push(step('Work 4 rounds, bind off loosely', {
          stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
        }))
      } else {
        thumbFinishSteps.push(step(
          `Work until thumb measures ${thumbLength}cm. *K2tog* around, close top.`,
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
      }
    }

    sections.push({ name: 'Thumb', sort_order: sortIdx++, steps: thumbFinishSteps })

    // ── Finishing ──
    const finishSteps: StepBlueprint[] = []
    resetSteps()
    finishSteps.push(step('Weave in all ends. Make second mitten.', {
      row_type: 'finishing', rows_in_step: 1,
    }))
    sections.push({ name: 'Finishing', sort_order: sortIdx++, steps: finishSteps })

    sectionsPerSize[size.name] = sections
  }

  const titleMap: Record<string, string> = {
    full_mitten: 'Classic Mittens',
    fingerless: 'Fingerless Mitts',
    convertible: 'Convertible Mittens',
  }

  return {
    title_suggestion: titleMap[options.style] ?? 'Classic Mittens',
    difficulty: thumbConstruction === 'gusset' || isConvertible ? 'easy' : 'beginner',
    garment_type: options.style === 'fingerless' ? 'fingerless mitts' : 'mittens',
    gauge,
    needle_size_mm: needleMm,
    ribbing_needle_mm: ribbingNeedleMm,
    yarn_weight: 'worsted' as YarnWeight,
    sizes,
    sections_per_size: sectionsPerSize,
  }
}

// ─── Socks ──────────────────────────────────────────────────────────────────

/** Build cuff section for socks based on cuff_style */
function buildSockCuff(
  castOn: number,
  cuffStyle: string,
  needleMm: number,
  ribbingNeedleMm: number,
  gauge: Gauge,
  isToeUp: boolean,
): StepBlueprint[] {
  const cuffSteps: StepBlueprint[] = []
  resetSteps()
  const cuffRows = cmToRows(2.5, gauge)

  if (isToeUp) {
    cuffSteps.push(step(`Switch to ${ribbingNeedleMm}mm needles`, {
      stitch_count: castOn, row_type: 'setup', rows_in_step: 1,
    }))
  } else {
    cuffSteps.push(step(
      `Cast on ${castOn} stitches on ${ribbingNeedleMm}mm DPNs, join in the round`,
      { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
    ))
  }

  if (cuffStyle === 'folded') {
    const halfRows = Math.floor(cuffRows / 2) + 2
    cuffSteps.push(step(
      `Work ${halfRows} rounds in stockinette`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: halfRows },
    ))
    cuffSteps.push(step('Purl 1 round (fold line)', {
      stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1,
    }))
    cuffSteps.push(step(
      `Work ${halfRows} rounds in stockinette. Fold at purl ridge and knit together with cast-on edge.`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: halfRows, math_notes: 'Creates clean folded cuff' },
    ))
  } else if (cuffStyle === 'picot') {
    const halfRows = Math.floor(cuffRows / 2) + 2
    cuffSteps.push(step(
      `Work ${halfRows} rounds in stockinette`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: halfRows },
    ))
    cuffSteps.push(step('Picot round: *YO, k2tog* around', {
      stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1,
    }))
    cuffSteps.push(step(
      `Work ${halfRows} rounds in stockinette. Fold at picot line and knit together.`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: halfRows },
    ))
  } else if (cuffStyle === 'rolled') {
    cuffSteps.push(step(
      `Work ${cuffRows + 4} rounds in stockinette (edge will naturally roll)`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: cuffRows + 4 },
    ))
  } else {
    // rib_1x1 or rib_2x2
    cuffSteps.push(step(
      `Work ${cuffRows} rounds in ${cuffStyle.replace('_', ' ')}`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: cuffRows },
    ))
  }

  if (isToeUp) {
    cuffSteps.push(step('Bind off loosely in pattern', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  } else {
    cuffSteps.push(step(`Switch to ${needleMm}mm needles`, {
      stitch_count: castOn, row_type: 'setup', rows_in_step: 1,
    }))
  }

  return cuffSteps
}

/** Build heel section based on heel_type for cuff-down socks */
function buildCuffDownHeel(
  castOn: number,
  heelType: string,
  gauge: Gauge,
): { heelSections: SectionBlueprint[]; sortStart: number } {
  const heelSts = castOn / 2
  const sections: SectionBlueprint[] = []

  if (heelType === 'heel_flap_gusset') {
    const heelSteps: StepBlueprint[] = []
    resetSteps()
    const heelRows = heelSts
    heelSteps.push(step(
      `Work heel flap back and forth over ${heelSts} stitches`,
      { stitch_count: heelSts, row_type: 'setup', rows_in_step: 1 },
    ))
    heelSteps.push(step(
      `RS: *Sl1, k1* across. WS: Sl1, purl to end. Repeat for ${heelRows} rows.`,
      {
        stitch_count: heelSts,
        row_type: 'repeat',
        rows_in_step: heelRows,
        is_repeat: true,
        repeat_count: heelRows / 2,
        rows_per_repeat: 2,
        math_notes: 'Slipped stitches create a reinforced fabric',
      },
    ))
    sections.push({ name: 'Heel Flap', sort_order: 2, steps: heelSteps })

    // Heel Turn
    const turnSteps: StepBlueprint[] = []
    resetSteps()
    const thirdSts = Math.floor(heelSts / 3)
    turnSteps.push(step(
      `RS: Sl1, k${thirdSts + thirdSts - 1}, ssk, k1, turn`,
      { stitch_count: null, row_type: 'work_rows', rows_in_step: 1 },
    ))
    turnSteps.push(step(
      `WS: Sl1, p${Math.max(1, thirdSts - 1)}, p2tog, p1, turn`,
      { stitch_count: null, row_type: 'work_rows', rows_in_step: 1 },
    ))
    turnSteps.push(step(
      'Continue short rows, working 1 more stitch before decrease each row, until all heel stitches are worked',
      { stitch_count: thirdSts + 2, row_type: 'work_rows', rows_in_step: Math.max(2, (heelSts - thirdSts * 2) * 2), math_notes: `~${thirdSts + 2} heel sts remain` },
    ))
    sections.push({ name: 'Heel Turn', sort_order: 3, steps: turnSteps })

    // Gusset
    const gussetSteps: StepBlueprint[] = []
    resetSteps()
    const pickUpPerSide = Math.floor(heelRows / 2)
    const gussetTotalSts = (thirdSts + 2) + pickUpPerSide * 2 + (castOn / 2)
    gussetSteps.push(step(
      `Pick up and knit ${pickUpPerSide} stitches along left side of heel flap, knit across ${castOn / 2} instep stitches, pick up and knit ${pickUpPerSide} stitches along right side`,
      { stitch_count: gussetTotalSts, row_type: 'setup', rows_in_step: 1 },
    ))
    const gussetDecreaseRounds = Math.floor((gussetTotalSts - castOn) / 2)
    gussetSteps.push(step(
      `Rnd 1: Knit to 3 sts before instep, k2tog, k1. Knit instep. K1, ssk, knit to end.\nRnd 2: Knit plain.\nRepeat ${gussetDecreaseRounds} times.`,
      {
        stitch_count: castOn,
        row_type: 'repeat',
        rows_in_step: gussetDecreaseRounds * 2,
        is_repeat: true,
        repeat_count: gussetDecreaseRounds,
        rows_per_repeat: 2,
        math_notes: `Back to ${castOn} sts`,
      },
    ))
    sections.push({ name: 'Gusset', sort_order: 4, steps: gussetSteps })

  } else if (heelType === 'afterthought') {
    const heelSteps: StepBlueprint[] = []
    resetSteps()
    heelSteps.push(step(
      `Knit ${heelSts} stitches with waste yarn for afterthought heel placement. Slip them back and knit again with working yarn. Continue in the round.`,
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1, math_notes: 'Heel worked later by removing waste yarn' },
    ))
    sections.push({ name: 'Heel Placement', sort_order: 2, steps: heelSteps })

  } else if (heelType === 'fish_lips_kiss') {
    const heelSteps: StepBlueprint[] = []
    resetSteps()
    const flkSts = heelSts
    heelSteps.push(step(
      `Work Fish Lips Kiss heel over ${flkSts} stitches (worked back and forth)`,
      { stitch_count: flkSts, row_type: 'setup', rows_in_step: 1 },
    ))
    heelSteps.push(step(
      'RS: Knit to last st, w&t. WS: Purl to last st, w&t. Continue wrapping 1 fewer st each side until center third remains unwrapped.',
      { stitch_count: flkSts, row_type: 'work_rows', rows_in_step: Math.floor(flkSts / 3) * 2, math_notes: 'FLK: short-row narrowing' },
    ))
    heelSteps.push(step(
      'Knit across all heel sts picking up wraps, continue in the round.',
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1, math_notes: 'No gusset needed' },
    ))
    sections.push({ name: 'Fish Lips Kiss Heel', sort_order: 2, steps: heelSteps })

  } else {
    // short_row (default)
    const heelSteps: StepBlueprint[] = []
    resetSteps()
    const shortRowPairs = Math.floor(heelSts / 2) - 1
    heelSteps.push(step(
      'Work short-row heel over half the stitches',
      { stitch_count: heelSts, row_type: 'setup', rows_in_step: 1 },
    ))
    heelSteps.push(step(
      `First half: Knit to 1 st before end, w&t. Purl to 1 st before end, w&t. Continue, working 1 fewer st each time. (${shortRowPairs} pairs)`,
      { stitch_count: heelSts, row_type: 'work_rows', rows_in_step: shortRowPairs * 2, math_notes: 'Narrowing phase' },
    ))
    heelSteps.push(step(
      'Second half: Knit to first wrapped st, knit wrap together with st, w&t. Continue until all wraps are worked.',
      { stitch_count: castOn, row_type: 'work_rows', rows_in_step: shortRowPairs * 2, math_notes: 'Widening phase' },
    ))
    sections.push({ name: 'Short Row Heel', sort_order: 2, steps: heelSteps })
  }

  return { heelSections: sections, sortStart: 2 }
}

/** Build toe section based on toe_type */
function buildSockToe(
  castOn: number,
  toeType: string,
  toeFinish: string,
): StepBlueprint[] {
  const toeSteps: StepBlueprint[] = []
  resetSteps()

  if (toeType === 'wedge') {
    toeSteps.push(step(
      `Set up: Place markers at sides (${castOn / 2} sts on top, ${castOn / 2} on bottom)`,
      { stitch_count: castOn, row_type: 'setup', rows_in_step: 1 },
    ))
    const totalDecRounds = Math.floor((castOn - 8) / 4)
    toeSteps.push(step(
      `Decrease round: *K1, ssk, knit to 3 sts before marker, k2tog, k1* twice (4 sts dec'd).\nKnit 1 round plain.\nRepeat ${totalDecRounds} times.`,
      {
        stitch_count: 8,
        row_type: 'repeat',
        rows_in_step: totalDecRounds * 2,
        is_repeat: true,
        repeat_count: totalDecRounds,
        rows_per_repeat: 2,
        math_notes: '8 sts remain',
      },
    ))
  } else if (toeType === 'rounded') {
    // Rounded toe: decrease every round near the end for rounder shape
    const initialDecRounds = Math.floor((castOn - 20) / 4)
    const finalDecRounds = Math.floor((20 - 8) / 4)
    if (initialDecRounds > 0) {
      toeSteps.push(step(
        `Decrease round: *K1, ssk, knit to 3 before marker, k2tog, k1* twice.\nKnit 1 plain round.\nRepeat ${initialDecRounds} times.`,
        {
          stitch_count: 20,
          row_type: 'repeat',
          rows_in_step: initialDecRounds * 2,
          is_repeat: true,
          repeat_count: initialDecRounds,
          rows_per_repeat: 2,
          math_notes: `Gradual decrease to ~20 sts`,
        },
      ))
    }
    if (finalDecRounds > 0) {
      toeSteps.push(step(
        `Decrease round every round (no plain rounds) ${finalDecRounds} times for rounded tip`,
        {
          stitch_count: 8,
          row_type: 'repeat',
          rows_in_step: finalDecRounds,
          is_repeat: true,
          repeat_count: finalDecRounds,
          rows_per_repeat: 1,
          math_notes: '8 sts remain, rounded shape',
        },
      ))
    }
  } else {
    // Star toe
    const quarterSts = Math.floor(castOn / 4)
    toeSteps.push(step(
      `Place 4 markers evenly. Decrease round: *Knit to 2 sts before marker, k2tog* 4 times (4 sts dec'd).\nKnit 1 round plain.\nRepeat until 8 sts remain.`,
      {
        stitch_count: 8,
        row_type: 'repeat',
        rows_in_step: (quarterSts - 2) * 2,
        is_repeat: true,
        repeat_count: quarterSts - 2,
        rows_per_repeat: 2,
        math_notes: 'Star pattern: 4 evenly spaced decrease points',
      },
    ))
  }

  // Finish method
  const finishDesc = toeFinish === 'gathered'
    ? 'Break yarn, thread through remaining stitches, pull tight'
    : 'Graft remaining stitches with Kitchener stitch'
  toeSteps.push(step(finishDesc, {
    stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
  }))

  return toeSteps
}

export function buildSockBlueprint(
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: SockOptions,
): PatternBlueprint {
  const ribbingNeedleMm = Math.max(2, needleMm - 0.5)
  const sectionsPerSize: Record<string, SectionBlueprint[]> = {}
  const cuffStyle = options.cuff_style ?? 'rib_2x2'
  const toeFinish = options.toe_finish ?? 'kitchener'

  const LEG_LENGTHS: Record<string, number> = {
    no_show: 1,
    ankle: 5,
    crew: 15,
    mid_calf: 22,
    knee_high: 30,
  }

  for (const size of sizes) {
    const footCirc = size.measurements.foot_circumference_cm
    const footLength = size.measurements.foot_length_cm

    let castOn = cmToStitches(footCirc * 0.90, gauge) // negative ease
    castOn = nearestDivisible(castOn, 4)
    if (castOn < 8) castOn = 8

    const sections: SectionBlueprint[] = []
    const legLengthCm = LEG_LENGTHS[options.leg_length] ?? 15

    if (options.construction === 'cuff_down') {
      // Cuff
      const cuffSteps = buildSockCuff(castOn, cuffStyle, needleMm, ribbingNeedleMm, gauge, false)
      sections.push({ name: 'Cuff', sort_order: 0, steps: cuffSteps })

      // Leg
      const legSteps: StepBlueprint[] = []
      resetSteps()
      const legRows = cmToRows(legLengthCm, gauge)
      legSteps.push(step(
        `Work ${legRows} rounds in stockinette`,
        { stitch_count: castOn, row_type: 'work_rows', rows_in_step: legRows, math_notes: `${legLengthCm}cm leg` },
      ))
      sections.push({ name: 'Leg', sort_order: 1, steps: legSteps })

      // Heel
      const { heelSections } = buildCuffDownHeel(castOn, options.heel_type, gauge)
      sections.push(...heelSections)

      // Afterthought heel: work foot first, then pick up heel later
      const afterthoughtHeelFinish = options.heel_type === 'afterthought'

      // Foot
      const footSteps: StepBlueprint[] = []
      resetSteps()
      const footWorkCm = footLength - 5
      footSteps.push(step(
        `Work in stockinette until foot measures ${footWorkCm}cm from back of heel`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: footWorkCm },
      ))
      sections.push({ name: 'Foot', sort_order: 5, steps: footSteps })

      // Toe
      const toeSteps = buildSockToe(castOn, options.toe_type, toeFinish)
      sections.push({ name: 'Toe', sort_order: 6, steps: toeSteps })

      // Afterthought heel completion (done after toe)
      if (afterthoughtHeelFinish) {
        const athSteps: StepBlueprint[] = []
        resetSteps()
        const heelSts = castOn / 2
        const athTotal = heelSts * 2 + 2
        athSteps.push(step(
          `Remove waste yarn from heel placement. Place ${heelSts} live stitches from top and bottom on DPNs, pick up 1 st at each corner (${athTotal} sts).`,
          { stitch_count: athTotal, row_type: 'setup', rows_in_step: 1 },
        ))
        const athDecRounds = Math.floor((athTotal - castOn) / 2)
        if (athDecRounds > 0) {
          athSteps.push(step(
            `Decrease 2 sts at each corner every other round, ${athDecRounds} times (back to ${castOn} sts)`,
            { stitch_count: castOn, row_type: 'repeat', rows_in_step: athDecRounds * 2, is_repeat: true, repeat_count: athDecRounds, rows_per_repeat: 2 },
          ))
        }
        athSteps.push(step(
          `Work in stockinette until heel cup is deep enough. Shape bottom same as toe: decrease to 8 sts, ${toeFinish === 'gathered' ? 'gather' : 'Kitchener'}.`,
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
        sections.push({ name: 'Afterthought Heel', sort_order: 7, steps: athSteps })
      }

    } else {
      // ── Toe-up construction ──
      const toeSteps: StepBlueprint[] = []
      resetSteps()
      toeSteps.push(step(
        `Using Judy's Magic Cast-On, cast on 8 stitches (4 per needle)`,
        { stitch_count: 8, row_type: 'setup', rows_in_step: 1 },
      ))
      const toeIncRounds = Math.floor((castOn - 8) / 4)
      toeSteps.push(step(
        `Rnd 1: *K1, M1L, knit to 1 st before marker, M1R, k1* twice (4 sts inc'd).\nRnd 2: Knit plain.\nRepeat ${toeIncRounds} times.`,
        {
          stitch_count: castOn,
          row_type: 'repeat',
          rows_in_step: toeIncRounds * 2,
          is_repeat: true,
          repeat_count: toeIncRounds,
          rows_per_repeat: 2,
          math_notes: `${castOn} sts`,
        },
      ))
      sections.push({ name: 'Toe', sort_order: 0, steps: toeSteps })

      // Foot
      const footSteps: StepBlueprint[] = []
      resetSteps()
      const footWorkCm = footLength - 5
      footSteps.push(step(
        `Work in stockinette until foot measures ${footWorkCm}cm from toe`,
        { stitch_count: castOn, row_type: 'work_to_measurement', target_measurement_cm: footWorkCm },
      ))
      sections.push({ name: 'Foot', sort_order: 1, steps: footSteps })

      // Heel (toe-up heels are all short-row variants)
      const heelSteps: StepBlueprint[] = []
      resetSteps()
      const heelSts = castOn / 2
      const shortRowPairs = Math.floor(heelSts / 2) - 1

      if (options.heel_type === 'fish_lips_kiss') {
        heelSteps.push(step(
          `Work Fish Lips Kiss heel over ${heelSts} stitches (short-row method)`,
          { stitch_count: heelSts, row_type: 'setup', rows_in_step: 1 },
        ))
        heelSteps.push(step(
          'Short rows narrowing to center third, then widen back out, picking up wraps.',
          { stitch_count: castOn, row_type: 'work_rows', rows_in_step: shortRowPairs * 2, math_notes: 'FLK works toe-up or cuff-down' },
        ))
      } else if (options.heel_type === 'afterthought') {
        heelSteps.push(step(
          `Knit ${heelSts} stitches with waste yarn. Slip back and knit with working yarn. Heel worked after completing cuff.`,
          { stitch_count: castOn, row_type: 'work_rows', rows_in_step: 1 },
        ))
      } else {
        // short_row or heel_flap_gusset adapted to short-row for toe-up
        heelSteps.push(step(
          'Work short-row heel over half the stitches',
          { stitch_count: heelSts, row_type: 'setup', rows_in_step: 1 },
        ))
        heelSteps.push(step(
          `First half: Knit to 1 st before end, w&t. Continue ${shortRowPairs} pairs.`,
          { stitch_count: heelSts, row_type: 'work_rows', rows_in_step: shortRowPairs * 2 },
        ))
        heelSteps.push(step(
          'Second half: Work back out, picking up wraps.',
          { stitch_count: castOn, row_type: 'work_rows', rows_in_step: shortRowPairs * 2 },
        ))
      }
      const heelName = options.heel_type === 'fish_lips_kiss' ? 'Fish Lips Kiss Heel'
        : options.heel_type === 'afterthought' ? 'Heel Placement'
        : 'Short Row Heel'
      sections.push({ name: heelName, sort_order: 2, steps: heelSteps })

      // Leg
      const legSteps: StepBlueprint[] = []
      resetSteps()
      const legRows = cmToRows(legLengthCm, gauge)
      legSteps.push(step(
        `Work ${legRows} rounds in stockinette`,
        { stitch_count: castOn, row_type: 'work_rows', rows_in_step: legRows, math_notes: `${legLengthCm}cm leg` },
      ))
      sections.push({ name: 'Leg', sort_order: 3, steps: legSteps })

      // Cuff
      const cuffSteps = buildSockCuff(castOn, cuffStyle, needleMm, ribbingNeedleMm, gauge, true)
      sections.push({ name: 'Cuff', sort_order: 4, steps: cuffSteps })

      // Afterthought heel completion for toe-up
      if (options.heel_type === 'afterthought') {
        const athSteps: StepBlueprint[] = []
        resetSteps()
        const athTotal = heelSts * 2 + 2
        athSteps.push(step(
          `Remove waste yarn. Place live stitches on DPNs (${athTotal} sts). Shape heel cup with decreases, close with ${toeFinish === 'gathered' ? 'gather' : 'Kitchener'}.`,
          { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
        ))
        sections.push({ name: 'Afterthought Heel', sort_order: 5, steps: athSteps })
      }
    }

    // Finishing
    const finishSteps: StepBlueprint[] = []
    resetSteps()
    finishSteps.push(step('Weave in all ends. Make second sock.', {
      row_type: 'finishing', rows_in_step: 1,
    }))
    sections.push({ name: 'Finishing', sort_order: 99, steps: finishSteps })

    sectionsPerSize[size.name] = sections.sort((a, b) => a.sort_order - b.sort_order)
  }

  return {
    title_suggestion: 'Hand-Knit Socks',
    difficulty: 'intermediate',
    garment_type: 'socks',
    gauge,
    needle_size_mm: needleMm,
    ribbing_needle_mm: ribbingNeedleMm,
    yarn_weight: 'fingering' as YarnWeight,
    sizes,
    sections_per_size: sectionsPerSize,
  }
}

// ─── Sweater ────────────────────────────────────────────────────────────────

/** Ease in cm by body fit */
const EASE_BY_FIT: Record<string, number> = {
  fitted: 5,
  standard: 10,
  relaxed: 15,
  oversized: 25,
}

/** Body length multiplier */
const LENGTH_MULT: Record<string, number> = {
  cropped: 0.75,
  regular: 1.0,
  tunic: 1.25,
}

/** Get ribbing divisor for hem_style */
function hemDivisor(hemStyle: string): number {
  switch (hemStyle) {
    case 'rib_1x1': return 2
    case 'rib_2x2': return 4
    case 'garter': return 1
    case 'folded_hem': return 1
    case 'rolled': return 1
    case 'no_border': return 1
    default: return 2
  }
}

/** Build hem/border section for sweater body or cuffs */
function buildHemSection(
  hemStyle: string,
  sts: number,
  needleMm: number,
  gauge: Gauge,
  label: string,
): StepBlueprint[] {
  const hemSteps: StepBlueprint[] = []
  resetSteps()
  const hemRows = cmToRows(5, gauge)

  hemSteps.push(step(`Switch to ${needleMm}mm needles`, {
    stitch_count: sts, row_type: 'setup', rows_in_step: 1,
  }))

  if (hemStyle === 'folded_hem') {
    const halfRows = Math.floor(hemRows / 2) + 2
    hemSteps.push(step(
      `Work ${halfRows} rounds in stockinette`,
      { stitch_count: sts, row_type: 'work_rows', rows_in_step: halfRows },
    ))
    hemSteps.push(step('Purl 1 round (fold line)', {
      stitch_count: sts, row_type: 'work_rows', rows_in_step: 1,
    }))
    hemSteps.push(step(
      `Work ${halfRows} rounds in stockinette. Fold at purl ridge and join with live stitches.`,
      { stitch_count: sts, row_type: 'work_rows', rows_in_step: halfRows },
    ))
  } else if (hemStyle === 'rolled') {
    hemSteps.push(step(
      `Work ${hemRows} rounds in stockinette (edge will naturally roll)`,
      { stitch_count: sts, row_type: 'work_rows', rows_in_step: hemRows },
    ))
  } else if (hemStyle === 'garter') {
    hemSteps.push(step(
      `Work ${hemRows} rounds in garter stitch (alternate knit and purl rounds)`,
      { stitch_count: sts, row_type: 'work_rows', rows_in_step: hemRows },
    ))
  } else if (hemStyle === 'no_border') {
    // No hem, just bind off
  } else {
    // rib_1x1 or rib_2x2
    hemSteps.push(step(
      `Work ${hemRows} rounds in ${hemStyle.replace('_', ' ')}`,
      { stitch_count: sts, row_type: 'work_rows', rows_in_step: hemRows },
    ))
  }

  hemSteps.push(step('Bind off loosely in pattern', {
    stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
  }))
  return hemSteps
}

/** Build neckband section based on neckline type */
function buildNeckbandSteps(
  neckline: string,
  neckSts: number,
  ribbingNeedleMm: number,
  gauge: Gauge,
  isCardigan: boolean,
): StepBlueprint[] {
  const neckSteps: StepBlueprint[] = []
  resetSteps()

  // Necklines with no neckband
  if (neckline === 'no_neckband' || neckline === 'boat') {
    return neckSteps
  }

  const ribRows = cmToRows(2.5, gauge)

  if (neckline === 'turtleneck') {
    const turtleRows = cmToRows(15, gauge) // ~15cm folded turtleneck
    neckSteps.push(step(
      `Pick up stitches around neckline on ${ribbingNeedleMm}mm needles. Work ${turtleRows} rounds in rib 2x2.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: turtleRows, math_notes: '~15cm turtleneck, folds over' },
    ))
    neckSteps.push(step('Bind off loosely in pattern (must stretch over head)', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  } else if (neckline === 'mock_turtleneck') {
    const mockRows = cmToRows(7, gauge)
    neckSteps.push(step(
      `Pick up stitches around neckline on ${ribbingNeedleMm}mm needles. Work ${mockRows} rounds in rib 2x2.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: mockRows, math_notes: '~7cm mock turtleneck' },
    ))
    neckSteps.push(step('Bind off loosely in pattern', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  } else if (neckline === 'cowl_neck') {
    const cowlRows = cmToRows(20, gauge)
    neckSteps.push(step(
      `Pick up stitches around neckline on ${ribbingNeedleMm}mm needles. Work ${cowlRows} rounds in stockinette for cowl neck.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: cowlRows, math_notes: '~20cm cowl, drapes loosely' },
    ))
    neckSteps.push(step('Bind off very loosely', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  } else if (neckline === 'hooded') {
    const hoodRows = cmToRows(35, gauge) // ~35cm tall hood
    const hoodSts = nearestDivisible(Math.round(neckSts * 1.2), 2) // slightly wider
    neckSteps.push(step(
      `Pick up ${hoodSts} stitches around neckline on body needles. Increase evenly in first round if needed.`,
      { stitch_count: hoodSts, row_type: 'setup', rows_in_step: 1 },
    ))
    neckSteps.push(step(
      `Work ${hoodRows} rows in stockinette for hood (worked flat or in round depending on construction)`,
      { stitch_count: hoodSts, row_type: 'work_rows', rows_in_step: hoodRows, math_notes: '~35cm hood height' },
    ))
    neckSteps.push(step(
      'Fold hood in half, graft or seam top of hood with Kitchener stitch or three-needle bind-off',
      { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
    ))
  } else if (neckline === 'shawl_collar') {
    const shawlRows = cmToRows(12, gauge)
    neckSteps.push(step(
      `Pick up stitches around neckline on ${ribbingNeedleMm}mm needles, beginning at center front.`,
      { stitch_count: neckSts, row_type: 'setup', rows_in_step: 1 },
    ))
    neckSteps.push(step(
      `Work ${shawlRows} rows in rib 1x1 (worked flat for cardigan, short-row shaped at back neck). Collar width increases with rows for shawl drape.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: shawlRows, math_notes: 'Wider at front, narrower at back' },
    ))
    neckSteps.push(step('Bind off loosely. Overlap fronts and tack if needed.', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  } else if (neckline === 'henley') {
    neckSteps.push(step(
      `Pick up stitches around neckline on ${ribbingNeedleMm}mm needles. Work ${ribRows} rounds in rib 1x1.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: ribRows },
    ))
    neckSteps.push(step('Bind off. Work 8cm button placket at center front: pick up stitches, work 5 rows, add 3 evenly spaced buttonholes, work 2 more rows, bind off.', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1, math_notes: '3 small buttons on placket',
    }))
  } else if (neckline === 'v_neck') {
    neckSteps.push(step(
      `Pick up stitches around V-neckline on ${ribbingNeedleMm}mm needles (more stitches along diagonal edges). Work ${ribRows} rounds in rib 1x1, working double decrease at center V every round.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: ribRows, math_notes: 'Mitre at V-point' },
    ))
    neckSteps.push(step('Bind off loosely in pattern', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  } else {
    // crew, scoop, square — standard ribbed neckband
    neckSteps.push(step(
      `Pick up stitches around neckline on ${ribbingNeedleMm}mm needles. Work ${ribRows} rounds in rib 1x1.`,
      { stitch_count: neckSts, row_type: 'work_rows', rows_in_step: ribRows },
    ))
    neckSteps.push(step('Bind off loosely in pattern', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
  }

  return neckSteps
}

/** Build sleeve section with shape options */
function buildSleeveSteps(
  sleeveTotalSts: number,
  wristSts: number,
  sleeveLengthCm: number,
  needleMm: number,
  ribbingNeedleMm: number,
  gauge: Gauge,
  options: SweaterOptions,
): StepBlueprint[] {
  const sleeveSteps: StepBlueprint[] = []
  resetSteps()
  const sleeveRows = cmToRows(sleeveLengthCm, gauge)
  const sleeveShape = options.sleeve_shape ?? 'tapered'

  if (sleeveShape === 'straight') {
    // No taper — work even
    sleeveSteps.push(step(
      `Work in stockinette for ${sleeveLengthCm}cm (straight sleeve, no shaping)`,
      { stitch_count: sleeveTotalSts, row_type: 'work_to_measurement', target_measurement_cm: sleeveLengthCm },
    ))
  } else if (sleeveShape === 'bell') {
    // Bell: work even for most of length, then increase for flare
    const straightLength = sleeveLengthCm * 0.6
    const bellLength = sleeveLengthCm * 0.4
    const bellSts = nearestDivisible(Math.round(sleeveTotalSts * 1.3), 2) // 30% wider at cuff
    const bellIncs = Math.floor((bellSts - sleeveTotalSts) / 2)
    const bellRows = cmToRows(bellLength, gauge)

    // First taper to wrist area
    const taperRows = cmToRows(straightLength, gauge)
    const taper = calculateTaper(sleeveTotalSts, wristSts, taperRows)
    if (taper.total_decreases > 0) {
      sleeveSteps.push(step(
        `Decrease 2 sts every ${taper.decrease_every_n_rows} rounds, ${taper.total_decreases} times`,
        {
          stitch_count: wristSts,
          row_type: 'repeat',
          rows_in_step: taperRows,
          is_repeat: true,
          repeat_count: taper.total_decreases,
          rows_per_repeat: taper.decrease_every_n_rows,
          math_notes: `Taper: ${sleeveTotalSts} → ${wristSts} sts`,
        },
      ))
    }

    // Then flare out for bell
    if (bellIncs > 0) {
      const bellSpacing = Math.max(2, Math.floor(bellRows / bellIncs))
      sleeveSteps.push(step(
        `Increase 2 sts every ${bellSpacing} rounds, ${bellIncs} times for bell flare`,
        {
          stitch_count: bellSts,
          row_type: 'repeat',
          rows_in_step: bellRows,
          is_repeat: true,
          repeat_count: bellIncs,
          rows_per_repeat: bellSpacing,
          math_notes: `Bell: ${wristSts} → ${bellSts} sts`,
        },
      ))
    }
  } else {
    // Tapered (default)
    const taper = calculateTaper(sleeveTotalSts, wristSts, sleeveRows)
    if (taper.total_decreases > 0) {
      sleeveSteps.push(step(
        `Work in stockinette, decreasing 2 sts every ${taper.decrease_every_n_rows} rounds, ${taper.total_decreases} times`,
        {
          stitch_count: wristSts,
          row_type: 'repeat',
          rows_in_step: sleeveRows,
          is_repeat: true,
          repeat_count: taper.total_decreases,
          rows_per_repeat: taper.decrease_every_n_rows,
          math_notes: `${sleeveTotalSts} → ${wristSts} sts over ${sleeveLengthCm}cm`,
        },
      ))
    } else {
      sleeveSteps.push(step(
        `Work in stockinette for ${sleeveLengthCm}cm`,
        { stitch_count: sleeveTotalSts, row_type: 'work_to_measurement', target_measurement_cm: sleeveLengthCm },
      ))
    }
  }

  // Cuff
  const cuffSts = sleeveShape === 'bell'
    ? nearestDivisible(Math.round(sleeveTotalSts * 1.3), 2)
    : wristSts
  const cuffSteps = buildHemSection(options.hem_style, cuffSts, ribbingNeedleMm, gauge, 'Cuff')
  sleeveSteps.push(...cuffSteps)

  return sleeveSteps
}

/** Build body shaping (waist shaped or A-line) */
function buildBodyShapingSteps(
  bodySts: number,
  bodyLengthCm: number,
  gauge: Gauge,
  bodyShaping: string,
): StepBlueprint[] {
  const steps: StepBlueprint[] = []
  resetSteps()

  if (bodyShaping === 'waist_shaped') {
    // Decrease to waist, then increase back
    const waistDecSts = nearestDivisible(Math.round(bodySts * 0.06), 2) // remove ~6% for waist
    const waistSts = bodySts - waistDecSts * 2 // decrease at sides
    const decPairs = Math.floor(waistDecSts / 2)
    const waistPoint = bodyLengthCm * 0.5 // waist at halfway
    const decRows = cmToRows(waistPoint, gauge)
    const decSpacing = Math.max(4, Math.floor(decRows / decPairs))

    steps.push(step(
      `Waist shaping: Decrease 2 sts (1 each side) every ${decSpacing} rounds, ${decPairs} times`,
      {
        stitch_count: waistSts,
        row_type: 'repeat',
        rows_in_step: decPairs * decSpacing,
        is_repeat: true,
        repeat_count: decPairs,
        rows_per_repeat: decSpacing,
        math_notes: `${bodySts} → ${waistSts} sts at waist`,
      },
    ))
    steps.push(step(
      `Work 4 rounds even at waist`,
      { stitch_count: waistSts, row_type: 'work_rows', rows_in_step: 4 },
    ))
    steps.push(step(
      `Increase 2 sts (1 each side) every ${decSpacing} rounds, ${decPairs} times`,
      {
        stitch_count: bodySts,
        row_type: 'repeat',
        rows_in_step: decPairs * decSpacing,
        is_repeat: true,
        repeat_count: decPairs,
        rows_per_repeat: decSpacing,
        math_notes: `${waistSts} → ${bodySts} sts (back to original)`,
      },
    ))
  } else if (bodyShaping === 'a_line') {
    // Gradual increase from underarm to hem
    const incSts = nearestDivisible(Math.round(bodySts * 0.10), 2) // add ~10%
    const finalSts = bodySts + incSts * 2
    const incPairs = Math.floor(incSts / 2)
    const bodyRows = cmToRows(bodyLengthCm, gauge)
    const incSpacing = Math.max(4, Math.floor(bodyRows / incPairs))

    steps.push(step(
      `A-line shaping: Increase 2 sts (1 each side) every ${incSpacing} rounds, ${incPairs} times`,
      {
        stitch_count: finalSts,
        row_type: 'repeat',
        rows_in_step: incPairs * incSpacing,
        is_repeat: true,
        repeat_count: incPairs,
        rows_per_repeat: incSpacing,
        math_notes: `${bodySts} → ${finalSts} sts for A-line flare`,
      },
    ))
    const remainingCm = Math.max(0, bodyLengthCm - rowsToCm(incPairs * incSpacing, gauge))
    if (remainingCm > 1) {
      steps.push(step(
        `Work even for remaining ${Math.round(remainingCm)}cm to hem`,
        { stitch_count: finalSts, row_type: 'work_to_measurement', target_measurement_cm: Math.round(remainingCm) },
      ))
    }
  } else {
    // Straight — work even
    steps.push(step(
      `Work in stockinette until body measures ${Math.round(bodyLengthCm)}cm from underarm`,
      { stitch_count: bodySts, row_type: 'work_to_measurement', target_measurement_cm: Math.round(bodyLengthCm) },
    ))
  }

  return steps
}

export function buildSweaterBlueprint(
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: SweaterOptions,
): PatternBlueprint {
  const ribbingNeedleMm = Math.max(2, needleMm - 0.5)
  const sectionsPerSize: Record<string, SectionBlueprint[]> = {}

  const ease = EASE_BY_FIT[options.body_fit] ?? 10
  const lengthMult = LENGTH_MULT[options.body_length] ?? 1.0
  const hemStyle = options.hem_style ?? 'rib_2x2'
  const ribDiv = hemDivisor(hemStyle)
  const bodyShaping = options.body_shaping ?? 'straight'

  for (const size of sizes) {
    const bust = size.measurements.bust_cm
    const shoulderWidth = size.measurements.shoulder_width_cm
    const armLength = size.measurements.arm_length_cm
    const upperArm = size.measurements.upper_arm_cm
    const backLength = size.measurements.back_length_cm * lengthMult

    // Elizabeth Zimmermann Percentage System (EPS)
    const bodyCirc = bust + ease
    const K = cmToStitches(bodyCirc, gauge)
    const KRounded = nearestDivisible(K, ribDiv * 2)

    // EPS proportions
    const neckSts = nearestDivisible(Math.round(K * 0.40), 2)
    const upperArmSts = nearestDivisible(Math.round(K * 0.33), 2)
    const wristSts = nearestDivisible(Math.round(K * 0.20), Math.max(ribDiv, 2))
    const underarmCastOn = nearestDivisible(Math.round(K * 0.08), 2)

    const sections: SectionBlueprint[] = []

    if (options.construction === 'top_down_raglan') {
      buildTopDownRaglan(
        sections, gauge, needleMm, ribbingNeedleMm,
        KRounded, neckSts, upperArmSts, wristSts, underarmCastOn,
        backLength, armLength, ribDiv, options, bodyShaping,
      )
    } else if (options.construction === 'top_down_yoke') {
      buildTopDownYoke(
        sections, gauge, needleMm, ribbingNeedleMm,
        KRounded, neckSts, upperArmSts, wristSts, underarmCastOn,
        backLength, armLength, ribDiv, options, bodyShaping,
      )
    } else if (options.construction === 'drop_shoulder') {
      buildDropShoulder(
        sections, gauge, needleMm, ribbingNeedleMm,
        KRounded, neckSts, upperArmSts, wristSts, underarmCastOn,
        backLength, armLength, shoulderWidth, ribDiv, options, bodyShaping,
      )
    } else if (options.construction === 'set_in_sleeve') {
      buildSetInSleeve(
        sections, gauge, needleMm, ribbingNeedleMm,
        KRounded, neckSts, upperArmSts, wristSts, underarmCastOn,
        backLength, armLength, shoulderWidth, ribDiv, options, bodyShaping,
      )
    } else {
      buildBottomUpSeamed(
        sections, gauge, needleMm, ribbingNeedleMm,
        KRounded, neckSts, upperArmSts, wristSts, underarmCastOn,
        backLength, armLength, shoulderWidth, ribDiv, options, bodyShaping,
      )
    }

    // ── Cardigan button/zipper band ──
    if (options.is_cardigan && options.closure_type) {
      const bandSteps: StepBlueprint[] = []
      resetSteps()
      if (options.closure_type === 'button_band') {
        const bandSts = 7 // typical button band width
        const bodyLengthRows = cmToRows(backLength, gauge)
        const numButtons = Math.max(3, Math.min(9, Math.round(backLength / 8)))
        const buttonSpacing = Math.round(backLength / (numButtons + 1))
        bandSteps.push(step(
          `Right front band: Pick up stitches along right front edge on ${ribbingNeedleMm}mm needles (~3 sts per 4 rows). Work ${bandSts} rows in garter stitch. Bind off.`,
          { row_type: 'work_rows', rows_in_step: bandSts },
        ))
        bandSteps.push(step(
          `Left front band: Pick up stitches along left front edge. Work 3 rows garter. Row 4 (buttonhole row): *Work to next buttonhole position, YO, k2tog* for ${numButtons} buttonholes spaced ~${buttonSpacing}cm apart. Work ${bandSts - 4} more rows. Bind off.`,
          { row_type: 'work_rows', rows_in_step: bandSts, math_notes: `${numButtons} buttons spaced ${buttonSpacing}cm apart` },
        ))
      } else if (options.closure_type === 'zipper') {
        bandSteps.push(step(
          'Stabilize front edges: pick up stitches along each front edge, work 2 rows stockinette, bind off. Pin and sew zipper behind front edges with backstitch.',
          { row_type: 'finishing', rows_in_step: 1 },
        ))
      } else {
        // open_front — no closure
        bandSteps.push(step(
          'Front edges: pick up stitches along each front edge on smaller needles. Work 4 rows garter stitch for a clean selvedge. Bind off.',
          { row_type: 'work_rows', rows_in_step: 4 },
        ))
      }
      const lastSort = Math.max(...sections.map(s => s.sort_order))
      sections.push({ name: 'Front Band', sort_order: lastSort + 1, steps: bandSteps })
    }

    sectionsPerSize[size.name] = sections
  }

  const diffMap: Record<string, string> = {
    top_down_raglan: 'easy',
    top_down_yoke: 'easy',
    drop_shoulder: 'beginner',
    set_in_sleeve: 'intermediate',
    bottom_up_seamed: 'intermediate',
  }

  return {
    title_suggestion: options.is_cardigan ? 'Classic Cardigan' : 'Classic Pullover',
    difficulty: diffMap[options.construction] ?? 'easy',
    garment_type: options.is_cardigan ? 'cardigan' : 'pullover',
    gauge,
    needle_size_mm: needleMm,
    ribbing_needle_mm: ribbingNeedleMm,
    yarn_weight: 'worsted' as YarnWeight,
    sizes,
    sections_per_size: sectionsPerSize,
  }
}

function buildTopDownRaglan(
  sections: SectionBlueprint[],
  gauge: Gauge,
  needleMm: number,
  ribbingNeedleMm: number,
  bodyK: number,
  neckSts: number,
  upperArmSts: number,
  wristSts: number,
  underarmCastOn: number,
  backLength: number,
  armLength: number,
  ribDiv: number,
  options: SweaterOptions,
  bodyShaping: string,
): void {
  const backNeck = nearestDivisible(Math.round(neckSts * 0.30), 2)
  const frontNeck = nearestDivisible(Math.round(neckSts * 0.30), 2)
  const sleeveNeck = nearestDivisible(Math.round(neckSts * 0.20), 2)
  const totalNeckCO = backNeck + frontNeck + sleeveNeck * 2

  const bodyTarget = bodyK / 2
  const raglanRounds = Math.floor((bodyTarget - backNeck) / 2)

  // ── Neckband ──
  const neckSteps: StepBlueprint[] = []
  resetSteps()
  neckSteps.push(step(
    `Cast on ${totalNeckCO} stitches on ${ribbingNeedleMm}mm circular needles`,
    { stitch_count: totalNeckCO, row_type: 'setup', rows_in_step: 1 },
  ))
  neckSteps.push(step(
    `Place raglan markers: ${backNeck} back, pm, ${sleeveNeck} sleeve, pm, ${frontNeck} front, pm, ${sleeveNeck} sleeve, pm`,
    { stitch_count: totalNeckCO, row_type: 'setup', rows_in_step: 1, math_notes: '4 raglan markers placed' },
  ))
  sections.push({ name: 'Neckband', sort_order: 0, steps: neckSteps })

  // ── Raglan Increases ──
  const raglanSteps: StepBlueprint[] = []
  resetSteps()
  const stsAfterRaglan = totalNeckCO + raglanRounds * 8
  raglanSteps.push(step(
    `Increase round: *Knit to 1 st before marker, M1R, k1, SM, k1, M1L* at each of 4 markers (8 sts inc'd).\nPlain round: Knit all stitches.\nRepeat ${raglanRounds} times.`,
    {
      stitch_count: stsAfterRaglan,
      row_type: 'repeat',
      rows_in_step: raglanRounds * 2,
      is_repeat: true,
      repeat_count: raglanRounds,
      rows_per_repeat: 2,
      math_notes: `${stsAfterRaglan} total sts`,
    },
  ))
  sections.push({ name: 'Yoke / Raglan Increases', sort_order: 1, steps: raglanSteps })

  // ── Divide ──
  const divideSteps: StepBlueprint[] = []
  resetSteps()
  const bodyStsPerSide = backNeck + raglanRounds * 2
  const sleeveStsEach = sleeveNeck + raglanRounds * 2
  const bodyTotalSts = nearestDivisible(bodyStsPerSide * 2 + underarmCastOn * 2, ribDiv)

  divideSteps.push(step(
    `Place ${sleeveStsEach} sleeve stitches on waste yarn (each side). Cast on ${underarmCastOn} stitches at each underarm.`,
    { stitch_count: bodyTotalSts, row_type: 'setup', rows_in_step: 1, math_notes: `${bodyTotalSts} body sts` },
  ))
  sections.push({ name: 'Divide Body & Sleeves', sort_order: 2, steps: divideSteps })

  // ── Body with shaping ──
  const bodyLengthFromUnderarm = Math.max(5, backLength - (raglanRounds * 2 * 10 / gauge.rows_per_10cm) - 5)
  const bodySteps = buildBodyShapingSteps(bodyTotalSts, bodyLengthFromUnderarm, gauge, bodyShaping)
  sections.push({ name: 'Body', sort_order: 3, steps: bodySteps })

  // ── Hem ──
  const hemSteps = buildHemSection(options.hem_style, bodyTotalSts, ribbingNeedleMm, gauge, 'Hem')
  sections.push({ name: 'Hem', sort_order: 4, steps: hemSteps })

  // ── Sleeves ──
  if (options.sleeve_style !== 'sleeveless') {
    const sleeveTotalSts = sleeveStsEach + underarmCastOn
    const sleeveLengthCm = options.sleeve_style === 'short' ? 10
      : options.sleeve_style === 'three_quarter' ? armLength * 0.65
      : armLength - 5

    const sleeveSetup: StepBlueprint[] = []
    resetSteps()
    sleeveSetup.push(step(
      `Place ${sleeveStsEach} held sleeve sts on ${needleMm}mm needles, pick up ${underarmCastOn} sts at underarm (${sleeveTotalSts} sts)`,
      { stitch_count: sleeveTotalSts, row_type: 'setup', rows_in_step: 1 },
    ))
    const sleeveBody = buildSleeveSteps(sleeveTotalSts, wristSts, sleeveLengthCm, needleMm, ribbingNeedleMm, gauge, options)
    sections.push({ name: 'Sleeves (make 2)', sort_order: 5, steps: [...sleeveSetup, ...sleeveBody] })
  }

  // ── Neckline finishing ──
  const neckFinishSteps = buildNeckbandSteps(options.neckline, neckSts, ribbingNeedleMm, gauge, options.is_cardigan)
  if (neckFinishSteps.length > 0) {
    sections.push({ name: 'Neckline', sort_order: 6, steps: neckFinishSteps })
  }

  // ── Finishing ──
  const finishSteps: StepBlueprint[] = []
  resetSteps()
  finishSteps.push(step('Weave in all ends. Block to measurements.', {
    row_type: 'finishing', rows_in_step: 1,
  }))
  sections.push({ name: 'Finishing', sort_order: 7, steps: finishSteps })
}

function buildTopDownYoke(
  sections: SectionBlueprint[],
  gauge: Gauge,
  needleMm: number,
  ribbingNeedleMm: number,
  bodyK: number,
  neckSts: number,
  upperArmSts: number,
  wristSts: number,
  underarmCastOn: number,
  backLength: number,
  armLength: number,
  ribDiv: number,
  options: SweaterOptions,
  bodyShaping: string,
): void {
  const neckCO = nearestDivisible(neckSts, 8)
  const totalBodySleeveSts = bodyK + upperArmSts * 2
  const totalIncreaseSts = totalBodySleeveSts - neckCO
  const increasesPerRound = 8
  const yokeIncreaseRounds = Math.floor(totalIncreaseSts / increasesPerRound)

  // ── Neckband ──
  const neckSteps: StepBlueprint[] = []
  resetSteps()
  neckSteps.push(step(
    `Cast on ${neckCO} stitches on ${ribbingNeedleMm}mm circular needles, join in the round`,
    { stitch_count: neckCO, row_type: 'setup', rows_in_step: 1 },
  ))
  sections.push({ name: 'Neckband', sort_order: 0, steps: neckSteps })

  // ── Yoke Increases ──
  const yokeSteps: StepBlueprint[] = []
  resetSteps()
  const stsAfterYoke = neckCO + yokeIncreaseRounds * increasesPerRound
  yokeSteps.push(step(
    `Increase round: *K${Math.max(1, Math.floor(neckCO / increasesPerRound) - 1)}, M1L* ${increasesPerRound} times.\nPlain round: Knit.\nRepeat ${yokeIncreaseRounds} times.`,
    {
      stitch_count: stsAfterYoke,
      row_type: 'repeat',
      rows_in_step: yokeIncreaseRounds * 2,
      is_repeat: true,
      repeat_count: yokeIncreaseRounds,
      rows_per_repeat: 2,
      math_notes: `${stsAfterYoke} total sts after yoke`,
    },
  ))
  sections.push({ name: 'Yoke Increases', sort_order: 1, steps: yokeSteps })

  // ── Divide ──
  const bodyStsPerSide = Math.floor(stsAfterYoke * 0.30)
  const sleeveStsEach = Math.floor(stsAfterYoke * 0.20)
  const bodyTotalSts = nearestDivisible(bodyStsPerSide * 2 + underarmCastOn * 2, ribDiv)

  const divideSteps: StepBlueprint[] = []
  resetSteps()
  divideSteps.push(step(
    `Place ${sleeveStsEach} sleeve stitches on waste yarn (each side). Cast on ${underarmCastOn} stitches at each underarm.`,
    { stitch_count: bodyTotalSts, row_type: 'setup', rows_in_step: 1 },
  ))
  sections.push({ name: 'Divide Body & Sleeves', sort_order: 2, steps: divideSteps })

  // ── Body ──
  const yokeDepthCm = rowsToCm(yokeIncreaseRounds * 2, gauge)
  const bodyLengthFromUnderarm = Math.max(5, backLength - yokeDepthCm - 5)
  const bodySteps = buildBodyShapingSteps(bodyTotalSts, bodyLengthFromUnderarm, gauge, bodyShaping)
  sections.push({ name: 'Body', sort_order: 3, steps: bodySteps })

  // ── Hem ──
  const hemSteps = buildHemSection(options.hem_style, bodyTotalSts, ribbingNeedleMm, gauge, 'Hem')
  sections.push({ name: 'Hem', sort_order: 4, steps: hemSteps })

  // ── Sleeves ──
  if (options.sleeve_style !== 'sleeveless') {
    const sleeveTotalSts = sleeveStsEach + underarmCastOn
    const sleeveLengthCm = options.sleeve_style === 'short' ? 10
      : options.sleeve_style === 'three_quarter' ? armLength * 0.65
      : armLength - 5

    const sleeveSetup: StepBlueprint[] = []
    resetSteps()
    sleeveSetup.push(step(
      `Place ${sleeveStsEach} held sleeve sts on ${needleMm}mm needles, pick up ${underarmCastOn} sts (${sleeveTotalSts} sts)`,
      { stitch_count: sleeveTotalSts, row_type: 'setup', rows_in_step: 1 },
    ))
    const sleeveBody = buildSleeveSteps(sleeveTotalSts, wristSts, sleeveLengthCm, needleMm, ribbingNeedleMm, gauge, options)
    sections.push({ name: 'Sleeves (make 2)', sort_order: 5, steps: [...sleeveSetup, ...sleeveBody] })
  }

  // ── Neckline finishing ──
  const neckFinishSteps = buildNeckbandSteps(options.neckline, neckSts, ribbingNeedleMm, gauge, options.is_cardigan)
  if (neckFinishSteps.length > 0) {
    sections.push({ name: 'Neckline', sort_order: 6, steps: neckFinishSteps })
  }

  const finishSteps: StepBlueprint[] = []
  resetSteps()
  finishSteps.push(step('Weave in all ends. Block to measurements.', {
    row_type: 'finishing', rows_in_step: 1,
  }))
  sections.push({ name: 'Finishing', sort_order: 7, steps: finishSteps })
}

function buildBottomUpSeamed(
  sections: SectionBlueprint[],
  gauge: Gauge,
  needleMm: number,
  ribbingNeedleMm: number,
  bodyK: number,
  neckSts: number,
  upperArmSts: number,
  wristSts: number,
  underarmCastOn: number,
  backLength: number,
  armLength: number,
  shoulderWidth: number,
  ribDiv: number,
  options: SweaterOptions,
  bodyShaping: string,
): void {
  const halfBody = nearestDivisible(Math.floor(bodyK / 2), ribDiv)
  const armholeDepth = 20

  // ── Back ──
  const backSteps: StepBlueprint[] = []
  resetSteps()
  backSteps.push(step(
    `Cast on ${halfBody} stitches on ${ribbingNeedleMm}mm needles`,
    { stitch_count: halfBody, row_type: 'setup', rows_in_step: 1 },
  ))
  const hemSteps = buildHemSection(options.hem_style, halfBody, ribbingNeedleMm, gauge, 'Hem')
  // Remove bind-off from hem (we continue working)
  const hemWithoutBO = hemSteps.filter(s => !s.description.toLowerCase().includes('bind off'))
  backSteps.push(...hemWithoutBO)
  backSteps.push(step(`Switch to ${needleMm}mm needles`, {
    stitch_count: halfBody, row_type: 'setup', rows_in_step: 1,
  }))
  const bodyToArmhole = Math.max(5, backLength - armholeDepth - 5)
  backSteps.push(step(
    `Work in stockinette until piece measures ${Math.round(bodyToArmhole)}cm from hem`,
    { stitch_count: halfBody, row_type: 'work_to_measurement', target_measurement_cm: Math.round(bodyToArmhole) },
  ))

  const armholeBO = nearestDivisible(Math.round(halfBody * 0.08), 2)
  const afterArmholeBO = halfBody - armholeBO * 2
  backSteps.push(step(
    `Bind off ${armholeBO} sts at beginning of next 2 rows for armholes`,
    { stitch_count: afterArmholeBO, row_type: 'work_rows', rows_in_step: 2 },
  ))
  backSteps.push(step(
    `Work even until armhole measures ${armholeDepth}cm`,
    { stitch_count: afterArmholeBO, row_type: 'work_to_measurement', target_measurement_cm: armholeDepth },
  ))

  const shoulderSts = Math.floor((afterArmholeBO - Math.round(neckSts * 0.3)) / 2)
  backSteps.push(step(
    `Bind off ${shoulderSts} sts at beginning of next 2 rows for shoulders. Bind off remaining ${afterArmholeBO - shoulderSts * 2} back neck stitches.`,
    { stitch_count: 0, row_type: 'finishing', rows_in_step: 3 },
  ))
  sections.push({ name: 'Back', sort_order: 0, steps: backSteps })

  // ── Front ──
  const frontSteps: StepBlueprint[] = []
  resetSteps()
  frontSteps.push(step(
    `Cast on ${halfBody} stitches. Work hem and body to match back length to armhole.`,
    { stitch_count: halfBody, row_type: 'setup', rows_in_step: 1 },
  ))
  frontSteps.push(step(
    `Bind off ${armholeBO} sts at beginning of next 2 rows`,
    { stitch_count: afterArmholeBO, row_type: 'work_rows', rows_in_step: 2 },
  ))
  const frontNeckBO = nearestDivisible(Math.round(afterArmholeBO * 0.25), 2)
  frontSteps.push(step(
    `When armhole measures ${armholeDepth - 8}cm, bind off center ${frontNeckBO} sts for neckline. Work each side separately, decreasing 1 st at neck edge every RS row 3 times.`,
    { stitch_count: shoulderSts, row_type: 'work_rows', rows_in_step: 8 },
  ))
  frontSteps.push(step(
    `When armhole matches back, bind off ${shoulderSts} shoulder stitches`,
    { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
  ))
  sections.push({ name: 'Front', sort_order: 1, steps: frontSteps })

  // ── Sleeves ──
  if (options.sleeve_style !== 'sleeveless') {
    const sleeveSteps: StepBlueprint[] = []
    resetSteps()
    sleeveSteps.push(step(
      `Cast on ${wristSts} stitches on ${ribbingNeedleMm}mm needles`,
      { stitch_count: wristSts, row_type: 'setup', rows_in_step: 1 },
    ))
    const cuffHem = buildHemSection(options.hem_style, wristSts, ribbingNeedleMm, gauge, 'Cuff')
    const cuffWithoutBO = cuffHem.filter(s => !s.description.toLowerCase().includes('bind off'))
    sleeveSteps.push(...cuffWithoutBO)
    sleeveSteps.push(step(`Switch to ${needleMm}mm needles`, {
      stitch_count: wristSts, row_type: 'setup', rows_in_step: 1,
    }))

    const sleeveLengthCm = options.sleeve_style === 'short' ? 10
      : options.sleeve_style === 'three_quarter' ? armLength * 0.65
      : armLength - 5
    const sleeveRows = cmToRows(sleeveLengthCm, gauge)
    const taper = calculateTaper(wristSts, upperArmSts, sleeveRows)

    if (taper.total_decreases > 0) {
      sleeveSteps.push(step(
        `Increase 1 st each side every ${taper.decrease_every_n_rows} rows, ${taper.total_decreases} times`,
        { stitch_count: upperArmSts, row_type: 'repeat', rows_in_step: sleeveRows, is_repeat: true, repeat_count: taper.total_decreases, rows_per_repeat: taper.decrease_every_n_rows, math_notes: `${wristSts} → ${upperArmSts} sts` },
      ))
    }

    sleeveSteps.push(step(
      `Bind off ${armholeBO} sts at beginning of next 2 rows. Decrease 1 st each side every RS row until 6-8 sts remain. Bind off.`,
      { stitch_count: 0, row_type: 'work_rows', rows_in_step: null, math_notes: 'Shape sleeve cap' },
    ))
    sections.push({ name: 'Sleeves (make 2)', sort_order: 2, steps: sleeveSteps })
  }

  // ── Assembly ──
  const assemblySteps: StepBlueprint[] = []
  resetSteps()
  assemblySteps.push(step('Seam shoulders using mattress stitch or three-needle bind-off', {
    row_type: 'finishing', rows_in_step: 1,
  }))
  if (options.sleeve_style !== 'sleeveless') {
    assemblySteps.push(step('Set in sleeves, matching sleeve cap to armhole. Seam sleeve and side seams.', {
      row_type: 'finishing', rows_in_step: 1,
    }))
  } else {
    assemblySteps.push(step('Seam side seams using mattress stitch', {
      row_type: 'finishing', rows_in_step: 1,
    }))
  }

  // Neckline
  const neckFinish = buildNeckbandSteps(options.neckline, neckSts, ribbingNeedleMm, gauge, options.is_cardigan)
  if (neckFinish.length > 0) {
    assemblySteps.push(...neckFinish)
  }
  assemblySteps.push(step('Weave in all ends. Block to measurements.', {
    row_type: 'finishing', rows_in_step: 1,
  }))
  sections.push({ name: 'Assembly & Finishing', sort_order: 3, steps: assemblySteps })
}

// ── Drop Shoulder construction ──

function buildDropShoulder(
  sections: SectionBlueprint[],
  gauge: Gauge,
  needleMm: number,
  ribbingNeedleMm: number,
  bodyK: number,
  neckSts: number,
  upperArmSts: number,
  wristSts: number,
  underarmCastOn: number,
  backLength: number,
  armLength: number,
  shoulderWidth: number,
  ribDiv: number,
  options: SweaterOptions,
  bodyShaping: string,
): void {
  // Drop shoulder: no armhole shaping on body, sleeve is straight rectangle
  const halfBody = nearestDivisible(Math.floor(bodyK / 2), ribDiv)
  const armholeDepth = 22 // slightly deeper for dropped shoulders

  // ── Back ──
  const backSteps: StepBlueprint[] = []
  resetSteps()
  backSteps.push(step(
    `Cast on ${halfBody} stitches on ${ribbingNeedleMm}mm needles`,
    { stitch_count: halfBody, row_type: 'setup', rows_in_step: 1 },
  ))
  const hemWithoutBO = buildHemSection(options.hem_style, halfBody, ribbingNeedleMm, gauge, 'Hem')
    .filter(s => !s.description.toLowerCase().includes('bind off'))
  backSteps.push(...hemWithoutBO)
  backSteps.push(step(`Switch to ${needleMm}mm needles`, {
    stitch_count: halfBody, row_type: 'setup', rows_in_step: 1,
  }))
  backSteps.push(step(
    `Work in stockinette until piece measures ${Math.round(backLength)}cm from cast-on (no armhole shaping)`,
    { stitch_count: halfBody, row_type: 'work_to_measurement', target_measurement_cm: Math.round(backLength), math_notes: 'Drop shoulder: body is a simple rectangle' },
  ))
  const shoulderSts = Math.floor((halfBody - Math.round(neckSts * 0.3)) / 2)
  backSteps.push(step(
    `Bind off ${shoulderSts} sts at beginning of next 2 rows. Bind off remaining ${halfBody - shoulderSts * 2} back neck stitches.`,
    { stitch_count: 0, row_type: 'finishing', rows_in_step: 3 },
  ))
  sections.push({ name: 'Back', sort_order: 0, steps: backSteps })

  // ── Front ──
  const frontSteps: StepBlueprint[] = []
  resetSteps()
  const frontNeckBO = nearestDivisible(Math.round(halfBody * 0.25), 2)
  frontSteps.push(step(
    `Cast on ${halfBody} stitches. Work hem and stockinette to match back, minus 8cm for neck shaping.`,
    { stitch_count: halfBody, row_type: 'setup', rows_in_step: 1 },
  ))
  frontSteps.push(step(
    `When piece measures ${Math.round(backLength - 8)}cm, bind off center ${frontNeckBO} sts. Work each side separately, dec 1 st at neck every RS row 3 times.`,
    { stitch_count: shoulderSts, row_type: 'work_rows', rows_in_step: null },
  ))
  frontSteps.push(step(
    `At matching length, bind off ${shoulderSts} shoulder sts`,
    { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
  ))
  sections.push({ name: 'Front', sort_order: 1, steps: frontSteps })

  // ── Sleeves ──
  if (options.sleeve_style !== 'sleeveless') {
    // Drop shoulder sleeves: straight rectangle, no cap shaping
    const sleeveWidth = cmToStitches(armholeDepth, gauge) // sleeve width = armhole depth
    const sleeveWidthSts = nearestDivisible(sleeveWidth, ribDiv)
    const sleeveLengthCm = options.sleeve_style === 'short' ? 10
      : options.sleeve_style === 'three_quarter' ? armLength * 0.65
      : armLength - 5

    const sleeveSteps: StepBlueprint[] = []
    resetSteps()
    sleeveSteps.push(step(
      `Cast on ${wristSts} stitches on ${ribbingNeedleMm}mm needles`,
      { stitch_count: wristSts, row_type: 'setup', rows_in_step: 1 },
    ))
    const sleeveBody = buildSleeveSteps(wristSts, sleeveWidthSts, sleeveLengthCm, needleMm, ribbingNeedleMm, gauge, options)
    // Reverse taper direction: bottom-up increases from wrist to shoulder width
    sleeveSteps.push(step(`Switch to ${needleMm}mm needles`, {
      stitch_count: wristSts, row_type: 'setup', rows_in_step: 1,
    }))
    const sleeveRows = cmToRows(sleeveLengthCm, gauge)
    const taper = calculateTaper(wristSts, sleeveWidthSts, sleeveRows)
    if (taper.total_decreases > 0) {
      sleeveSteps.push(step(
        `Increase 1 st each side every ${taper.decrease_every_n_rows} rows, ${taper.total_decreases} times`,
        { stitch_count: sleeveWidthSts, row_type: 'repeat', rows_in_step: sleeveRows, is_repeat: true, repeat_count: taper.total_decreases, rows_per_repeat: taper.decrease_every_n_rows, math_notes: `${wristSts} → ${sleeveWidthSts} sts` },
      ))
    }
    sleeveSteps.push(step('Bind off all stitches (no cap shaping for drop shoulder)', {
      stitch_count: 0, row_type: 'finishing', rows_in_step: 1,
    }))
    sections.push({ name: 'Sleeves (make 2)', sort_order: 2, steps: sleeveSteps })
  }

  // ── Assembly ──
  const asmSteps: StepBlueprint[] = []
  resetSteps()
  asmSteps.push(step('Seam shoulders', { row_type: 'finishing', rows_in_step: 1 }))
  if (options.sleeve_style !== 'sleeveless') {
    asmSteps.push(step('Center sleeve at shoulder seam, sew sleeve top to body (no easing needed). Seam sleeve and side seams.', {
      row_type: 'finishing', rows_in_step: 1, math_notes: 'Drop shoulder: sleeve attaches flat',
    }))
  }
  const neckFinish = buildNeckbandSteps(options.neckline, neckSts, ribbingNeedleMm, gauge, options.is_cardigan)
  if (neckFinish.length > 0) asmSteps.push(...neckFinish)
  asmSteps.push(step('Weave in all ends. Block to measurements.', { row_type: 'finishing', rows_in_step: 1 }))
  sections.push({ name: 'Assembly & Finishing', sort_order: 3, steps: asmSteps })
}

// ── Set-In Sleeve construction ──

function buildSetInSleeve(
  sections: SectionBlueprint[],
  gauge: Gauge,
  needleMm: number,
  ribbingNeedleMm: number,
  bodyK: number,
  neckSts: number,
  upperArmSts: number,
  wristSts: number,
  underarmCastOn: number,
  backLength: number,
  armLength: number,
  shoulderWidth: number,
  ribDiv: number,
  options: SweaterOptions,
  bodyShaping: string,
): void {
  // Set-in sleeve: shaped armhole + shaped sleeve cap (most tailored)
  const halfBody = nearestDivisible(Math.floor(bodyK / 2), ribDiv)
  const armholeDepth = 20

  // ── Back ──
  const backSteps: StepBlueprint[] = []
  resetSteps()
  backSteps.push(step(
    `Cast on ${halfBody} stitches on ${ribbingNeedleMm}mm needles`,
    { stitch_count: halfBody, row_type: 'setup', rows_in_step: 1 },
  ))
  const hemWithoutBO = buildHemSection(options.hem_style, halfBody, ribbingNeedleMm, gauge, 'Hem')
    .filter(s => !s.description.toLowerCase().includes('bind off'))
  backSteps.push(...hemWithoutBO)
  backSteps.push(step(`Switch to ${needleMm}mm needles`, { stitch_count: halfBody, row_type: 'setup', rows_in_step: 1 }))

  const bodyToArmhole = Math.max(5, backLength - armholeDepth - 5)
  backSteps.push(step(
    `Work in stockinette until piece measures ${Math.round(bodyToArmhole)}cm from hem`,
    { stitch_count: halfBody, row_type: 'work_to_measurement', target_measurement_cm: Math.round(bodyToArmhole) },
  ))

  // Set-in armhole: BO + gradual decreases
  const armholeBO = nearestDivisible(Math.round(halfBody * 0.06), 2)
  const gradualDec = 3 // additional single decreases at armhole edge
  const afterArmhole = halfBody - armholeBO * 2 - gradualDec * 2
  backSteps.push(step(
    `Bind off ${armholeBO} sts at beginning of next 2 rows`,
    { stitch_count: halfBody - armholeBO * 2, row_type: 'work_rows', rows_in_step: 2 },
  ))
  backSteps.push(step(
    `Decrease 1 st each side every RS row ${gradualDec} times for armhole curve`,
    { stitch_count: afterArmhole, row_type: 'work_rows', rows_in_step: gradualDec * 2, math_notes: `Shaped armhole: ${afterArmhole} sts` },
  ))
  backSteps.push(step(
    `Work even until armhole measures ${armholeDepth}cm`,
    { stitch_count: afterArmhole, row_type: 'work_to_measurement', target_measurement_cm: armholeDepth },
  ))
  const shoulderSts = Math.floor((afterArmhole - Math.round(neckSts * 0.3)) / 2)
  backSteps.push(step(
    `Shape shoulders: Bind off ${Math.floor(shoulderSts / 2)} sts at beginning of next 4 rows. Bind off remaining ${afterArmhole - shoulderSts * 2} back neck sts.`,
    { stitch_count: 0, row_type: 'finishing', rows_in_step: 5, math_notes: 'Stepped shoulder bind-off for smoother seam' },
  ))
  sections.push({ name: 'Back', sort_order: 0, steps: backSteps })

  // ── Front ──
  const frontSteps: StepBlueprint[] = []
  resetSteps()
  const frontNeckBO = nearestDivisible(Math.round(afterArmhole * 0.25), 2)
  frontSteps.push(step(
    `Cast on ${halfBody} stitches. Work hem and body to match back to armhole. Shape armholes same as back.`,
    { stitch_count: afterArmhole, row_type: 'setup', rows_in_step: 1 },
  ))
  frontSteps.push(step(
    `When armhole measures ${armholeDepth - 8}cm, bind off center ${frontNeckBO} sts. Dec 1 st at neck edge every RS row 3 times each side.`,
    { stitch_count: shoulderSts, row_type: 'work_rows', rows_in_step: null },
  ))
  frontSteps.push(step(
    'Shape shoulders to match back.',
    { stitch_count: 0, row_type: 'finishing', rows_in_step: 1 },
  ))
  sections.push({ name: 'Front', sort_order: 1, steps: frontSteps })

  // ── Sleeves with cap ──
  if (options.sleeve_style !== 'sleeveless') {
    const sleeveSteps: StepBlueprint[] = []
    resetSteps()
    sleeveSteps.push(step(
      `Cast on ${wristSts} stitches on ${ribbingNeedleMm}mm needles`,
      { stitch_count: wristSts, row_type: 'setup', rows_in_step: 1 },
    ))
    const cuffWithoutBO = buildHemSection(options.hem_style, wristSts, ribbingNeedleMm, gauge, 'Cuff')
      .filter(s => !s.description.toLowerCase().includes('bind off'))
    sleeveSteps.push(...cuffWithoutBO)
    sleeveSteps.push(step(`Switch to ${needleMm}mm needles`, { stitch_count: wristSts, row_type: 'setup', rows_in_step: 1 }))

    const sleeveLengthCm = options.sleeve_style === 'short' ? 10
      : options.sleeve_style === 'three_quarter' ? armLength * 0.65
      : armLength - 5
    const sleeveRows = cmToRows(sleeveLengthCm, gauge)
    const taper = calculateTaper(wristSts, upperArmSts, sleeveRows)
    if (taper.total_decreases > 0) {
      sleeveSteps.push(step(
        `Increase 1 st each side every ${taper.decrease_every_n_rows} rows, ${taper.total_decreases} times`,
        { stitch_count: upperArmSts, row_type: 'repeat', rows_in_step: sleeveRows, is_repeat: true, repeat_count: taper.total_decreases, rows_per_repeat: taper.decrease_every_n_rows, math_notes: `${wristSts} → ${upperArmSts} sts` },
      ))
    }

    // Shaped cap
    const capSts = upperArmSts - armholeBO * 2
    sleeveSteps.push(step(
      `Sleeve cap: Bind off ${armholeBO} sts at beginning of next 2 rows`,
      { stitch_count: capSts, row_type: 'work_rows', rows_in_step: 2 },
    ))
    sleeveSteps.push(step(
      `Decrease 1 st each side every RS row until ${Math.max(6, Math.round(capSts * 0.25))} sts remain. Bind off ${Math.round(capSts * 0.1)} sts at beginning of next 4 rows. Bind off remaining sts.`,
      { stitch_count: 0, row_type: 'work_rows', rows_in_step: null, math_notes: 'Shaped cap: gradual then steep decreases' },
    ))
    sections.push({ name: 'Sleeves (make 2)', sort_order: 2, steps: sleeveSteps })
  }

  // ── Assembly ──
  const asmSteps: StepBlueprint[] = []
  resetSteps()
  asmSteps.push(step('Seam shoulders', { row_type: 'finishing', rows_in_step: 1 }))
  if (options.sleeve_style !== 'sleeveless') {
    asmSteps.push(step('Ease sleeve cap into armhole, pin and seam. Seam sleeve and side seams.', {
      row_type: 'finishing', rows_in_step: 1, math_notes: 'Set-in cap must be eased to fit curved armhole',
    }))
  }
  const neckFinish = buildNeckbandSteps(options.neckline, neckSts, ribbingNeedleMm, gauge, options.is_cardigan)
  if (neckFinish.length > 0) asmSteps.push(...neckFinish)
  asmSteps.push(step('Weave in all ends. Block to measurements.', { row_type: 'finishing', rows_in_step: 1 }))
  sections.push({ name: 'Assembly & Finishing', sort_order: 3, steps: asmSteps })
}

// ─── Master build function ──────────────────────────────────────────────────

export function buildBlueprint(
  projectType: string,
  gauge: Gauge,
  needleMm: number,
  sizes: SizeSpec[],
  options: ProjectOptions | Record<string, unknown>,
): PatternBlueprint {
  switch (projectType) {
    case 'hat':
      return buildHatBlueprint(gauge, needleMm, sizes, options as unknown as HatOptions)
    case 'sweater':
      return buildSweaterBlueprint(gauge, needleMm, sizes, options as unknown as SweaterOptions)
    case 'socks':
      return buildSockBlueprint(gauge, needleMm, sizes, options as unknown as SockOptions)
    case 'mittens':
      return buildMittenBlueprint(gauge, needleMm, sizes, options as unknown as MittenOptions)
    case 'scarf_cowl':
      return buildScarfCowlBlueprint(gauge, needleMm, sizes, options as unknown as ScarfCowlOptions)
    case 'blanket':
      return buildBlanketBlueprint(gauge, needleMm, sizes, options as unknown as BlanketOptions)
    default:
      throw new Error(`Unknown project type: ${projectType}`)
  }
}
