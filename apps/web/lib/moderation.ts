import { openai } from '@/lib/openai'

export interface ModerationResult {
  safe: boolean
  reason?: string
}

/**
 * Check an image for inappropriate content using OpenAI's moderation + vision.
 * Returns { safe: true } if the image is acceptable, or { safe: false, reason } if not.
 *
 * Uses GPT-4o-mini for cost efficiency — vision is needed since the
 * moderation endpoint doesn't support images.
 */
export async function moderateImage(imageBuffer: Buffer, mimeType: string): Promise<ModerationResult> {
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a content moderator for a knitting and crafting app. Users upload photos of yarn, knitting projects, and craft supplies.

Reject images that contain:
- Nudity or sexual content
- Violence, gore, or disturbing imagery
- Hate symbols or offensive text
- Content clearly unrelated to crafting (e.g. random selfies are OK if they include yarn/projects)

Accept images that contain:
- Yarn, fabric, fiber, thread
- Knitting/crochet projects or supplies
- Needles, hooks, tools
- Craft workspace or storage photos
- People holding or wearing knitted items

Return JSON: { "safe": true } or { "safe": false, "reason": "brief explanation" }`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Is this image appropriate for a knitting/crafting app?' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { safe: true } // fail open if AI is unavailable

    const result = JSON.parse(content) as { safe: boolean; reason?: string }
    return result
  } catch (error) {
    // Fail open on moderation errors — don't block uploads if AI is down
    console.error('[moderation] error:', error)
    return { safe: true }
  }
}

/**
 * Check text content via OpenAI's moderation endpoint (free, fast).
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  try {
    const response = await openai.moderations.create({ input: text })
    const result = response.results[0]
    if (result.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([, flagged]) => flagged)
        .map(([cat]) => cat.replace(/\//g, ' / '))
      return { safe: false, reason: `Flagged for: ${categories.join(', ')}` }
    }
    return { safe: true }
  } catch {
    return { safe: true }
  }
}
