import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { openai } from '@/lib/openai'
import { COLORWAY_IDENTIFY_SYSTEM_PROMPT } from '@/lib/prompts/colorway-identify'

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'AI colorway identification')
  if (proError) return proError

  const item = await prisma.user_stash.findFirst({
    where: { id: params.id, user_id: user.id },
    include: { yarn: true },
  })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })
  if (!item.photo_url) {
    return NextResponse.json({ error: 'Upload a photo first' }, { status: 400 })
  }

  // Build context about the yarn for better identification
  const yarnContext = item.yarn
    ? `The yarn is "${item.yarn.name}"${item.yarn.weight ? ` (${item.yarn.weight} weight)` : ''}.`
    : ''

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: COLORWAY_IDENTIFY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Identify the colorway of this yarn. ${yarnContext}`,
            },
            {
              type: 'image_url',
              image_url: { url: item.photo_url.split('?')[0] }, // strip cache-buster
            },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'AI returned no response' }, { status: 502 })
    }

    const result = JSON.parse(content) as {
      colorway: string
      confidence: string
      notes?: string
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[identify-colorway] error:', error)
    const message = error instanceof Error ? error.message : 'Colorway identification failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
