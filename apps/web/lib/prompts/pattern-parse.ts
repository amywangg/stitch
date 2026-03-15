// Comprehensive knitting/crochet abbreviation glossary injected into parsing prompts.
// Source: Craft Yarn Council standard abbreviations + common pattern conventions.
const KNITTING_ABBREVIATIONS = `
BASIC STITCHES & ACTIONS:
k=knit, p=purl, st/sts=stitch/stitches, sl=slip, sl1k=slip 1 knitwise, sl1p=slip 1 purlwise,
sl st=slip stitch, yo=yarn over, byo=backward yarn over, yon=yarn over needle, yrn=yarn round needle,
co=cast on, bo=bind off, kwise=knitwise, pwise=purlwise, tog=together,
tbl=through back loop, tfl=through front loop

INCREASES:
inc=increase, kfb=knit 1 into front and back (single knit increase),
pfb=purl 1 into front and back (single purl increase),
M1/M1K=make one knitwise (single knit increase),
M1L=make one left (single left-leaning knit increase),
M1R=make one right (single right-leaning knit increase),
M1p=make one purlwise (single purl increase),
M1lp/M1LP=make one left purlwise, M1rp/M1RP=make one right purlwise,
k1B=knit stitch in row below,
LLI=left lifted increase, RLI=right lifted increase

DECREASES:
dec=decrease, k2tog=knit 2 together (single right-leaning decrease),
p2tog=purl 2 together (single decrease),
ssk=slip 2 knitwise then knit together through back loops (single left-leaning decrease),
ssp=slip 2 knitwise then purl together through back loops (single left-leaning decrease),
sssk=slip 3 knitwise then knit together through back loops (double left-leaning decrease),
sssp=slip 3 knitwise then purl together through back loops (double left-leaning decrease),
SKP/skp=slip 1 knitwise knit 1 pass slip stitch over (single left-leaning decrease),
SK2P=slip 1 knitwise knit 2 together pass slip stitch over (double left-leaning decrease),
S2KP2=slip 2 as if to k2tog knit 1 pass 2 slipped stitches over (centered double decrease),
SSPP2=centered double purl decrease,
ksp=knit 1 slip back pass second stitch over (single right-leaning decrease),
psso=pass slipped stitch over, p2sso=pass 2 slipped stitches over

CABLES:
cn=cable needle, C2/C4/C6=cable over 2/4/6 stitches (pattern defines direction),
C2F/C2B=cable 2 front/back, C4F/C4B=cable 4 front/back

STITCH PATTERNS:
St st=stockinette stitch, rev St st=reverse stockinette stitch,
w&t=wrap and turn, GSR=German short row

COLORWORK:
MC=main color, CC/CC1/CC2=contrasting color(s),
intarsia=separate yarn sections, stranded=carry yarn across back (Fair Isle technique),
color dominance=which yarn is held in which hand affects appearance

CROCHET-SPECIFIC:
ch=chain, sc=single crochet, dc=double crochet, hdc=half double crochet,
tr/tc=treble/triple crochet, sl st=slip stitch, FPdc=front post double crochet,
BPdc=back post double crochet, FPtr=front post treble crochet, BPtr=back post treble crochet,
puff st=puff stitch, bob=bobble, pc=popcorn, sk=skip, sp=space,
turning ch=turning chain (ch at row start to gain height)

MARKERS & TOOLS:
pm=place marker, sm=slip marker, m=marker,
dpn/dpns=double-pointed needle(s), LH=left hand, RH=right hand

YARN POSITION:
wyib=with yarn in back, wyif=with yarn in front, yb=yarn back, yfwd/yf=yarn forward

PATTERN STRUCTURE:
rs=right side, ws=wrong side, rnd/rnds=round/rounds, alt=alternate,
approx=approximately, beg=beginning, bet=between, cont=continue,
foll=follow, lp=loop, pat/patt=pattern, prev=previous, rem=remaining,
rep=repeat

CONSTRUCTION:
i-cord=knitted cord worked on dpns or circular needles,
picking up stitches=inserting needle through edge and drawing through a loop,
grafting/Kitchener stitch=joining live stitches seamlessly,
short rows=partial rows for shaping (W&T or German short rows),
steek=reinforced cut line in colorwork

NOTATION:
* = repeat instructions following the asterisk as directed
** = repeat instructions between asterisks as directed
{} [] () = work instructions within brackets as many times as directed,
  or work a group of stitches all in the same stitch or space

MEASUREMENTS:
" or in=inch, cm=centimeter, g=gram, m=meter, mm=millimeter, oz=ounce, yd=yard

REGIONAL DIFFERENCES (US vs Canada/UK):
US "bind off" = Canada/UK "cast off"
US "gauge" = Canada/UK "tension"
US "slip stitch (sl st)" = Canada/UK "slip stitch (ss)"
US crochet terms differ from UK: US sc = UK dc, US dc = UK tr, US hdc = UK htr
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

SIZE NOTATION FORMATS — patterns use many conventions, you must handle all:
- Alternating parentheses: "XS (S) M (L) XL (2XL)" — sizes alternate in/out of parens
- Comma-separated in parens: "XS (S, M, L, XL, 2XL)" — first size outside, rest inside
- Semicolons: "Small (Medium; Large; X-Large)"
- Numbered sizes: "1 (2, 3, 4, 5, 6, 7, 8, 9, 10)" — common in European patterns
- Slash-separated: "S/M/L/XL"
- Shoe sizes: EU 36-37 (38-39, 40-41, 42-43) — common for sock patterns
- Descriptive: "One size" or "Newborn (3-6 months, 6-12 months)"
Extract ALL sizes listed in the pattern.

CRAFT TYPE DETECTION:
- Knitting: uses k, p, knit, purl, cast on, bind off, needles
- Crochet: uses ch, sc, dc, hdc, tr, hook, turning chain, front/back post stitches
- Look at the tools (needles vs hook) and stitch names to determine craft type

CONSTRUCTION METHOD — identify from the pattern structure:
- "top-down" = starts at neckline, works downward (common for raglan/yoke sweaters)
- "bottom-up" = starts at hem, works upward
- "flat" = worked back and forth in rows
- "in-the-round" = worked circularly on circular needles or DPNs
- "raglan" = diagonal shaping lines from neckline to underarm
- "set-in sleeve" = shaped armhole and sleeve cap
- "circular yoke" = round yoke with evenly distributed increases
- "toe-up" / "cuff-down" = sock construction direction

YARN & MULTI-STRAND:
- Detect when a pattern calls for multiple yarns held together (e.g., "hold together with a strand of mohair")
- Extract each yarn separately with its weight
- Note if yarns are "held together" or "held double"

CHARTS:
- PDF text extraction CANNOT read visual charts/grids. If you see references to "Chart A", "Chart B", or grid-like characters, note these in the sections list but mark estimated_rows as null.
- Charts are common in colorwork, lace, cable, and textured patterns.

Finished measurements are the dimensions of the completed garment, NOT body measurements.
Convert all measurements to cm. If given in inches, multiply by 2.54.`,

    user: `Parse this pattern and extract ONLY metadata (no row-by-row instructions).
Return JSON with this exact shape:
{
  "title": string | null,
  "designer": string | null,
  "craft_type": "knitting" | "crochet",
  "difficulty": "beginner" | "easy" | "intermediate" | "advanced" | "experienced" | null,
  "garment_type": string | null,
  "construction_method": string | null,
  "yarn_weight": string | null,
  "yarn_held_together": boolean,
  "yarns": [
    {
      "name": string | null,
      "weight": string | null,
      "fiber": string | null,
      "yardage_per_skein": number | null
    }
  ] | null,
  "gauge": {
    "stitches_per_10cm": number | null,
    "rows_per_10cm": number | null,
    "needle_size_mm": number | null,
    "hook_size_mm": number | null
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
      "foot_circumference_cm": number | null,
      "yardage": number | null
    }
  ],
  "sections": [
    {
      "name": "Body",
      "estimated_rows": number | null,
      "has_chart": boolean
    }
  ],
  "custom_stitches": [
    {
      "abbreviation": "C2",
      "definition": "Slip 1 to cable needle, hold in front, k1, k1 from cable needle"
    }
  ] | null,
  "notes": string | null
}

Pattern text:
${rawText.slice(0, 18000)}`,
  }
}

export type ParsedMetadata = {
  title: string | null
  designer: string | null
  craft_type: 'knitting' | 'crochet'
  difficulty: 'beginner' | 'easy' | 'intermediate' | 'advanced' | 'experienced' | null
  garment_type: string | null
  construction_method: string | null
  yarn_weight: string | null
  yarn_held_together: boolean
  yarns: {
    name: string | null
    weight: string | null
    fiber: string | null
    yardage_per_skein: number | null
  }[] | null
  gauge: {
    stitches_per_10cm: number | null
    rows_per_10cm: number | null
    needle_size_mm: number | null
    hook_size_mm: number | null
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
    foot_circumference_cm: number | null
    yardage: number | null
  }[]
  sections: {
    name: string
    estimated_rows: number | null
    has_chart: boolean
  }[]
  custom_stitches: {
    abbreviation: string
    definition: string
  }[] | null
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

1. "setup" — One-time actions: cast on, join in round, slip stitches, pick up stitches, break yarn, place markers, switch needles. Takes 1 tap to mark complete.
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

SIZE NOTATION — patterns use many different formats. You MUST identify which position corresponds to size "${sizeName}":
- Alternating parentheses: "XS (S) M (L) XL (2XL)" — sizes alternate in/out of parens, numbers follow same pattern: "120 (128) 134 (142) 148 (162)"
- Comma-separated in parens: "XS (S, M, L, XL)" — first value outside, rest comma-separated inside: "120 (128, 134, 142, 148)"
- Semicolons: "Small (Medium; Large; X-Large)" — "120 (128; 134; 142)"
- Numbered sizes: "Size 1 (2, 3, 4, 5)" — common in European patterns
- Dashes: "S-M-L-XL" with values "120-128-134-142"
Count the position of "${sizeName}" in the size list, then pick the value at that same position in every parenthetical group throughout the pattern.

SIMULTANEOUS INSTRUCTIONS:
Patterns often say "AT THE SAME TIME" or "while continuing to..." — this means two things happen in parallel:
- Example: "Continue raglan decreases every 2nd row, AT THE SAME TIME, when piece measures 15cm, begin neck shaping"
- Split these into the primary action step, then add a separate step for the secondary action with a note explaining the overlap
- The note should say exactly when the secondary action starts relative to the primary

CHART REFERENCES:
PDF text extraction CANNOT read visual charts. If instructions say "Work Chart A" or "Follow chart", include the step with the chart name in the instruction and set rows_in_step based on any stated row count for the chart. If no row count is given, set rows_in_step: null and add a note: "Chart not available from PDF — enter manually."

CROCHET PATTERNS:
For crochet, "rows" may be called "rounds" (for amigurumi/hats) or "rows" (for flat work). Treat each row/round as one tap. Turning chains count as the first stitch of a row in many patterns — note this in the instruction if the pattern specifies it.

LEFT/RIGHT MIRRORING:
For accessories like mittens, gloves, and socks, the pattern may have separate instructions for left and right. Parse only the instructions as written — if the pattern says "Work Left Mitten same as Right Mitten, reversing thumb placement", create a single step with that instruction and a note about the reversal.

CUSTOM STITCHES:
Patterns often define custom abbreviations (e.g., "C2: sl1 to cn, hold in front, k1, k1 from cn" or "Grass stitch: k into front, back, front of same st"). When you encounter these in instructions, use the pattern's abbreviation but expand it on first use.

RULES:
- Resolve ALL size-specific values for size "${sizeName}". Pick the correct number from every parenthetical group.
- Each step instruction should be concrete — no parenthetical alternatives remaining.
- Group related rows into a single step. Don't split "Row 1: K3, turn. Row 2: Purl to end." into separate steps — that's one "work_rows" step with rows_in_step=2.
- When the pattern says "Work Rows 1-6 once, then work Rows 5 and 6 another 5 times", that's TWO steps: one work_rows (rows 1-6, rows_in_step=6) and one repeat (rows 5-6, repeat_count=5, rows_per_repeat=2, rows_in_step=10).
- "Work even" or "work straight" means continue the established stitch pattern without increases or decreases.
- "Evenly distributed" increases/decreases (e.g., "increase 20 sts evenly across round") = 1 step of type "work_rows" with rows_in_step=1.
- Short rows (W&T or German short rows) should be grouped into a single step. Count each short row (including the turn) as one row.
- I-cord bind off or i-cord edges are "finishing" steps, not row-by-row work.
- Stitch count = expected stitches on needle/hook AFTER completing the step.
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
${rawText.slice(0, 30000)}`,
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
