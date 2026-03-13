import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { openai } from '@/lib/openai'
import { TOOL_LOOKUP_SYSTEM_PROMPT, buildToolLookupPrompt } from '@/lib/prompts/tool-lookup'

// POST /api/v1/tool-catalog/lookup — AI-powered set lookup
// Free with rate limit (5/month) — builds shared catalog
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const body = await req.json()
  const { brand, set_name } = body

  if (!brand?.trim() || !set_name?.trim()) {
    return NextResponse.json(
      { error: 'brand and set_name are required' },
      { status: 400 }
    )
  }

  // Check if we already have this set in the catalog
  const existingBrand = await prisma.tool_brands.findFirst({
    where: { name: { equals: brand.trim(), mode: 'insensitive' } },
  })

  if (existingBrand) {
    const existingSet = await prisma.tool_sets.findFirst({
      where: {
        brand_id: existingBrand.id,
        name: { contains: set_name.trim(), mode: 'insensitive' },
      },
      include: { brand: true, items: { orderBy: { sort_order: 'asc' } } },
    })
    if (existingSet) {
      return NextResponse.json({ success: true, data: existingSet })
    }
  }

  // Rate limit: 5 AI lookups per month per user
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const recentLookups = await prisma.tool_sets.count({
    where: {
      source: 'ai_lookup',
      created_at: { gte: monthStart },
    },
  })
  // Simple global rate limit for now
  if (recentLookups > 100) {
    return NextResponse.json(
      { error: 'Too many lookups this month. Try again next month.' },
      { status: 429 }
    )
  }

  // Call GPT-4o to look up the set contents
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: TOOL_LOOKUP_SYSTEM_PROMPT },
      { role: 'user', content: buildToolLookupPrompt(brand.trim(), set_name.trim()) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = completion.choices[0].message.content ?? '{}'
  let parsed: {
    brand: string
    set_name: string
    set_type: string
    description?: string
    confidence?: string
    items: Array<{
      type: string
      size_mm: number
      size_label?: string
      length_cm?: number
      material?: string
      quantity: number
      sort_order: number
    }>
  }

  try {
    parsed = JSON.parse(content)
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse AI response' },
      { status: 500 }
    )
  }

  if (!parsed.items?.length) {
    return NextResponse.json(
      { error: 'Could not find set contents. Try a more specific name.' },
      { status: 404 }
    )
  }

  // Save to catalog for future users
  const toolBrand = await prisma.tool_brands.upsert({
    where: { name: parsed.brand || brand.trim() },
    update: {},
    create: { name: parsed.brand || brand.trim() },
  })

  const setName = parsed.set_name || set_name.trim()
  const toolSet = await prisma.tool_sets.upsert({
    where: { brand_id_name: { brand_id: toolBrand.id, name: setName } },
    update: {},
    create: {
      brand_id: toolBrand.id,
      name: setName,
      set_type: parsed.set_type || 'interchangeable_knitting',
      description: parsed.description ?? null,
      source: 'ai_lookup',
    },
  })

  // Clear existing items and create new ones
  await prisma.tool_set_items.deleteMany({ where: { set_id: toolSet.id } })
  await prisma.tool_set_items.createMany({
    data: parsed.items.map((item, idx) => ({
      set_id: toolSet.id,
      type: item.type,
      size_mm: item.size_mm,
      size_label: item.size_label ?? null,
      length_cm: item.length_cm ?? null,
      material: item.material ?? null,
      quantity: item.quantity || 1,
      sort_order: item.sort_order ?? idx,
    })),
  })

  const result = await prisma.tool_sets.findUnique({
    where: { id: toolSet.id },
    include: { brand: true, items: { orderBy: { sort_order: 'asc' } } },
  })

  return NextResponse.json({ success: true, data: result }, { status: 201 })
}
