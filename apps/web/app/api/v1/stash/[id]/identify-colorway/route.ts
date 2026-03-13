import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { openai } from '@/lib/openai'
import { COLORWAY_IDENTIFY_SYSTEM_PROMPT } from '@/lib/prompts/colorway-identify'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'AI colorway identification')
  if (proError) return proError

  const item = await prisma.user_stash.findFirst({
    where: { id, user_id: user.id },
    include: { yarn: true },
  })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })
  if (!item.photo_url) {
    return NextResponse.json({ error: 'Upload a photo first' }, { status: 400 })
  }

  // Download the image from Supabase and convert to base64
  // (OpenAI can't reach local/private storage URLs)
  if (!item.photo_path) {
    return NextResponse.json({ error: 'Photo not available' }, { status: 400 })
  }

  const { data: fileData, error: dlError } = await supabaseAdmin.storage
    .from('stash-photos')
    .download(item.photo_path)

  if (dlError || !fileData) {
    return NextResponse.json({ error: 'Failed to read photo' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const base64 = buffer.toString('base64')
  const ext = item.photo_path.split('.').pop() ?? 'jpg'
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const dataUrl = `data:${mimeType};base64,${base64}`

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
              image_url: { url: dataUrl },
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
