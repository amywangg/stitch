---
name: ai-tooling
description: "Design guide for AI-powered features in Stitch. Use when: (1) building any feature that calls OpenAI or an LLM, (2) creating PDF parsing, pattern suggestions, yarn recommendations, gauge conversion, or size recommendation features, (3) designing input/output flows for AI-powered tools, (4) writing prompts or adding routes under /api/v1/ai/, (5) discussing how AI features should work in the app. Key rule: no chat interfaces -- AI runs behind structured UI controls only."
---

# AI Tooling Design Guide

Every AI-powered feature in Stitch is a **tool, not a conversation**. The user interacts through structured UI controls. The AI runs invisibly behind those controls. There is no chat interface, no freeform prompt box, no back-and-forth dialogue.

---

## Core Principle

**The user operates a tool. The AI powers the tool.**

The user should never feel like they are talking to a chatbot. They should feel like they are using a smart feature that understands their craft. The AI is the engine, not the interface.

---

## Input Design

### Always structured, never freeform

Every AI feature takes input through standard UI controls:

| Input type | When to use | Example |
|------------|-------------|---------|
| Pre-filled from context | Data the app already has (stash, projects, gauge, measurements) | "Your gauge: 22 st / 10cm" shown as a read-only chip |
| Dropdown / picker | Finite set of choices | Craft type, yarn weight, skill level, garment category |
| Segmented control | 2-4 mutually exclusive options | "Convert to: Knit / Crochet", "Size: XS / S / M / L / XL" |
| Numeric stepper | Bounded numbers | Needle size, yardage, number of skeins |
| Text field | Short, specific input only | Project name, custom notes, search query |
| Photo upload | Visual input | Swatch photo for gauge estimation |
| Toggle | On/off preferences | "Include yarns from my stash", "Prefer patterns I've queued" |
| Multi-select chips | Choosing from a set | Technique tags, color preferences, fiber content |

### Never use

- A chat input box where the user types natural language instructions
- A "Ask the AI anything" prompt field
- A conversational thread or message history
- A "regenerate" button that implies the AI is guessing (use "Try different options" with adjusted parameters instead)

### Context is automatic

The AI should pull as much context as possible from existing user data without asking:

- Current project details (yarn, gauge, needle size, pattern)
- User's stash inventory
- User's saved and queued patterns
- User's measurements (if provided)
- User's skill level and craft preference
- User's Ravelry library (if synced)

Show this context as read-only summary chips or a collapsible "Using your data" section so the user knows what the AI is working with. Let them override any value by tapping it.

---

## Output Design

### Strict, predictable output formats

Every AI feature produces a defined output type. The output is never raw text from a language model displayed directly.

| Output type | Structure | Example |
|-------------|-----------|---------|
| Recommendation list | Ranked cards with scores/reasons | "Top 3 yarns from your stash for this pattern" |
| Structured data | Parsed into app models, saved to DB | PDF pattern parsed into sections, rows, stitch counts |
| Comparison table | Side-by-side values | Gauge comparison: pattern vs yours, with adjustment advice |
| Single computed result | Number or short phrase in a display card | "You need approximately 1,240 yards" or "Recommended size: M" |
| Action suggestion | Pre-filled form or one-tap action | "Start this project" button with yarn, needles, and size pre-selected |
| Checklist | Ordered steps | Pattern modifications needed for your gauge |

### Output rules

1. **Parse AI responses into structured UI** -- never dump raw model text into the view. The API route processes the LLM response and returns typed JSON. The client renders that JSON with purpose-built components.

2. **One primary result, expandable detail.** Show the top recommendation or computed answer prominently. Put supporting reasoning or alternatives in a collapsible section or secondary cards.

3. **Results are actionable.** Every output should connect to a next step in the app. A yarn recommendation has an "Add to project" button. A size recommendation has a "Select this size" button. A parsed pattern has a "Save to library" button. Never show information that dead-ends.

4. **No disclaimers or hedging in the UI.** Do not show "AI-generated, may contain errors" banners. The backend should validate outputs before returning them. If confidence is low, show fewer results or flag specific values for user review -- not a blanket warning.

5. **Errors are specific.** If the AI cannot produce a result, say why: "Could not determine gauge from this PDF. Add your gauge manually." Not "Something went wrong" or "The AI could not help."

---

## Feature Architecture

### API route pattern

Every AI feature follows this flow:

```
[User adjusts UI controls] -> [Client sends structured JSON request]
    -> [API route gathers context from DB (user data, stash, patterns)]
    -> [API route builds a prompt from context + user input]
    -> [API route calls LLM (OpenAI)]
    -> [API route parses LLM response into typed schema]
    -> [API route validates and returns structured JSON]
-> [Client renders result using purpose-built components]
```

The prompt is **never visible to the user**. The user does not know or care that an LLM is involved. They pressed a button and got a result.

### API route structure

```typescript
// apps/web/app/api/v1/ai/{feature}/route.ts

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  // 2. Pro gate (all AI features are Pro)
  const err = requirePro(user, 'ai-feature-name')
  if (err) return err

  // 3. Parse structured input
  const { patternId, targetSize, preferStash } = await req.json()

  // 4. Gather context from DB
  const pattern = await prisma.patterns.findFirst({ where: { id: patternId, user_id: user.id } })
  const stash = preferStash ? await prisma.user_stash.findMany({ where: { user_id: user.id } }) : []
  const measurements = await prisma.user_measurements.findFirst({ where: { user_id: user.id } })

  // 5. Build prompt (internal, never exposed)
  const prompt = buildFeaturePrompt({ pattern, stash, measurements, targetSize })

  // 6. Call LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },  // enforce JSON output
  })

  // 7. Parse and validate response
  const result = parseFeatureResponse(completion.choices[0].message.content)

  // 8. Return structured data
  return NextResponse.json({ success: true, data: result })
}
```

### Key rules

- **Always request `response_format: { type: 'json_object' }`** from the LLM so output is parseable.
- **Define a Zod schema** (or equivalent) for the expected LLM response shape. Validate before returning to client.
- **All AI routes are Pro-gated.** Free users see a ProGateBanner explaining the feature.
- **All AI routes are rate-limited.** Store usage counts in the DB to prevent abuse.
- **Prompts live in dedicated files** (`apps/web/lib/prompts/{feature}.ts`), not inline in route handlers.
- **Never stream LLM responses to the client.** Wait for the full response, parse it, validate it, then return structured JSON. The client shows a loading state (skeleton or progress indicator) while waiting.

---

## Loading States

AI features take longer than normal API calls. Design for the wait:

- Show a **progress indicator with context**: "Analyzing your pattern..." / "Matching yarns from your stash..." / "Calculating size adjustments..."
- Use a **skeleton of the expected result shape** so the user knows what is coming
- For operations over 5 seconds, show a **step indicator**: Step 1 of 3, Step 2 of 3, etc. (these can be fake/timed steps to convey progress)
- Never show a raw spinner with no context

---

## iOS View Pattern

```swift
@Observable
final class AIFeatureViewModel {
    // Structured inputs (bound to UI controls)
    var selectedYarnWeight: YarnWeight = .worsted
    var includeStash: Bool = true
    var targetSize: PatternSize?

    // Context (loaded automatically)
    var userGauge: Gauge?
    var userMeasurements: Measurements?

    // Output
    var result: AIFeatureResult?
    var isProcessing = false
    var processingStep: String?
    var error: String?

    func run() async {
        isProcessing = true
        processingStep = "Analyzing pattern..."
        defer { isProcessing = false; processingStep = nil }

        do {
            let body: [String: Any] = [
                "yarnWeight": selectedYarnWeight.rawValue,
                "includeStash": includeStash,
                "targetSize": targetSize?.rawValue
            ]
            let response: APIResponse<AIFeatureResult> = try await APIClient.shared.post("/ai/feature", body: body)
            result = response.data
        } catch {
            self.error = "Could not generate recommendations. Try again."
        }
    }
}
```

The view has:
1. A **configuration section** with pickers, toggles, and context chips
2. A **primary action button** ("Find matching yarns", "Calculate size", "Parse pattern")
3. A **result section** that appears after processing, with actionable cards

No message bubbles. No typing indicators. No conversation history.

---

## Planned AI Features Reference

These features should all follow this guide:

| Feature | Input | Context (auto) | Output |
|---------|-------|-----------------|--------|
| PDF pattern parsing | PDF file upload | None | Structured pattern (sections, rows, stitches, sizes) saved to library |
| Gauge calculator | Target measurement + gauge swatch values | User's saved gauge | Row/stitch counts, adjustment recommendations |
| Size recommendation | Pattern ID + optional size override | User measurements, pattern size chart | Recommended size with fit notes |
| Yarn substitution | Pattern ID + preferences (weight, fiber, budget) | User stash, pattern yarn requirements | Ranked yarn matches with yardage calculations |
| Pattern suggestions | Craft type, category, skill level, preferences | Queued patterns, completed projects, favorited tags | Ranked pattern recommendations with reasons |
| Stash-based project ideas | None (one-tap) | Full stash inventory, skill level, queued patterns | "You could make X with your Y yarn" suggestions |
| Row instruction explainer | Tap on a pattern row | Full pattern context, glossary | Plain-language breakdown of abbreviations and steps |
| Project time estimate | Pattern ID | Crafting session history (avg speed), pattern complexity | Estimated hours with confidence range |

---

## Anti-Patterns (Never Do These)

- Chat interface or conversational UI for any AI feature
- Freeform text input as the primary way to interact with AI
- Displaying raw LLM output text in the UI
- "Ask AI" button that opens a generic prompt box
- Streaming text that appears word-by-word (typewriter effect)
- "Regenerate" button without parameter adjustment (change inputs to change outputs)
- Exposing the system prompt, model name, or token usage to the user
- Letting the user "correct" the AI through follow-up messages
- Blanket "AI-generated content" disclaimers on every result
- Using AI where a deterministic algorithm would work (e.g., unit conversion, basic math)
