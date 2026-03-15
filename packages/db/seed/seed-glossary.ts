import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '../src/generated/client'

const prisma = new PrismaClient()

interface GlossarySynonymEntry {
  synonym: string
  region?: string | null
}

interface GlossaryTermEntry {
  abbreviation?: string | null
  name: string
  slug: string
  category: string
  craft_type?: string
  definition: string
  how_to?: string | null
  tips?: string | null
  video_url?: string | null
  video_start_s?: number | null
  video_end_s?: number | null
  video_is_short?: boolean
  video_alternates?: string[]
  difficulty?: string
  synonyms?: GlossarySynonymEntry[]
}

async function main() {
  const glossaryDir = join(__dirname, 'glossary')
  const files = readdirSync(glossaryDir).filter((f) => f.endsWith('.json'))

  console.log(`Found ${files.length} glossary JSON file(s)`)

  let totalTerms = 0
  let totalSynonyms = 0

  for (const file of files) {
    const filePath = join(glossaryDir, file)
    const raw = readFileSync(filePath, 'utf-8')
    const terms: GlossaryTermEntry[] = JSON.parse(raw)

    console.log(`\nProcessing ${file}: ${terms.length} term(s)`)

    for (const [index, entry] of terms.entries()) {
      const term = await prisma.glossary_terms.upsert({
        where: { slug: entry.slug },
        update: {
          abbreviation: entry.abbreviation ?? null,
          name: entry.name,
          category: entry.category,
          craft_type: entry.craft_type ?? 'both',
          definition: entry.definition,
          how_to: entry.how_to ?? null,
          tips: entry.tips ?? null,
          video_url: entry.video_url ?? null,
          video_start_s: entry.video_start_s ?? null,
          video_end_s: entry.video_end_s ?? null,
          video_is_short: entry.video_is_short ?? false,
          video_alternates: entry.video_alternates ?? [],
          difficulty: entry.difficulty ?? 'beginner',
          sort_order: index,
        },
        create: {
          abbreviation: entry.abbreviation ?? null,
          name: entry.name,
          slug: entry.slug,
          category: entry.category,
          craft_type: entry.craft_type ?? 'both',
          definition: entry.definition,
          how_to: entry.how_to ?? null,
          tips: entry.tips ?? null,
          video_url: entry.video_url ?? null,
          video_start_s: entry.video_start_s ?? null,
          video_end_s: entry.video_end_s ?? null,
          video_is_short: entry.video_is_short ?? false,
          video_alternates: entry.video_alternates ?? [],
          difficulty: entry.difficulty ?? 'beginner',
          sort_order: index,
        },
      })

      totalTerms++

      // Delete existing synonyms for this term, then recreate
      await prisma.glossary_synonyms.deleteMany({
        where: { term_id: term.id },
      })

      if (entry.synonyms && entry.synonyms.length > 0) {
        await prisma.glossary_synonyms.createMany({
          data: entry.synonyms.map((syn) => ({
            term_id: term.id,
            synonym: syn.synonym,
            region: syn.region ?? null,
          })),
        })
        totalSynonyms += entry.synonyms.length
      }
    }
  }

  console.log(`\nGlossary seed complete: ${totalTerms} terms, ${totalSynonyms} synonyms`)
}

main()
  .catch((e) => {
    console.error('Glossary seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
