/**
 * Seed script for 6 test personas.
 * Run: npx tsx packages/db/seed-personas.ts
 */
import { PrismaClient } from './src/generated/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding 6 test personas...\n')

  // 1. Sarah — Pro + Ravelry (power knitter)
  const sarah = await prisma.users.upsert({
    where: { email: 'sarah@test.stitch.app' },
    update: {},
    create: {
      clerk_id: 'test_sarah_knits',
      email: 'sarah@test.stitch.app',
      username: 'sarah_knits',
      display_name: 'Sarah Mitchell',
      bio: 'Knitting since 2008. Sweater obsessed. Malabrigo hoarder.',
      location: 'Portland, OR',
      craft_preference: 'knitting',
      experience_level: 'advanced',
      is_pro: true,
    },
  })
  await prisma.subscriptions.upsert({
    where: { user_id: sarah.id },
    update: { plan: 'pro' },
    create: { user_id: sarah.id, plan: 'pro', status: 'active', period_type: 'yearly' },
  })

  // Sarah's projects
  const sarahProject1 = await prisma.projects.create({
    data: {
      user_id: sarah.id,
      slug: 'portland-pullover',
      title: 'Portland pullover',
      status: 'active',
      craft_type: 'knitting',
      description: 'Top-down raglan in worsted weight. Using leftover Cascade 220.',
    },
  })
  await prisma.project_sections.create({
    data: { project_id: sarahProject1.id, name: 'Body', sort_order: 0, target_rows: 120, current_step: 47 },
  })

  const sarahProject2 = await prisma.projects.create({
    data: {
      user_id: sarah.id,
      slug: 'lace-shawl',
      title: 'Haruni lace shawl',
      status: 'completed',
      craft_type: 'knitting',
      started_at: new Date('2025-11-01'),
      finished_at: new Date('2026-01-15'),
    },
  })

  // Sarah's stash
  const malabrigo = await prisma.yarn_companies.upsert({
    where: { name: 'Malabrigo' },
    update: {},
    create: { name: 'Malabrigo' },
  })
  const rios = await prisma.yarns.upsert({
    where: { id: 'seed-rios' },
    update: {},
    create: {
      id: 'seed-rios',
      name: 'Rios',
      company_id: malabrigo.id,
      weight: 'worsted',
      yardage_per_skein: 210,
      grams_per_skein: 100,
      fiber_content: '100% Superwash Merino',
    },
  })
  await prisma.user_stash.create({
    data: { user_id: sarah.id, yarn_id: rios.id, colorway: 'Archangel', skeins: 4, status: 'in_stash' },
  })
  await prisma.user_stash.create({
    data: { user_id: sarah.id, yarn_id: rios.id, colorway: 'Azul Profundo', skeins: 2, status: 'in_stash' },
  })

  // Sarah's needles
  await prisma.user_needles.createMany({
    data: [
      { user_id: sarah.id, type: 'circular', size_mm: 4.0, size_label: 'US 6', length_cm: 80, material: 'metal', brand: 'ChiaoGoo' },
      { user_id: sarah.id, type: 'circular', size_mm: 3.75, size_label: 'US 5', length_cm: 60, material: 'metal', brand: 'ChiaoGoo' },
      { user_id: sarah.id, type: 'dpn', size_mm: 3.25, size_label: 'US 3', material: 'bamboo', brand: 'Clover' },
      { user_id: sarah.id, type: 'straight', size_mm: 5.0, size_label: 'US 8', material: 'wood', brand: 'Knit Picks' },
    ],
  })

  console.log('✓ Sarah (Pro + Ravelry)')

  // 2. Maya — Plus + Ravelry (intermediate)
  const maya = await prisma.users.upsert({
    where: { email: 'maya@test.stitch.app' },
    update: {},
    create: {
      clerk_id: 'test_maya_crafts',
      email: 'maya@test.stitch.app',
      username: 'maya_crafts',
      display_name: 'Maya Chen',
      bio: 'Knitting my way through grad school. Always 3 projects going.',
      location: 'San Francisco, CA',
      craft_preference: 'knitting',
      experience_level: 'intermediate',
      is_pro: false,
    },
  })
  await prisma.subscriptions.upsert({
    where: { user_id: maya.id },
    update: { plan: 'plus' },
    create: { user_id: maya.id, plan: 'plus', status: 'active', period_type: 'monthly' },
  })

  await prisma.projects.create({
    data: { user_id: maya.id, slug: 'cozy-socks', title: 'Cozy vanilla socks', status: 'active', craft_type: 'knitting' },
  })
  await prisma.projects.create({
    data: { user_id: maya.id, slug: 'simple-hat', title: 'Simple ribbed hat', status: 'active', craft_type: 'knitting' },
  })
  await prisma.projects.create({
    data: { user_id: maya.id, slug: 'study-break-scarf', title: 'Study break scarf', status: 'active', craft_type: 'knitting' },
  })

  await prisma.user_stash.create({
    data: { user_id: maya.id, yarn_id: rios.id, colorway: 'Glazed Carrot', skeins: 3, status: 'in_stash' },
  })

  console.log('✓ Maya (Plus + Ravelry)')

  // 3. Lily — Free + Ravelry (beginner)
  const lily = await prisma.users.upsert({
    where: { email: 'lily@test.stitch.app' },
    update: {},
    create: {
      clerk_id: 'test_lily_learns',
      email: 'lily@test.stitch.app',
      username: 'lily_learns',
      display_name: 'Lily Park',
      craft_preference: 'knitting',
      experience_level: 'beginner',
      is_pro: false,
    },
  })
  await prisma.subscriptions.upsert({
    where: { user_id: lily.id },
    update: { plan: 'free' },
    create: { user_id: lily.id, plan: 'free', status: 'active' },
  })

  await prisma.projects.create({
    data: { user_id: lily.id, slug: 'first-scarf', title: 'My first scarf', status: 'active', craft_type: 'knitting', description: 'Learning garter stitch!' },
  })

  console.log('✓ Lily (Free + Ravelry)')

  // 4. Jordan — Pro + No Ravelry (crochet designer)
  const jordan = await prisma.users.upsert({
    where: { email: 'jordan@test.stitch.app' },
    update: {},
    create: {
      clerk_id: 'test_jordan_hooks',
      email: 'jordan@test.stitch.app',
      username: 'jordan_hooks',
      display_name: 'Jordan Rivera',
      bio: 'Crochet pattern designer. Amigurumi addict. No Ravelry, just vibes.',
      location: 'Austin, TX',
      craft_preference: 'crochet',
      experience_level: 'advanced',
      is_pro: true,
    },
  })
  await prisma.subscriptions.upsert({
    where: { user_id: jordan.id },
    update: { plan: 'pro' },
    create: { user_id: jordan.id, plan: 'pro', status: 'active', period_type: 'monthly' },
  })

  // Jordan's original patterns
  await prisma.patterns.create({
    data: {
      user_id: jordan.id,
      slug: 'sunflower-granny-square',
      title: 'Sunflower granny square',
      craft_type: 'crochet',
      difficulty: 'intermediate',
      garment_type: 'blanket',
      description: 'A cheerful granny square with a 3D sunflower center. Perfect for blankets and bags.',
      designer_name: 'Jordan Rivera',
      source_free: true,
      is_public: true,
    },
  })
  await prisma.patterns.create({
    data: {
      user_id: jordan.id,
      slug: 'tiny-mushroom-amigurumi',
      title: 'Tiny mushroom amigurumi',
      craft_type: 'crochet',
      difficulty: 'easy',
      garment_type: 'toy',
      description: 'A cute little mushroom that fits in your palm. Great for beginners learning amigurumi.',
      designer_name: 'Jordan Rivera',
      source_free: true,
      is_public: true,
    },
  })

  await prisma.projects.create({
    data: { user_id: jordan.id, slug: 'rainbow-blanket', title: 'Rainbow granny blanket', status: 'active', craft_type: 'crochet' },
  })

  // Jordan's stash (no Ravelry, manually added)
  const lionBrand = await prisma.yarn_companies.upsert({
    where: { name: 'Lion Brand' },
    update: {},
    create: { name: 'Lion Brand' },
  })
  const bonbon = await prisma.yarns.upsert({
    where: { id: 'seed-bonbon' },
    update: {},
    create: {
      id: 'seed-bonbon',
      name: 'Bonbon',
      company_id: lionBrand.id,
      weight: 'worsted',
      yardage_per_skein: 28,
      grams_per_skein: 14,
      fiber_content: '100% Acrylic',
    },
  })
  await prisma.user_stash.create({
    data: { user_id: jordan.id, yarn_id: bonbon.id, colorway: 'Brights', skeins: 8, status: 'in_stash' },
  })

  await prisma.user_needles.createMany({
    data: [
      { user_id: jordan.id, type: 'crochet_hook', size_mm: 4.0, size_label: 'G/6', material: 'metal', brand: 'Clover' },
      { user_id: jordan.id, type: 'crochet_hook', size_mm: 5.0, size_label: 'H/8', material: 'metal', brand: 'Clover' },
      { user_id: jordan.id, type: 'crochet_hook', size_mm: 3.5, size_label: 'E/4', material: 'bamboo' },
    ],
  })

  console.log('✓ Jordan (Pro + No Ravelry)')

  // 5. Alex — Plus + No Ravelry (casual)
  const alex = await prisma.users.upsert({
    where: { email: 'alex@test.stitch.app' },
    update: {},
    create: {
      clerk_id: 'test_alex_knits',
      email: 'alex@test.stitch.app',
      username: 'alex_knits',
      display_name: 'Alex Kim',
      bio: 'Weekend knitter. One project at a time.',
      craft_preference: 'knitting',
      experience_level: 'intermediate',
      is_pro: false,
    },
  })
  await prisma.subscriptions.upsert({
    where: { user_id: alex.id },
    update: { plan: 'plus' },
    create: { user_id: alex.id, plan: 'plus', status: 'active', period_type: 'monthly' },
  })

  await prisma.projects.create({
    data: { user_id: alex.id, slug: 'weekend-beanie', title: 'Weekend beanie', status: 'active', craft_type: 'knitting' },
  })

  await prisma.user_stash.create({
    data: { user_id: alex.id, yarn_id: rios.id, colorway: 'Natural', skeins: 1, status: 'in_stash' },
  })

  console.log('✓ Alex (Plus + No Ravelry)')

  // 6. Riley — Free + No Ravelry (complete beginner)
  const riley = await prisma.users.upsert({
    where: { email: 'riley@test.stitch.app' },
    update: {},
    create: {
      clerk_id: 'test_riley_new',
      email: 'riley@test.stitch.app',
      username: 'riley_new',
      display_name: 'Riley Thompson',
      craft_preference: 'both',
      experience_level: 'beginner',
      is_pro: false,
    },
  })
  await prisma.subscriptions.upsert({
    where: { user_id: riley.id },
    update: { plan: 'free' },
    create: { user_id: riley.id, plan: 'free', status: 'active' },
  })

  // Riley has no projects, stash, or patterns — she just downloaded the app

  console.log('✓ Riley (Free + No Ravelry)')

  console.log('\n✅ All 6 personas seeded successfully!')
  console.log('\nUsers:')
  console.log('  sarah_knits  — Pro + Ravelry (power knitter)')
  console.log('  maya_crafts  — Plus + Ravelry (intermediate)')
  console.log('  lily_learns  — Free + Ravelry (beginner)')
  console.log('  jordan_hooks — Pro, No Ravelry (crochet designer)')
  console.log('  alex_knits   — Plus, No Ravelry (casual)')
  console.log('  riley_new    — Free, No Ravelry (complete beginner)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
