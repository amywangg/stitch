import OpenAI from 'openai'

// Singleton OpenAI client
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Knitting abbreviation glossary injected into the system prompt
const KNITTING_ABBREVIATIONS = `
k=knit, p=purl, st/sts=stitch/stitches, yo=yarn over, k2tog=knit 2 together,
ssk=slip slip knit, sl=slip, pm=place marker, sm=slip marker, co=cast on,
bo=bind off, rs=right side, ws=wrong side, inc=increase, dec=decrease,
rep=repeat, rnd/rnds=round/rounds, kfb=knit front and back, m1l=make 1 left,
m1r=make 1 right, tbl=through back loop, wyif=with yarn in front, wyib=with yarn in back
`.trim()

export type ParsedPattern = {
  title: string | null
  designer: string | null
  craft_type: 'knitting' | 'crochet'
  difficulty: 'beginner' | 'easy' | 'intermediate' | 'advanced' | 'experienced' | null
  garment_type: string | null
  gauge: {
    stitches_per_10cm: number | null
    rows_per_10cm: number | null
    needle_size_mm: number | null
    yarn_weight: string | null
  } | null
  sizes: string[]
  sections: {
    name: string
    rows: { row_number: number; instruction: string }[]
  }[]
  notes: string | null
}

/**
 * Uses GPT-4o to parse raw PDF text into a structured knitting pattern.
 */
export async function parsePatternWithAI(rawText: string): Promise<ParsedPattern> {
  const systemPrompt = `You are an expert knitting pattern parser. Extract structured data from raw knitting pattern text.
Common abbreviations: ${KNITTING_ABBREVIATIONS}
Always respond with valid JSON matching the exact schema requested.`

  const userPrompt = `Parse this knitting pattern into structured JSON with this exact shape:
{
  "title": string | null,
  "designer": string | null,
  "craft_type": "knitting" | "crochet",
  "difficulty": "beginner" | "easy" | "intermediate" | "advanced" | "experienced" | null,
  "garment_type": string | null,
  "gauge": { "stitches_per_10cm": number | null, "rows_per_10cm": number | null, "needle_size_mm": number | null, "yarn_weight": string | null } | null,
  "sizes": string[],
  "sections": [{ "name": string, "rows": [{ "row_number": number, "instruction": string }] }],
  "notes": string | null
}

Pattern text:
${rawText.slice(0, 12000)}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = completion.choices[0].message.content ?? '{}'
  return JSON.parse(content) as ParsedPattern
}
