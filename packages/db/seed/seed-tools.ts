import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '../src/generated/client'

const prisma = new PrismaClient()

interface ToolSetItem {
  type: string
  size_mm: number
  size_label?: string
  length_cm?: number
  material?: string
  quantity?: number
  sort_order?: number
}

interface ToolSet {
  name: string
  set_type: string
  description?: string
  image_url?: string
  items: ToolSetItem[]
}

interface Brand {
  brand: string
  website?: string
  logo_url?: string
  sets: ToolSet[]
}

async function main() {
  const filePath = join(__dirname, 'tool-sets.json')
  const raw = readFileSync(filePath, 'utf-8')
  const brands: Brand[] = JSON.parse(raw)

  console.log(`Loaded ${brands.length} brand(s) from tool-sets.json`)

  for (const brand of brands) {
    console.log(`\nUpserting brand: ${brand.brand}`)

    const dbBrand = await prisma.tool_brands.upsert({
      where: { name: brand.brand },
      update: { website: brand.website ?? null, logo_url: brand.logo_url ?? null },
      create: {
        name: brand.brand,
        website: brand.website ?? null,
        logo_url: brand.logo_url ?? null,
      },
    })

    console.log(`  Brand ID: ${dbBrand.id}`)

    for (const set of brand.sets) {
      console.log(`  Upserting set: ${set.name} (${set.set_type})`)

      const dbSet = await prisma.tool_sets.upsert({
        where: {
          brand_id_name: {
            brand_id: dbBrand.id,
            name: set.name,
          },
        },
        update: {
          set_type: set.set_type,
          description: set.description ?? null,
          image_url: set.image_url ?? null,
          source: 'seed',
        },
        create: {
          brand_id: dbBrand.id,
          name: set.name,
          set_type: set.set_type,
          description: set.description ?? null,
          image_url: set.image_url ?? null,
          source: 'seed',
        },
      })

      console.log(`    Set ID: ${dbSet.id}`)

      // Delete existing items for this set, then recreate
      const deleted = await prisma.tool_set_items.deleteMany({
        where: { set_id: dbSet.id },
      })
      console.log(`    Deleted ${deleted.count} existing item(s)`)

      if (set.items.length > 0) {
        await prisma.tool_set_items.createMany({
          data: set.items.map((item, index) => ({
            set_id: dbSet.id,
            type: item.type,
            size_mm: item.size_mm ?? 0,
            size_label: item.size_label ?? null,
            length_cm: item.length_cm ?? null,
            material: item.material ?? null,
            quantity: item.quantity ?? 1,
            sort_order: item.sort_order ?? index,
          })),
        })
        console.log(`    Created ${set.items.length} item(s)`)
      }
    }
  }

  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
