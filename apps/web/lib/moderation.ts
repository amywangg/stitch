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
          content: `You are a content moderator for a social crafting app. Users upload all kinds of photos including selfies, pets, food, nature, travel, and of course yarn and knitting projects.

Reject ONLY images that contain:
- Nudity or sexual content
- Violence, gore, or disturbing imagery
- Hate symbols or offensive text
- Illegal activity

Accept EVERYTHING else — flowers, pets, food, selfies, landscapes, random objects are ALL fine. This is a social app where people share their lives alongside their crafting. Only reject genuinely inappropriate content.

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

/**
 * Check text content for craft-relevance using GPT-4o-mini.
 * Catches political, off-topic, and inappropriate content that OpenAI's
 * generic moderation endpoint doesn't flag.
 */
export async function moderatePostContent(text: string): Promise<ModerationResult> {
  // First pass: OpenAI's free moderation catches obvious NSFW/hate
  const basic = await moderateText(text)
  if (!basic.safe) return basic

  // Second pass: craft-relevance check via GPT-4o-mini
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a content moderator for Stitch, a knitting and fibre arts community app. Users post about their knitting, crochet, spinning, weaving, dyeing, and other fibre arts projects.

ALLOW posts about:
- Knitting, crochet, spinning, weaving, dyeing, felting, embroidery, sewing, quilting
- Yarn, fibre, fabric, patterns, projects, tools, supplies, stash
- Craft events, meetups, yarn shops, fibre festivals
- Progress updates, FOs (finished objects), WIPs (works in progress)
- Asking for help, sharing tips, celebrating milestones
- General life updates if they relate to crafting (e.g. "taking a break from knitting because of hand pain")
- Lighthearted or humorous posts about the craft or community

REJECT posts that are:
- Political, religious, or divisive in nature
- Advertising or spam unrelated to fibre arts
- Sexually explicit or graphic
- Hateful, discriminatory, or harassing
- Completely unrelated to fibre arts or the crafting community

Be generous — if a post is even loosely related to fibre arts or the crafting community, allow it.

Return JSON: { "safe": true } or { "safe": false, "reason": "brief, friendly explanation" }`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { safe: true }

    return JSON.parse(content) as ModerationResult
  } catch (error) {
    console.error('[moderation] post content check error:', error)
    return { safe: true }
  }
}

export interface SwatchValidationResult {
  safe: boolean
  containsYarnOrFabric: boolean
  reason?: string
}

/**
 * Validate a swatch photo: must be safe AND should contain yarn/knitted fabric.
 * Returns { safe, containsYarnOrFabric } — the caller decides how to handle
 * photos that are safe but don't contain yarn (warn, not block).
 */
export async function validateSwatchPhoto(imageBuffer: Buffer, mimeType: string): Promise<SwatchValidationResult> {
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a content moderator and image classifier for a knitting app's swatch feature. A "swatch" is a small test piece of knitted or crocheted fabric.

Analyze this image for two things:

1. SAFETY: Is it free of nudity, violence, hate symbols, or other inappropriate content?
2. YARN/FABRIC: Does it contain any of: knitted fabric, crocheted fabric, a gauge swatch, yarn, fiber, wool, thread, or textile material?

Return JSON: { "safe": true/false, "containsYarnOrFabric": true/false, "reason": "brief explanation if either is false" }

Be generous with yarn detection — yarn balls, hanks, skeins, fabric swatches, finished items, WIPs, and close-up texture shots all count.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this swatch photo.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { safe: true, containsYarnOrFabric: true }

    return JSON.parse(content) as SwatchValidationResult
  } catch (error) {
    console.error('[moderation] swatch validation error:', error)
    return { safe: true, containsYarnOrFabric: true }
  }
}
