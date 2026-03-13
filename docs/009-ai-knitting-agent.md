# AI Tooling & Pro Features

**Status:** Partially implemented (core backend routes + lib functions exist, no iOS UI)

## Design Philosophy

AI in Stitch is an **invisible engine, not a chatbot**. There are no chat interfaces, no freeform prompts, no conversational UI, no streaming text. Users interact through structured controls (buttons, pickers, toggles, wizards). The AI runs behind those controls and returns structured data rendered by purpose-built components.

See also: `.claude/skills/ai-tooling/SKILL.md` for the full design guide.

---

## Implemented Features

### 1. Stash-to-Pattern Matching (Pro)

**"What can I make with this yarn?"** — User selects a stash item, app searches Ravelry for matching patterns.

| Layer | Status |
|-------|--------|
| API route | Done — `POST /api/v1/ai/stash-match` |
| Business logic | Done — `lib/agent.ts → matchStashToPatterns()` |
| Ravelry search proxy | Done — `lib/ravelry-search.ts` |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Reads the stash item's yarn weight + calculates total yardage from skeins × yardage_per_skein → proxies to Ravelry search filtered by weight and max yardage → returns ranked results.

**Input:** `{ stash_item_id, craft?, category?, page? }`
**Output:** Stash item summary + array of Ravelry pattern results with photos, designer, difficulty.

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/stash-match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk_token>" \
  -d '{"stash_item_id": "<uuid>", "craft": "knitting", "category": "sweater"}'
```

---

### 2. Saved Pattern ↔ Stash Cross-Reference

**"Which saved pattern should I cast on?"** — Cross-references all saved patterns against user's stash, ranks by match quality.

| Layer | Status |
|-------|--------|
| API route | Done — `GET /api/v1/ai/saved-matches` |
| Business logic | Done — `lib/agent.ts → matchSavedPatternsToStash()` |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Fetches user's saved patterns + stash → groups stash by weight → for each pattern, finds best matching yarn → scores as perfect (full yardage) / good (meets minimum) / possible (weight matches) → returns sorted list.

**No Pro gate** — pure DB logic, no LLM call.

**curl test:**
```bash
curl http://localhost:3000/api/v1/ai/saved-matches \
  -H "Authorization: Bearer <clerk_token>"
```

---

### 3. Pattern Gauge Conversion (Pro)

**"Convert this pattern for my yarn"** — GPT-4o rewrites row-by-row instructions with adjusted stitch/row counts.

| Layer | Status |
|-------|--------|
| API route | Done — `POST /api/v1/ai/convert-gauge` (maxDuration=60) |
| Business logic | Done — `lib/agent.ts → convertPatternGauge()` |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Calculates stitch ratio and row ratio → sends pattern sections to GPT-4o with strict instructions to only modify numeric counts → returns original + converted instructions side-by-side.

**Input:** `{ pattern_id, original_stitches_per_10cm, original_rows_per_10cm, new_stitches_per_10cm, new_rows_per_10cm }`
**Output:** `{ pattern_title, original_gauge, new_gauge, stitch_ratio, row_ratio, sections[].rows[].{original_instruction, converted_instruction} }`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/convert-gauge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk_token>" \
  -d '{"pattern_id": "<uuid>", "original_stitches_per_10cm": 22, "original_rows_per_10cm": 30, "new_stitches_per_10cm": 18, "new_rows_per_10cm": 26}'
```

---

### 4. Row Instruction Explainer

**"What does this row mean?"** — GPT-4o-mini explains a single pattern instruction in plain language.

| Layer | Status |
|-------|--------|
| API route | Done — `POST /api/v1/ai/explain-row` |
| Business logic | Done — `lib/agent.ts → explainPatternRow()` |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Sends the instruction + optional context (craft type, experience level, previous row) to GPT-4o-mini → returns plain English explanation + estimated stitch count after.

**No Pro gate** — uses cheap model (GPT-4o-mini), available to all users.

**Input:** `{ instruction, craft_type?, experience_level?, previous_row? }`
**Output:** `{ explanation, stitch_count_after }`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/explain-row \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk_token>" \
  -d '{"instruction": "K2, *yo, k2tog, k3*, repeat to last 2 sts, k2", "craft_type": "knitting", "experience_level": "beginner"}'
```

---

### 5. Gauge Calculator (deterministic, no AI)

Pure math — no LLM. Three functions in `lib/gauge.ts`:

| Route | What | Status |
|-------|------|--------|
| `POST /api/v1/gauge/measurement-to-rows` | target_cm + rows_per_10cm → estimated rows + checkpoints | Done |
| `POST /api/v1/gauge/rows-to-measurement` | row_count + rows_per_10cm → estimated cm/inches | Done |
| `POST /api/v1/gauge/compare` | Pattern gauge vs user gauge → ratios + needle advice | Done |

---

### 6. Pattern Discovery Wizard (no AI, Ravelry proxy)

Guided multi-step flow: craft → yarn/weight → category → filtered results.

| Layer | Status |
|-------|--------|
| API route | Done — `GET /api/v1/ravelry/search` (proxy) |
| Save/unsave | Done — `POST/DELETE /api/v1/ravelry/patterns/save` |
| List saved | Done — `GET /api/v1/ravelry/patterns/saved` |
| Web UI | Done — `PatternDiscovery.tsx` wizard component |
| iOS UI | Not started |

---

### 7. Needle/Hook Set Lookup (Pro)

**"What's in this set?"** — GPT-4o identifies the contents of a commercial needle/hook set by brand + name.

| Layer | Status |
|-------|--------|
| Prompt | Done — `lib/prompts/tool-lookup.ts` |
| API route | Not started |
| iOS UI | Not started |

---

### 8. Yarn Colorway Identification (Pro)

**"What color is this?"** — GPT-4o vision identifies a yarn colorway from a photo.

| Layer | Status |
|-------|--------|
| Prompt | Done — `lib/prompts/colorway-identify.ts` |
| API route | Not started |
| iOS UI | Not started |

---

## Planned Features (Not Started)

### 9. PDF Pattern Parsing (Pro)

Upload a PDF → extract text with `pdf-parse` → GPT-4o structures it into sections, rows, stitch counts, sizes → save to pattern library.

| Layer | Status |
|-------|--------|
| API route | Exists — `POST /api/v1/pdf/parse` (has type errors, needs fixing) |
| PDF extraction | Done — `lib/pdf.ts` |
| iOS UI | Not started |

### 10. Size Recommendation (Pro)

Pattern ID + user measurements → recommended size with fit notes.

**Input:** Pattern ID (auto-pulls user_measurements)
**Output:** Recommended size, ease comparison, fit notes

### 11. Yarn Substitution (Pro)

Pattern ID + preferences → ranked yarn matches from stash with yardage calculations.

Differs from stash-match (#1) in that it starts from a pattern and finds suitable yarns, rather than starting from a yarn and finding patterns.

### 12. Project Time Estimate (Pro)

Pattern ID → estimated hours based on user's crafting session history and pattern complexity.

---

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/lib/agent.ts` | Core business logic — 4 discrete action functions |
| `apps/web/lib/gauge.ts` | Deterministic gauge math (no AI) |
| `apps/web/lib/ravelry-search.ts` | Ravelry search proxy with Basic Auth + caching |
| `apps/web/lib/openai.ts` | OpenAI client instance |
| `apps/web/lib/prompts/*.ts` | Prompt templates (tool-lookup, colorway-identify) |
| `apps/web/app/api/v1/ai/` | AI route handlers (stash-match, saved-matches, convert-gauge, explain-row) |
| `apps/web/app/api/v1/gauge/` | Gauge calculator routes |
| `apps/web/app/api/v1/ravelry/` | Ravelry proxy routes (search, save, saved list) |

### Request Flow

```
User taps button → iOS ViewModel calls APIClient.post("/ai/feature", body)
  → API route: auth() → getDbUser() → requirePro()
  → Gather context from DB (stash, patterns, measurements)
  → Build prompt (if AI) or compute (if deterministic)
  → Call OpenAI with response_format: { type: 'json_object' }
  → Parse + validate response
  → Return { success: true, data: <typed result> }
→ ViewModel receives typed response → View renders with purpose-built components
```

### Rules

- **All AI routes are Pro-gated** except explain-row (gpt-4o-mini, cheap) and saved-matches (pure DB).
- **All LLM calls use `response_format: { type: 'json_object' }`** — always parse into typed structs.
- **Prompts live in `lib/prompts/`** — never inline in route handlers.
- **No streaming.** Full response → parse → validate → return. Client shows skeleton loading.
- **No chat.** No conversations, no message history, no SSE, no typing indicators.
- **Context is automatic.** Pull user data (stash, gauge, measurements) from DB — don't ask the user to re-enter it.

---

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| Row instruction explainer | Yes | Yes |
| Saved pattern ↔ stash matching | Yes | Yes |
| Pattern discovery (Ravelry search) | Yes | Yes |
| Gauge calculator | Yes | Yes |
| Stash-to-pattern matching | No | Yes |
| Gauge conversion | No | Yes |
| PDF pattern parsing | 2/month | Unlimited |
| Needle set lookup | No | Yes |
| Colorway identification | No | Yes |
| Size recommendation | No | Yes |
| Yarn substitution | No | Yes |
| Time estimate | No | Yes |

---

## Database Tables

No chat tables needed. Relevant existing tables:

- `saved_patterns` — lightweight Ravelry pattern snapshots (weight, yardage, difficulty, etc.)
- `user_stash` + `yarns` + `yarn_companies` — user's yarn inventory
- `user_measurements` — body measurements for size recommendations
- `patterns` + `pattern_sections` + `pattern_rows` — parsed patterns for gauge conversion
- `pdf_uploads` — tracking PDF parse usage for free tier limits
- `project_gauge` — user gauge records per project

---

## Testing (Terminal Only)

All routes can be tested via curl. You need a valid Clerk session token.

**Get a test token** (from browser dev tools → Application → Cookies → `__session`, or from Clerk dashboard).

**Quick smoke tests:**
```bash
# Health check — gauge calculator (no auth needed for testing math)
curl -X POST http://localhost:3000/api/v1/gauge/measurement-to-rows \
  -H "Content-Type: application/json" \
  -d '{"target_cm": 50, "rows_per_10cm": 28}'

curl -X POST http://localhost:3000/api/v1/gauge/compare \
  -H "Content-Type: application/json" \
  -d '{"pattern_stitches": 22, "pattern_rows": 30, "user_stitches": 20, "user_rows": 28}'

# Ravelry search (needs RAVELRY_CLIENT_KEY + RAVELRY_CLIENT_SECRET in .env.local)
curl "http://localhost:3000/api/v1/ravelry/search?craft=knitting&weight=worsted&pc=sweater&page=1" \
  -H "Authorization: Bearer <token>"

# AI explain row
curl -X POST http://localhost:3000/api/v1/ai/explain-row \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"instruction": "K2, *yo, k2tog, k3*, repeat to last 2 sts, k2"}'
```

---

## Dependencies

- `openai` npm package — GPT-4o and GPT-4o-mini
- `pdf-parse` — PDF text extraction
- Ravelry API credentials (`RAVELRY_CLIENT_KEY`, `RAVELRY_CLIENT_SECRET`)
- `OPENAI_API_KEY` in `.env.local`
- Clerk auth (all routes require valid session)
- Prisma/Supabase (all context queries)
