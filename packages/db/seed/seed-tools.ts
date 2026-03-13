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

interface ProductLineSize {
  mm: number
  label: string
}

interface ProductLine {
  name: string
  type: string
  material?: string
  image_url?: string
  sizes: ProductLineSize[]
  lengths_cm: number[] | null
}

interface ProductLineBrand {
  brand: string
  product_lines: ProductLine[]
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

  // --- Seed product lines ---
  const plFilePath = join(__dirname, 'tool-product-lines.json')
  const plRaw = readFileSync(plFilePath, 'utf-8')
  const plBrands: ProductLineBrand[] = JSON.parse(plRaw)

  console.log(`\nLoaded ${plBrands.length} brand(s) from tool-product-lines.json`)

  for (const plBrand of plBrands) {
    console.log(`\nUpserting product lines for: ${plBrand.brand}`)

    const dbBrand = await prisma.tool_brands.upsert({
      where: { name: plBrand.brand },
      update: {},
      create: { name: plBrand.brand },
    })

    for (const pl of plBrand.product_lines) {
      console.log(`  Upserting product line: ${pl.name} (${pl.type})`)

      await prisma.tool_product_lines.upsert({
        where: {
          brand_id_name: {
            brand_id: dbBrand.id,
            name: pl.name,
          },
        },
        update: {
          type: pl.type,
          material: pl.material ?? null,
          sizes: pl.sizes as any,
          lengths_cm: pl.lengths_cm as any,
          image_url: pl.image_url ?? null,
        },
        create: {
          brand_id: dbBrand.id,
          name: pl.name,
          type: pl.type,
          material: pl.material ?? null,
          sizes: pl.sizes as any,
          lengths_cm: pl.lengths_cm as any,
          image_url: pl.image_url ?? null,
        },
      })
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
