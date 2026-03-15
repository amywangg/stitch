# AI Tooling & Pro Features

**Status:** Backend mostly complete (9 AI routes + 3 gauge routes + Ravelry proxy, no iOS or web UI)

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

### 9. Yarn Substitution & Pattern Adjustment (Pro)

**"I want to use a different yarn — what changes?"** — User picks a substitute yarn (or multi-strand combo), app recommends needles, estimates gauge, adjusts stitch/row counts, and recalculates yardage. Handles multi-strand knitting (2x fingering held together, mohair + base yarn, etc.).

| Layer | Status |
|-------|--------|
| Deterministic math | Done — `lib/yarn-math.ts` (weight estimation, needle ranges, gauge ranges, yardage) |
| Prompt | Done — `lib/prompts/yarn-sub.ts` (fiber-aware gauge refinement + practical notes) |
| API route | Done — `POST /api/v1/ai/yarn-sub` (maxDuration=120) |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Resolves yarn data (from stash, catalog, or manual entry) → estimates effective weight for multi-strand combos (mohair at 0.5x weight contribution) → deterministic needle range + gauge estimate → GPT-4o refines gauge considering fiber content + provides practical knitting notes → compares against pattern gauge → recalculates yardage with per-yarn breakdown → checks user's needle inventory for matches → optionally calls `convertPatternGauge()` for row-by-row instruction adjustment.

**Two-step flow:** Instant deterministic results first (needle + gauge + yardage). Instruction conversion is opt-in via `convert_instructions: true` (expensive GPT-4o call sending all pattern rows). Client shows results, lets user confirm, then triggers conversion.

**Multi-strand examples:**
| Combo | Weight calc | Effective weight |
|-------|-------------|-----------------|
| 2x fingering | 1 + 1 = 2 | sport |
| fingering + lace mohair | 1 + 0×0.5 = 1.5 → round | sport |
| DK + lace mohair | 3 + 0×0.5 = 3.5 → round | worsted |

**Input:**
```json
{
  "pattern_id": "uuid",
  "yarn_combo": [
    { "source": "stash", "stash_item_id": "uuid", "strands": 1 },
    { "source": "catalog", "yarn_id": "uuid", "strands": 1 },
    { "source": "manual", "weight": "dk", "fiber_content": "100% merino", "strands": 1 }
  ],
  "needle_size_mm": 4.0,
  "user_gauge": { "stitches_per_10cm": 22, "rows_per_10cm": 30 },
  "convert_instructions": false
}
```

**Output:** `{ yarn_summary, needle_recommendation, estimated_gauge, gauge_comparison, yardage, notes[], swatch_recommendation, adjustments }`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/yarn-sub \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pattern_id": "<uuid>", "yarn_combo": [{"source": "manual", "weight": "dk", "fiber_content": "100% merino wool", "strands": 1}]}'
```

---

### 10. Size Recommendation (Pro)

**"What size should I make?"** — Scores all pattern sizes against the user's body measurements, accounting for ease preference and garment type. Bust ease is the primary axis; secondary checks on hip, shoulder, arm length, etc. flag fit issues.

| Layer | Status |
|-------|--------|
| Deterministic math | Done — `lib/size-math.ts` (ease tables, size scoring, measurement coverage) |
| Prompt | Done — `lib/prompts/size-rec.ts` (fit advice, between-sizes guidance, modification suggestions) |
| API route | Done — `POST /api/v1/ai/size-rec` (maxDuration=30) |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Pulls body measurements from `user_measurements` (with optional per-request overrides) → checks which measurements the pattern actually has vs what the user has provided → scores each pattern size by bust ease deviation from target + secondary measurement checks → classifies fit as ideal/acceptable/compromise → GPT-4o adds contextual fit notes, between-sizes advice, and simple modification suggestions.

**Ease preferences by garment type:** Each garment type (pullover, cardigan, vest, tank, coat, dress) has its own ease table with 5 levels: negative, close, standard, relaxed, oversized. Cardigans get more ease than pullovers; coats get the most.

**Input:**
```json
{
  "pattern_id": "uuid",
  "ease_preference": "standard",
  "measurements": { "bust_cm": 92, "hip_cm": 97 }
}
```

**Output:** `{ recommended_size, ease_preference, ranked_sizes[], recommendation_summary, fit_notes[], between_sizes_advice, modification_suggestions[], measurement_coverage }`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/size-rec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pattern_id": "<uuid>", "ease_preference": "relaxed"}'
```

---

### 11. Project Time Estimator (Pro)

**"When will I finish this?"** — Calculates remaining time per section and estimated completion date based on the user's actual knitting speed and crafting schedule.

| Layer | Status |
|-------|--------|
| Deterministic math | Done — `lib/time-math.ts` (speed calc, section estimates, session frequency, calendar projection) |
| Prompt | Done — `lib/prompts/time-estimate.ts` (progress summary, pacing advice, milestone notes) |
| API route | Done — `POST /api/v1/ai/time-estimate` (maxDuration=30) |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Derives knitting speed (rows/hour) from `crafting_sessions` — prefers sessions with row tracking data, prefers project-specific sessions over global, uses `active_minutes` over `duration_minutes` when available → estimates remaining time per section based on `target_rows - current_row` → calculates session frequency from last 30 days of sessions → projects remaining hours onto the user's schedule for a calendar completion date → GPT-4o-mini (cheap/fast) adds a motivational progress summary, section context, pacing advice, and milestone notes.

**Speed calculation:** Filters to sessions with both `rows_start`/`rows_end` and `duration_minutes > 0`. Falls back to 15 rows/hour default if no data. Confidence: high (5+ sessions), medium (2-4), low (0-1).

**Input:**
```json
{
  "project_id": "uuid",
  "rows_per_hour": 20
}
```

**Output:** `{ progress, speed, sections[], schedule, summary, section_context, pacing_advice, milestone_note }`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/time-estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"project_id": "<uuid>"}'
```

---

### 12. Stash-to-Project Planner (Pro)

**"Which of my yarns works for this pattern?"** — Scans the user's full stash and recommends which yarns could work for a given pattern, considering weight, yardage, fiber suitability, and multi-strand potential. Inverse of stash-match (#1): starts from a pattern, finds suitable stash yarns.

| Layer | Status |
|-------|--------|
| Prompt | Done — `lib/prompts/stash-planner.ts` (fiber suitability + multi-strand suggestions) |
| API route | Done — `POST /api/v1/ai/stash-planner` (maxDuration=30) |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Fetches user's stash (status = `in_stash`, cap 100) → deterministic pre-filter: exact weight matches first, then adjacent (±1 level), then all → yardage sufficiency check with deficit calculation → top 20 candidates sent to GPT-4o for fiber suitability evaluation → AI also suggests multi-strand combos (e.g. 2x fingering → sport) → merges deterministic yardage data with AI suitability ratings.

**Input:**
```json
{
  "pattern_id": "uuid",
  "weight_filter": "dk",
  "include_adjacent_weights": true
}
```

**Output:** `{ pattern, candidates[], multi_strand_suggestions[], general_advice, stash_items_evaluated, stash_items_total }`

Each candidate includes: `yarn_name, weight, weight_match, fiber_content, colorway, total_yardage, yardage_sufficient, yardage_deficit, suitability, reason, fiber_notes`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/stash-planner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pattern_id": "<uuid>"}'
```

---

### 13. Yarn Equivalence Finder (Pro)

**"What yarn is similar to X?"** — Finds substitute yarns by scoring weight, fiber content, yardage, and put-up similarity, then AI evaluates how each will actually knit up (stitch definition, drape, bloom, gauge behavior).

| Layer | Status |
|-------|--------|
| Deterministic math | Done — `lib/yarn-equiv.ts` (fiber parsing, overlap scoring, composite ranking) |
| Prompt | Done — `lib/prompts/yarn-equiv.ts` (knitting-specific equivalence evaluation) |
| API route | Done — `POST /api/v1/ai/yarn-equiv` (maxDuration=30) |
| iOS UI | Not started |
| Web UI | Not started |

**How it works:** Resolves source yarn (from stash, catalog, or manual entry) → gathers candidates from stash, catalog, or both (filtered to same + adjacent weights) → deterministic scoring: weight match (35%), fiber overlap (35%), yardage similarity (15%), grams similarity (15%) → fiber parsing normalizes breed names (BFL → wool, kid silk → mohair, pima cotton → cotton, etc.) → top candidates scored and ranked → GPT-4o evaluates each with knitting-specific knowledge (stitch definition, drape, memory, pilling, superwash behavior) → verdicts: drop-in / close / workable / not recommended.

**Input:**
```json
{
  "source": { "from": "catalog", "yarn_id": "uuid" },
  "search_in": "both",
  "context": "for a lace shawl",
  "limit": 15
}
```

**Output:** `{ source, equivalents[], top_pick, general_notes, candidates_evaluated }`

Each equivalent includes: `yarn_id, name, company, weight, fiber_content, match_score, weight_match, fiber_overlap, verdict, reason, knitting_difference, gauge_notes`

**curl test:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/yarn-equiv \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"source": {"from": "manual", "name": "Malabrigo Rios", "weight": "worsted", "fiber_content": "100% superwash merino"}, "search_in": "stash"}'
```

---

## Planned Features (Not Started)

### 14. PDF Pattern Parsing (Pro)

Upload a PDF → extract text with `pdf-parse` → GPT-4o structures it into sections, rows, stitch counts, sizes → save to pattern library.

| Layer | Status |
|-------|--------|
| API route | Exists — `POST /api/v1/pdf/parse` (has type errors, needs fixing) |
| PDF extraction | Done — `lib/pdf.ts` |
| iOS UI | Not started |

---

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/lib/agent.ts` | Core business logic — stash matching, pattern matching, gauge conversion, row explanation |
| `apps/web/lib/gauge.ts` | Deterministic gauge math (no AI) |
| `apps/web/lib/yarn-math.ts` | Deterministic yarn calculations — weight estimation, needle ranges, gauge ranges, yardage |
| `apps/web/lib/yarn-equiv.ts` | Deterministic yarn equivalence — fiber parsing, overlap scoring, composite ranking |
| `apps/web/lib/size-math.ts` | Deterministic size scoring — ease tables, measurement comparison, fit classification |
| `apps/web/lib/time-math.ts` | Deterministic time estimation — speed calculation, section estimates, calendar projection |
| `apps/web/lib/ravelry-search.ts` | Ravelry search proxy with Basic Auth + caching |
| `apps/web/lib/openai.ts` | OpenAI client instance |
| `apps/web/lib/prompts/yarn-sub.ts` | Yarn substitution prompt — fiber-aware gauge refinement + practical notes |
| `apps/web/lib/prompts/yarn-equiv.ts` | Yarn equivalence prompt — knitting-specific substitution evaluation |
| `apps/web/lib/prompts/size-rec.ts` | Size recommendation prompt — fit advice + between-sizes guidance |
| `apps/web/lib/prompts/time-estimate.ts` | Time estimation prompt — progress summary + pacing advice |
| `apps/web/lib/prompts/stash-planner.ts` | Stash planner prompt — fiber suitability + multi-strand suggestions |
| `apps/web/lib/prompts/tool-lookup.ts` | Needle/hook set lookup prompt |
| `apps/web/lib/prompts/colorway-identify.ts` | Yarn colorway identification prompt |
| `apps/web/app/api/v1/ai/` | AI route handlers (9 routes — see feature list above) |
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

| Feature | Free | Pro | Model |
|---------|------|-----|-------|
| Row instruction explainer | Yes | Yes | GPT-4o-mini |
| Saved pattern ↔ stash matching | Yes | Yes | None (pure DB) |
| Pattern discovery (Ravelry search) | Yes | Yes | None (Ravelry proxy) |
| Gauge calculator | Yes | Yes | None (deterministic) |
| Stash-to-pattern matching | No | Yes | None (Ravelry proxy) |
| Gauge conversion | No | Yes | GPT-4o |
| Yarn substitution | No | Yes | GPT-4o |
| Size recommendation | No | Yes | GPT-4o |
| Project time estimate | No | Yes | GPT-4o-mini |
| Stash-to-project planner | No | Yes | GPT-4o |
| Yarn equivalence finder | No | Yes | GPT-4o |
| PDF pattern parsing | 2/month | Unlimited | GPT-4o |
| Needle set lookup | No | Yes | GPT-4o |
| Colorway identification | No | Yes | GPT-4o (vision) |

---

## Database Tables

No chat tables needed. Relevant existing tables:

- `saved_patterns` — lightweight Ravelry pattern snapshots (weight, yardage, difficulty, etc.)
- `user_stash` + `yarns` + `yarn_companies` — user's yarn inventory (stash-match, stash-planner, yarn-equiv)
- `user_measurements` — body measurements for size recommendations (size-rec)
- `user_needles` — needle inventory for yarn-sub needle matching
- `patterns` + `pattern_sections` + `pattern_rows` + `pattern_sizes` — parsed patterns (gauge conversion, size-rec, stash-planner)
- `projects` + `project_sections` — active projects for time estimation
- `crafting_sessions` — session timing + row tracking for speed calculation (time-estimate)
- `row_counter_history` — granular row tracking
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
