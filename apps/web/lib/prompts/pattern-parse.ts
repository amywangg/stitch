// Knitting abbreviation glossary injected into parsing prompts
const KNITTING_ABBREVIATIONS = `
k=knit, p=purl, st/sts=stitch/stitches, yo=yarn over, k2tog=knit 2 together,
ssk=slip slip knit, sl=slip, pm=place marker, sm=slip marker, co=cast on,
bo=bind off, rs=right side, ws=wrong side, inc=increase, dec=decrease,
rep=repeat, rnd/rnds=round/rounds, kfb=knit front and back, m1l=make 1 left,
m1r=make 1 right, tbl=through back loop, wyif=with yarn in front, wyib=with yarn in back
`.trim()

/**
 * Stage 1: Extract metadata from raw PDF text.
 * Fast — returns title, gauge, sizes with measurements, section names.
 * Does NOT parse row-by-row instructions.
 */
export function buildMetadataPrompt(rawText: string): {
  system: string
  user: string
} {
  return {
    system: `You are an expert knitting/crochet pattern parser. Extract structured metadata from raw pattern text.
Common abbreviations: ${KNITTING_ABBREVIATIONS}
Always respond with valid JSON matching the exact schema requested.
If a value is not found in the text, use null. Never guess or fabricate data.
Sizes may be listed as XS/S/M/L/XL, numerical (32/34/36/38), or descriptive.
Finished measurements are the dimensions of the completed garment, NOT body measurements.
Convert all measurements to cm. If given in inches, multiply by 2.54.`,

    user: `Parse this knitting pattern and extract ONLY metadata (no row-by-row instructions).
Return JSON with this exact shape:
{
  "title": string | null,
  "designer": string | null,
  "craft_type": "knitting" | "crochet",
  "difficulty": "beginner" | "easy" | "intermediate" | "advanced" | "experienced" | null,
  "garment_type": string | null,
  "yarn_weight": string | null,
  "gauge": {
    "stitches_per_10cm": number | null,
    "rows_per_10cm": number | null,
    "needle_size_mm": number | null
  } | null,
  "sizes": [
    {
      "name": "XS",
      "finished_bust_cm": number | null,
      "finished_length_cm": number | null,
      "hip_cm": number | null,
      "shoulder_width_cm": number | null,
      "arm_length_cm": number | null,
      "upper_arm_cm": number | null,
      "back_length_cm": number | null,
      "head_circumference_cm": number | null,
      "foot_length_cm": number | null,
      "yardage": number | null
    }
  ],
  "sections": [
    {
      "name": "Body",
      "estimated_rows": number | null
    }
  ],
  "notes": string | null
}

Pattern text:
${rawText.slice(0, 12000)}`,
  }
}

export type ParsedMetadata = {
  title: string | null
  designer: string | null
  craft_type: 'knitting' | 'crochet'
  difficulty: 'beginner' | 'easy' | 'intermediate' | 'advanced' | 'experienced' | null
  garment_type: string | null
  yarn_weight: string | null
  gauge: {
    stitches_per_10cm: number | null
    rows_per_10cm: number | null
    needle_size_mm: number | null
  } | null
  sizes: {
    name: string
    finished_bust_cm: number | null
    finished_length_cm: number | null
    hip_cm: number | null
    shoulder_width_cm: number | null
    arm_length_cm: number | null
    upper_arm_cm: number | null
    back_length_cm: number | null
    head_circumference_cm: number | null
    foot_length_cm: number | null
    yardage: number | null
  }[]
  sections: {
    name: string
    estimated_rows: number | null
  }[]
  notes: string | null
}

/**
 * Stage 2: Parse instruction steps for a specific size.
 * Each "step" is an instruction block — NOT an individual row.
 * Steps can be one-off actions, fixed row groups, repeats, or open-ended work.
 */
export function buildSizeParsePrompt(
  rawText: string,
  sizeName: string,
  sectionNames: string[]
): {
  system: string
  user: string
} {
  return {
    system: `You are an expert knitting/crochet pattern parser. You extract INSTRUCTION STEPS from patterns.

Common abbreviations: ${KNITTING_ABBREVIATIONS}

CRITICAL CONCEPT: A "step" is NOT the same as a "row." A step is a block of instructions that the knitter works through before moving on. Types of steps:

1. "setup" — One-time actions: cast on, join in round, slip stitches, pick up stitches, break yarn, place markers. Takes 1 tap to mark complete.
   rows_in_step: 1

2. "work_rows" — A specific set of rows to work through: "Row 1: Purl across. Row 2: Knit across. Row 3: Purl across." The knitter taps once per row.
   rows_in_step: (number of rows in the group)

3. "repeat" — A block that repeats N times: "Work Rows 1-2 a total of 12 times." Each cycle has a certain number of rows. Knitter taps once per row within each repeat.
   rows_in_step: repeat_count × rows_per_repeat
   is_repeat: true
   repeat_count: 12
   rows_per_repeat: 2

4. "work_to_measurement" — Open-ended: "Work stockinette until piece measures 24cm." The knitter taps each row/round but decides when to stop.
   rows_in_step: null
   target_measurement_cm: 24

5. "finishing" — Final actions: bind off, seam, weave in ends. Takes 1 tap.
   rows_in_step: 1

RULES:
- Resolve ALL parenthetical size notation for size "${sizeName}". If sizes are XXS(XS)S(M)L(XL)2XL(3XL)4XL(5XL) and selected size is "${sizeName}", pick the correct number from the list.
- Example: "CO 120 (128) 134 (142) 148 (162) 176 (190) 204 (218) sts" → for size S → "CO 134 sts"
- Each step instruction should be concrete — no parenthetical alternatives remaining.
- Group related rows into a single step. Don't split "Row 1: K3, turn. Row 2: Purl to end." into separate steps — that's one "work_rows" step with rows_in_step=2.
- When the pattern says "Work Rows 1-6 once, then work Rows 5 and 6 another 5 times", that's TWO steps: one work_rows (rows 1-6, rows_in_step=6) and one repeat (rows 5-6, repeat_count=5, rows_per_repeat=2, rows_in_step=10).
- Stitch count = expected stitches on needle AFTER completing the step.
- Always respond with valid JSON.`,

    user: `Parse the following pattern for size "${sizeName}" only.
The pattern has these sections: ${JSON.stringify(sectionNames)}

Return JSON with this exact shape:
{
  "sections": [
    {
      "name": "Back Yoke",
      "steps": [
        {
          "step_number": 1,
          "instruction": "CO 134 sts on 3mm / 80cm circular needle",
          "stitch_count": 134,
          "row_type": "setup",
          "rows_in_step": 1,
          "is_repeat": false,
          "repeat_count": null,
          "rows_per_repeat": null,
          "target_measurement_cm": null,
          "notes": null
        },
        {
          "step_number": 4,
          "instruction": "Short row shaping:\\nRS: Knit to 3 sts past last RS turn, turn\\nWS: Purl to 3 sts past last WS turn, turn",
          "stitch_count": 134,
          "row_type": "repeat",
          "rows_in_step": 24,
          "is_repeat": true,
          "repeat_count": 12,
          "rows_per_repeat": 2,
          "target_measurement_cm": null,
          "notes": "On the last repeat there are 3 sts left on the needle"
        },
        {
          "step_number": 5,
          "instruction": "Work stockinette stitch (knit RS, purl WS) across all sts until piece measures 24cm from cast on edge",
          "stitch_count": 134,
          "row_type": "work_to_measurement",
          "rows_in_step": null,
          "is_repeat": false,
          "repeat_count": null,
          "rows_per_repeat": null,
          "target_measurement_cm": 24,
          "notes": "Last row should be a WS row"
        }
      ]
    }
  ]
}

Pattern text:
${rawText.slice(0, 20000)}`,
  }
}

export type ParsedSizeInstructions = {
  sections: {
    name: string
    steps: {
      step_number: number
      instruction: string
      stitch_count: number | null
      row_type: string | null
      rows_in_step: number | null
      is_repeat: boolean
      repeat_count: number | null
      rows_per_repeat: number | null
      target_measurement_cm: number | null
      notes: string | null
    }[]
  }[]
}
