import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '../src/generated/client'

const prisma = new PrismaClient()

interface TutorialStepEntry {
  step_number: number
  title: string
  content: string
  image_url?: string | null
  video_url?: string | null
}

interface TutorialEntry {
  slug: string
  title: string
  description?: string | null
  category: string
  craft_type?: string
  difficulty?: string
  sort_order?: number
  steps: TutorialStepEntry[]
}

async function main() {
  const tutorialsDir = join(__dirname, 'tutorials')
  const files = readdirSync(tutorialsDir).filter((f) => f.endsWith('.json'))

  console.log(`Found ${files.length} tutorial JSON file(s)`)

  let totalTutorials = 0
  let totalSteps = 0

  for (const file of files) {
    const filePath = join(tutorialsDir, file)
    const raw = readFileSync(filePath, 'utf-8')
    const tutorials: TutorialEntry[] = JSON.parse(raw)

    console.log(`\nProcessing ${file}: ${tutorials.length} tutorial(s)`)

    for (const [index, entry] of tutorials.entries()) {
      const tutorial = await prisma.tutorials.upsert({
        where: { slug: entry.slug },
        update: {
          title: entry.title,
          description: entry.description ?? null,
          category: entry.category,
          craft_type: entry.craft_type ?? 'both',
          difficulty: entry.difficulty ?? 'beginner',
          sort_order: entry.sort_order ?? index,
          is_published: true,
        },
        create: {
          slug: entry.slug,
          title: entry.title,
          description: entry.description ?? null,
          category: entry.category,
          craft_type: entry.craft_type ?? 'both',
          difficulty: entry.difficulty ?? 'beginner',
          sort_order: entry.sort_order ?? index,
          is_published: true,
        },
      })

      totalTutorials++

      // Delete existing steps for this tutorial, then recreate
      await prisma.tutorial_steps.deleteMany({
        where: { tutorial_id: tutorial.id },
      })

      if (entry.steps.length > 0) {
        await prisma.tutorial_steps.createMany({
          data: entry.steps.map((step) => ({
            tutorial_id: tutorial.id,
            step_number: step.step_number,
            title: step.title,
            content: step.content,
            image_url: step.image_url ?? null,
            video_url: step.video_url ?? null,
          })),
        })
        totalSteps += entry.steps.length
      }
    }
  }

  console.log(`\nTutorial seed complete: ${totalTutorials} tutorials, ${totalSteps} steps`)
}

main()
  .catch((e) => {
    console.error('Tutorial seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
