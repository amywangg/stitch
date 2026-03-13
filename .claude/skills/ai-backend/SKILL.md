---
name: ai-backend
description: "Skill for building and testing AI-powered backend features in Stitch. Use when: (1) implementing or modifying any API route under /api/v1/ai/, (2) adding new AI-powered features (prompts, business logic, route handlers), (3) testing AI routes via curl in the terminal, (4) working on Pro-gated features, (5) modifying lib/agent.ts, lib/gauge.ts, lib/prompts/, or lib/ravelry-search.ts. This skill is backend-only — no iOS UI, no web UI. All testing happens via terminal."
---

# AI Backend Skill

This skill covers backend-only work for AI tooling and Pro features in Stitch. No UI work — all testing happens via curl in the terminal.

---

## Scope

**In scope:**
- API routes under `apps/web/app/api/v1/ai/`
- API routes under `apps/web/app/api/v1/gauge/`
- API routes under `apps/web/app/api/v1/ravelry/`
- API routes under `apps/web/app/api/v1/pdf/`
- Business logic in `apps/web/lib/agent.ts`
- Gauge math in `apps/web/lib/gauge.ts`
- Ravelry search proxy in `apps/web/lib/ravelry-search.ts`
- Prompt templates in `apps/web/lib/prompts/`
- OpenAI client in `apps/web/lib/openai.ts`
- Pro-gate logic in `apps/web/lib/pro-gate.ts`
- Zod schemas for AI route input validation in `apps/web/lib/schemas/`
- Database queries supporting AI features (stash, patterns, measurements, gauge)

**Out of scope (other agents handle these):**
- iOS SwiftUI views and ViewModels
- Web React components and pages
- Navigation, layout, or UI components
- CSS, Tailwind, design system work

---

## Working Rules

### 1. No UI, no frontend code

This skill only touches backend files. Never create or modify:
- `apps/web/components/`
- `apps/web/app/(app)/` page components
- `apps/ios/`
- Any `.tsx` file that renders UI

### 2. Test everything via terminal

All verification happens with curl, not a browser or simulator.

```bash
# Pattern: test any route
curl -X POST http://localhost:3000/api/v1/ai/<feature> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk_token>" \
  -d '{ ... }'
```

To get a Clerk token for testing:
- Browser: dev tools → Application → Cookies → `__session`
- Or use Clerk's testing tools

### 3. Always follow the AI tooling design guide

Reference: `.claude/skills/ai-tooling/SKILL.md`

Key constraints:
- `response_format: { type: 'json_object' }` on every LLM call
- Parse LLM output into typed structs — never return raw text
- All AI routes are Pro-gated (except explain-row and saved-matches)
- Prompts live in `apps/web/lib/prompts/`, not inline
- No streaming, no SSE, no chat, no conversations
- Validate with Zod before returning to client

### 4. Follow the API design standards

Reference: `.claude/skills/api-design/SKILL.md`

Key constraints:
- Auth: `await auth()` → `getDbUser(clerkId)` → `requirePro(user, 'feature')`
- Input validation: Zod schemas in `apps/web/lib/schemas/`
- Success: `{ success: true, data: ... }`
- Error: `{ error: 'message', code?: 'MACHINE_READABLE' }` with proper status code
- Return errors, don't throw

### 5. No clashing with the iOS agent

Another Claude agent is working on iOS code concurrently. To avoid conflicts:
- Never touch `apps/ios/`
- Never modify `packages/db/prisma/schema.prisma` without confirming the other agent isn't doing the same
- If a schema change is needed, flag it and coordinate
- API route contracts (request/response shapes) should be documented in this file so the iOS agent can implement the client side

---

## Existing Implementation

### Routes

| Route | Method | Pro? | Status | File |
|-------|--------|------|--------|------|
| `/api/v1/ai/stash-match` | POST | Yes | Done | `app/api/v1/ai/stash-match/route.ts` |
| `/api/v1/ai/saved-matches` | GET | No | Done | `app/api/v1/ai/saved-matches/route.ts` |
| `/api/v1/ai/convert-gauge` | POST | Yes | Done | `app/api/v1/ai/convert-gauge/route.ts` |
| `/api/v1/ai/explain-row` | POST | No | Done | `app/api/v1/ai/explain-row/route.ts` |
| `/api/v1/gauge/measurement-to-rows` | POST | No | Done | `app/api/v1/gauge/[...]/route.ts` |
| `/api/v1/gauge/rows-to-measurement` | POST | No | Done | |
| `/api/v1/gauge/compare` | POST | No | Done | |
| `/api/v1/ravelry/search` | GET | No | Done | `app/api/v1/ravelry/search/route.ts` |
| `/api/v1/ravelry/patterns/save` | POST/DELETE | No | Done | |
| `/api/v1/ravelry/patterns/saved` | GET | No | Done | |
| `/api/v1/pdf/parse` | POST | Yes | Exists (has type errors) | `app/api/v1/pdf/parse/route.ts` |

### Lib Files

| File | Purpose |
|------|---------|
| `lib/agent.ts` | 4 discrete functions: matchStashToPatterns, matchSavedPatternsToStash, convertPatternGauge, explainPatternRow |
| `lib/gauge.ts` | Deterministic math: measurementToRows, rowsToMeasurement, compareGauges |
| `lib/ravelry-search.ts` | Ravelry API proxy with Basic Auth + 5-min cache |
| `lib/openai.ts` | OpenAI client singleton |
| `lib/prompts/tool-lookup.ts` | Prompt for needle/hook set content identification |
| `lib/prompts/colorway-identify.ts` | Prompt for yarn colorway identification from photo |

---

## Adding a New AI Feature

### Step 1: Create the prompt

```typescript
// apps/web/lib/prompts/my-feature.ts
export const MY_FEATURE_SYSTEM_PROMPT = `You are a knitting expert. ...

Return JSON only:
{ "field": "type", ... }`

export function buildMyFeaturePrompt(context: MyContext): string {
  return `...`
}
```

### Step 2: Add the business logic function

```typescript
// Add to apps/web/lib/agent.ts (or create a new file if unrelated)

export interface MyFeatureResult {
  // typed output
}

export async function myFeature(userId: string, input: MyInput): Promise<MyFeatureResult> {
  // 1. Gather context from DB
  // 2. Build prompt
  // 3. Call OpenAI with response_format: { type: 'json_object' }
  // 4. Parse + validate
  // 5. Return typed result
}
```

### Step 3: Create the API route

```typescript
// apps/web/app/api/v1/ai/my-feature/route.ts

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { myFeature } from '@/lib/agent'

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'My AI feature')
  if (proError) return proError

  const body = await req.json()
  // validate with Zod

  try {
    const result = await myFeature(user.id, body)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    )
  }
}
```

### Step 4: Test via curl

```bash
curl -X POST http://localhost:3000/api/v1/ai/my-feature \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "field": "value" }'
```

### Step 5: Document the API contract

Add the request/response shapes to `docs/009-ai-knitting-agent.md` so the iOS agent can implement the client-side call.

---

## Planned Work

Features that need backend implementation:

1. **Needle/hook set lookup** — prompt exists (`lib/prompts/tool-lookup.ts`), needs API route
2. **Colorway identification** — prompt exists (`lib/prompts/colorway-identify.ts`), needs API route (requires GPT-4o vision)
3. **PDF parse fix** — existing route has type errors, needs cleanup
4. **Size recommendation** — pattern + user_measurements → recommended size
5. **Yarn substitution** — pattern → ranked stash matches (inverse of stash-match)
6. **Project time estimate** — crafting_sessions history → estimated hours
7. **Zod validation** — add proper Zod schemas to all AI routes (currently using raw `as` casts)
8. **Rate limiting** — add per-user rate limits on AI routes

---

## API Contracts for iOS

Document every route's request/response shape here so the iOS agent can build ViewModels and APIClient methods without needing to read the backend code.

### POST /api/v1/ai/stash-match

```json
// Request
{ "stash_item_id": "uuid", "craft?": "knitting|crochet", "category?": "string", "page?": 1 }

// Response
{
  "success": true,
  "data": {
    "stash_item": { "yarn_name": "...", "company": "...", "weight": "worsted", "total_yardage": 440, "skeins": 2 },
    "ravelry_results": [
      { "ravelry_id": 123, "name": "...", "permalink": "...", "designer": "...", "weight": "worsted", "yardage_max": 400, "difficulty": 3.5, "photo_url": "...", "free": false }
    ],
    "total_found": 245
  }
}
```

### GET /api/v1/ai/saved-matches

```json
// Response
{
  "success": true,
  "data": [
    {
      "pattern": { "id": "uuid", "ravelry_id": 123, "name": "...", "permalink": "...", "designer": "...", "weight": "worsted", "yardage_min": 200, "yardage_max": 400, "difficulty": 3.0, "photo_url": "...", "free": false },
      "matching_yarn": { "id": "uuid", "yarn_name": "...", "weight": "worsted", "total_yardage": 440, "colorway": "Midnight Blue" },
      "match_quality": "perfect",
      "reason": "Your Malabrigo Rios (440yds) covers the 400yd requirement"
    }
  ]
}
```

### POST /api/v1/ai/convert-gauge

```json
// Request
{ "pattern_id": "uuid", "original_stitches_per_10cm": 22, "original_rows_per_10cm": 30, "new_stitches_per_10cm": 18, "new_rows_per_10cm": 26 }

// Response
{
  "success": true,
  "data": {
    "pattern_title": "Weekender",
    "original_gauge": { "stitches_per_10cm": 22, "rows_per_10cm": 30 },
    "new_gauge": { "stitches_per_10cm": 18, "rows_per_10cm": 26 },
    "stitch_ratio": 0.818,
    "row_ratio": 0.867,
    "sections": [
      { "name": "Body", "rows": [{ "row_number": 1, "original_instruction": "CO 120 sts", "converted_instruction": "CO 98 sts" }] }
    ]
  }
}
```

### POST /api/v1/ai/explain-row

```json
// Request
{ "instruction": "K2, *yo, k2tog, k3*, repeat to last 2 sts, k2", "craft_type?": "knitting", "experience_level?": "beginner", "previous_row?": "Purl all sts" }

// Response
{
  "success": true,
  "data": {
    "row_number": 0,
    "instruction": "K2, *yo, k2tog, k3*, repeat to last 2 sts, k2",
    "explanation": "Knit 2 stitches. Then repeat this sequence...",
    "stitch_count_after": 42
  }
}
```
