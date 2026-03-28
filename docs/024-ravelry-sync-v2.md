# Ravelry Sync v2 — Clean Reimplementation Plan

**Status:** Plan ready for review. Implementation pending approval.

---

## Principles

1. **Ravelry sync is READ-ONLY** — the Ravelry API does not grant write access to third-party apps. All POST/PATCH/DELETE endpoints return 406. No app in the knitting ecosystem (KnitCompanion, Row Counter, etc.) has ever successfully written back to Ravelry.
2. **Pull only, never push** — sync imports Ravelry data into Stitch. Nothing is ever written back to Ravelry.
3. **Empty accounts are valid** — zero items = success, not error
4. **Partial failure is success** — if 3 of 4 phases work, that's "done" not "error"
5. **Needles are Stitch-only** — not synced from Ravelry
6. **If Ravelry ever grants write access** — email api@ravelry.com to request it. All write-back code was removed. Re-implement from scratch if approved.

---

## Ravelry API Endpoints (What Actually Exists)

### Read endpoints (GET)

| Endpoint | Returns | Notes |
|----------|---------|-------|
| `GET /people/{username}.json` | User profile (username, avatar, bio, location) | Always works with OAuth |
| `GET /projects/{username}/list.json` | Project summaries (paginated) | Personal data, needs OAuth |
| `GET /projects/{username}/{permalink}.json` | Full project detail | Personal data |
| `GET /people/{username}/library/list.json` | Pattern library (purchased/saved) | Personal data |
| `GET /patterns/{id}.json` | Public pattern detail | Works with Basic auth too |
| `GET /people/{username}/queue/list.json` | Queue items (paginated) | Personal data |
| `GET /people/{username}/stash/list.json` | Stash items (paginated) | Personal data |
| `GET /people/{username}/friends/list.json` | Friends list (paginated) | Personal data |
| `GET /patterns/search.json` | Pattern search | Public, works with Basic auth |

### Write endpoints (POST/PATCH/DELETE)

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `POST /projects/{username}.json` | Create | Create a project |
| `PATCH /projects/{username}/{permalink}.json` | Update | Update project fields |
| `DELETE /projects/{username}/{permalink}.json` | Delete | Delete a project |
| `POST /people/{username}/queue.json` | Create | Add pattern to queue |
| `DELETE /people/{username}/queue/{id}.json` | Delete | Remove from queue |
| `POST /people/{username}/stash.json` | Create | Add stash item |
| `PATCH /people/{username}/stash/{id}.json` | Update | Update stash item |
| `DELETE /people/{username}/stash/{id}.json` | Delete | Delete stash item |

### NOT available via API

- Needle creation/update/delete (read-only endpoint exists but is unreliable)
- User profile updates (no write endpoint)
- Follow/unfollow users
- Pattern creation/publishing
- Photo uploads to Ravelry

---

## What Syncs (The Complete Matrix)

### Projects — BIDIRECTIONAL

**Ravelry → Stitch (pull):**

| Ravelry field | Stitch field | Notes |
|---------------|-------------|-------|
| `name` | `title` | |
| `status_name` | `status` | Mapped: "In Progress"→active, "Finished"→completed, "Frogged"→frogged, "Hibernating"→hibernating |
| `craft_name` | `craft_type` | |
| `started` | `started_at` | Date |
| `completed` | `finished_at` | Date |
| `permalink` | `ravelry_permalink` | Used for write-back |
| `notes` | `description` | |
| `size` | `size_made` | |
| `pattern_id` | `pattern_id` (linked) | Auto-links to pattern in our DB |
| `gauge` | `project_gauge` | Converted from per-inch to per-10cm |
| `photos` | `project_photos` | Photo URLs stored |
| `packs` (yarns) | `project_yarns` | Yarn name, colorway, skeins |
| `tag_names` | `project_tags` | |

**Stitch → Ravelry (push) — ONLY these fields:**

| Stitch field | Ravelry field | When pushed |
|-------------|---------------|-------------|
| `title` | `name` | On project update |
| `status` | `status_name` | On project update or completion |
| `description` | `notes` | On project update |
| `size_made` | `size` | On project update |
| `started_at` | `started` | On project update |
| `finished_at` | `completed` | On project update |

**NEVER push to Ravelry:** gauge, tags, photos, yarns, needles, sections, row counts, pdf_upload_id, or any Stitch-specific field.

---

### Queue — BIDIRECTIONAL (limited)

**Ravelry → Stitch (pull):**

| Ravelry field | Stitch field |
|---------------|-------------|
| `pattern.id` | `pattern_id` (linked) |
| `pattern.name` | Pattern title |
| `notes` | `notes` |
| `position` | `sort_order` |
| `id` | `ravelry_queue_id` |

**Stitch → Ravelry (push):**

| Action | Ravelry call | When |
|--------|-------------|------|
| Add to queue | `POST /people/{username}/queue.json` | User adds a Ravelry pattern to queue |
| Remove from queue | `DELETE /people/{username}/queue/{id}.json` | User explicitly removes a queued Ravelry pattern |

**NEVER push:** Sort order changes, notes updates on existing queue items (Ravelry API doesn't support PATCH on queue items).

---

### Stash — BIDIRECTIONAL

**Ravelry → Stitch (pull):**

| Ravelry field | Stitch field |
|---------------|-------------|
| `yarn.name` | Via `yarns` table |
| `yarn.yarn_company_name` | Via `yarn_companies` table |
| `yarn.yarn_weight.name` | `yarn.weight` |
| `colorway_name` | `colorway` |
| `skeins` | `skeins` |
| `total_grams` | `grams` |
| `notes` | `notes` |
| `id` | `ravelry_id` |

**Stitch → Ravelry (push) — ONLY these fields:**

| Stitch field | Ravelry field | When pushed |
|-------------|---------------|-------------|
| `colorway` | `colorway` | On stash update |
| `skeins` | `skeins` | On stash update |
| `grams` | `grams` | On stash update |
| `notes` | `notes` | On stash update |

**NEVER push:** Status (in_stash/used_up), photos, yarn catalog data, or any Stitch-specific field.

---

### Patterns — READ ONLY (pull + search)

- **Pull:** Import from user's Ravelry library (patterns they own/purchased)
- **Search:** Proxy Ravelry pattern search for discovery
- **Save:** When user saves a Ravelry pattern, create a local `patterns` record
- **NEVER push:** Stitch-created patterns are never published to Ravelry

---

### Profile — ONE-TIME PULL ONLY

- **Pull:** Bio, location, avatar URL (only if Stitch fields are null)
- **NEVER push:** Profile changes in Stitch stay in Stitch

---

### Friends — ONE-TIME PULL ONLY

- **Pull:** Cross-reference Ravelry friends with Stitch users, auto-follow matches
- **NEVER push:** Stitch follows are not synced to Ravelry

---

### Needles — PROJECT-LEVEL ONLY (not standalone)

Ravelry does NOT have a write API for the user's needle/hook collection. However, needles CAN be attached to **projects** via the `needle_sizes` field on the project API.

Key constraints (from Ravelry community):
- `needle_sizes` must be submitted as JSON (not plain parameters)
- Needles are linked by `NeedleSize` ID (from `/needles/sizes.json`), not by metric size
- Craft type matters: a size ID maps to a hook for crochet projects, a needle for knitting projects
- You can only add hooks to crochet projects and needles to knitting projects
- Use `GET /needles/sizes.json?craft=knitting` or `?craft=crochet` to get valid size IDs

**What we sync:**
- When pulling projects from Ravelry, import the needles used on that project
- When pushing a project to Ravelry, include `needle_sizes` if the project has needles with known Ravelry size IDs

**What we DON'T sync:**
- The user's standalone needle collection (Stitch-only feature)
- Ravelry's read-only `/people/{username}/needles.json` endpoint (unreliable)

---

## Ravelry API Key Types and Permissions

Ravelry has 4 types of API credentials (selected when creating an app at ravelry.com/pro/developer):

| Type | Client ID format | Capabilities | Use case |
|------|-----------------|-------------|----------|
| **Basic Auth: read only** | `read-XXXXX` | GET public endpoints only (pattern search, yarn search) | Background searches without user auth |
| **Basic Auth: personal** | `purl-XXXXX` | GET public + personal data for YOUR account only | Personal scripts |
| **OAuth 1.0a** | 32-char hex | GET + POST/PATCH/DELETE for any authorized user | **This is what we use** |
| **OAuth 2.0** | Shown after setup | Bearer token auth | Newer, simpler but less common in knitting apps |

### Our setup

We use **OAuth 1.0a** (`RAVELRY_CLIENT_KEY=3dc102bd...`) for user authentication and data sync. The same credentials also work as Basic Auth for read-only public endpoints (pattern search, yarn search).

### Ravelry 406 "Not Acceptable" on writes

If POST/PATCH/DELETE returns 406, it means one of:
1. The API app is **read-only** (Basic Auth type, not OAuth)
2. The OAuth app's tokens were obtained without write scope
3. The Ravelry user account hasn't completed initial setup (needs to accept ToS, set username, or create a profile on ravelry.com first)
4. The request body format is wrong — but 406 specifically means the SERVER can't satisfy the request, not a format error

**Important:** A 406 is NOT a body/content-type issue. Don't waste time trying different POST body formats (JSON, form-urlencoded, Rails params, query params). If reads work but all writes return 406, it's always a permissions issue.

### Library endpoint returning 302

The `/people/{username}/library/list.json` endpoint returns a 302 redirect to the login page for accounts that have no library OR when the OAuth tokens lack personal read scope. This is NOT an auth expiry — treat it as "empty library" and continue.

### What works with our OAuth 1.0a credentials

**Confirmed working (tested):**
- `GET /people/{username}.json` — profile
- `GET /projects/{username}/list.json` — projects list (empty = 0 items, not error)
- `GET /people/{username}/queue/list.json` — queue (empty = 0 items)
- `GET /people/{username}/stash/list.json` — stash (empty = 0 items)
- `GET /people/{username}/friends/list.json` — friends (empty = 0 items)
- `GET /patterns/search.json` — pattern search
- `GET /patterns/{id}.json` — pattern detail
- `GET /needles/sizes.json` — needle size reference

**Confirmed NOT working (406):**
- `POST /projects/{username}.json` — create project
- `POST /people/{username}/queue.json` — add to queue
- `POST /people/{username}/stash.json` — create stash item

**Needs investigation:**
- Whether the 406 is from the app config or the test account setup
- Whether a fresh OAuth authorization fixes the write permissions

---

## Sync Phases

### Full sync (triggered by user)

| Phase | What | Direction | Failure handling |
|-------|------|-----------|-----------------|
| 0 | Push local project changes | Stitch → Ravelry | Skip on error, continue |
| 1 | Pull profile | Ravelry → Stitch | Skip on error, continue |
| 2 | Pull projects | Ravelry → Stitch | Empty = success |
| 3 | Pull library (patterns) | Ravelry → Stitch | Empty = success |
| 4 | Pull queue | Ravelry → Stitch | Empty = success |
| 5 | Pull stash | Ravelry → Stitch | Empty = success |
| 6 | Pull friends (auto-follow) | Ravelry → Stitch | Skip on error, continue |

**Every phase catches errors internally.** No phase failure stops the sync. An empty API response (0 items) is treated as success, not error. The final status is ALWAYS "done".

### Per-item write-back (triggered by user actions)

| User action | Ravelry call | Condition |
|-------------|-------------|-----------|
| Update project title/status/notes/dates | `PATCH /projects/{username}/{permalink}.json` | Project has `ravelry_permalink` AND `sync_to_ravelry = true` |
| Delete project | `DELETE /projects/{username}/{permalink}.json` | Project has `ravelry_permalink` |
| Add Ravelry pattern to queue | `POST /people/{username}/queue.json` | Pattern has `ravelry_id` |
| Remove from queue | `DELETE /people/{username}/queue/{id}.json` | Queue item has `ravelry_queue_id` |
| Update stash item | `PATCH /people/{username}/stash/{id}.json` | Item has `ravelry_id` |
| Delete stash item | `DELETE /people/{username}/stash/{id}.json` | Item has `ravelry_id` |

All write-backs are fire-and-forget. Errors are logged but don't affect the user's local operation.

---

## iOS Sync View States

Only 3 states:

| State | Icon | Title | Buttons |
|-------|------|-------|---------|
| **Syncing** | Spinner | "Syncing {phase}..." | None (can't dismiss) |
| **Done** | Green checkmark | "Sync complete" | "Done" |
| **Done with note** | Green checkmark | "Sync complete" | "Done" + small note about skipped items |

No error states. No "connection expired". No "sync failed". The sync always completes. If individual phases fail, they're noted but don't change the overall status.

---

## Files to Create/Rewrite

| File | Action |
|------|--------|
| `apps/web/app/api/v1/integrations/ravelry/sync/route.ts` | **Rewrite** — clean implementation following this plan |
| `apps/web/lib/ravelry-client.ts` | **Update** — remove needles methods, fix error handling |
| `apps/ios/Stitch/Features/Settings/RavelerySyncView.swift` | **Rewrite** — 3 states only, no error states |
| `apps/web/app/api/v1/integrations/ravelry/connect/route.ts` | **Update** — remove `scope` param |
| `apps/web/app/api/v1/integrations/ravelry/status/route.ts` | **Simplify** — remove token validation |

---

## What We Keep

- OAuth 1.0a flow (connect/callback/exchange) — working correctly
- RavelryClient base class (signing, request methods) — working correctly
- Fire-and-forget push-back pattern — working correctly
- Disconnect route — working correctly
- Settings view connect/disconnect UI — working correctly

---

## Ravelry API License Compliance

### Must-do items (legal requirements)

**1. Contact Ravelry (REQUIRED before launch)**

Two clauses require explicit Ravelry approval:

- **Clause c (Commercial use):** "The API may only be used for commercial applications whose primary audience is Ravelry Users unless Ravelry expressly allows otherwise." — Stitch serves both Ravelry users and non-Ravelry users. We must email api@ravelry.com to get approval for our use case. Frame it as: "Stitch is a companion app for the fiber community that integrates with Ravelry to enhance the experience for Ravelry users."

- **Clause f (Competition):** "You may not use the API to create applications that in any way compete with or diminish the need for any of Ravelry's own commercial applications." — Stitch overlaps with Ravelry features (project tracking, stash, patterns). We must get explicit acknowledgment. Many apps (KnitCompanion, Row Counter, Ribblr) operate in this space, so precedent exists. But we need to ask.

Action: Email api@ravelry.com BEFORE public launch explaining what Stitch does and requesting approval.

**2. Data usage disclosure (REQUIRED in app)**

- **Clause (Respect for Users, a):** "must conspicuously disclose to users how the application collects, stores and uses Ravelry's users' Content and/or data."

We need a visible disclosure screen shown during Ravelry connection that explains:
- What data we import (projects, stash, queue, patterns, profile)
- That we store it in our database for the app to function
- That we push changes back to Ravelry when the user makes edits (if sync is enabled)
- That the user can disconnect at any time and we stop accessing their data

This should be a screen shown BEFORE the OAuth authorize redirect, not buried in settings.

**3. Data retention on disconnect (REQUIRED)**

- **Clause (Respect for Users, c):** "You may only store Ravelry users' data or Content for as long as is necessary to provide the service."

When a user disconnects Ravelry, we currently keep all imported data. This is fine while they're using the app. But if a user deletes their Stitch account, we must delete all Ravelry-sourced data.

- **Clause (Respect for Users, b):** If a Ravelry user requests deletion of their data, we must comply.

Action: Ensure the account deletion flow also deletes all Ravelry-imported data (projects with `ravelry_id`, stash with `ravelry_id`, queue items, etc.).

### Already compliant

| Clause | Status | How |
|--------|--------|-----|
| **a (No reverse engineering)** | Compliant | We use the API as documented, no decompilation |
| **b (Terms of Use)** | Compliant | We follow Ravelry's ToS |
| **e (No false association)** | Compliant | UI clearly shows "Stitch" branding, Ravelry is labeled as an integration |
| **h (Data use consistent with wishes)** | Compliant | We only use data to provide our service to the user who owns it |
| **i (No resale of API/data)** | Compliant | Our marketplace sells Stitch-created patterns, not Ravelry data. Ravelry patterns are never sold through our marketplace. |

### Marketplace-specific compliance

Our pattern marketplace ONLY sells patterns created in Stitch. Patterns imported from Ravelry:
- Cannot be listed on the marketplace (`ravelry_id != null` blocks listing)
- Cannot be marked as public/shared (`source_free` check blocks it)
- Are clearly attributed to their Ravelry source

This complies with clause i (no redistribution of Ravelry data).

### UI requirements

1. **Ravelry attribution:** Every pattern/project sourced from Ravelry must show a Ravelry attribution badge (already implemented as the "Ravelry" tag in metadata chips)
2. **No Ravelry logo misuse:** We use text "Ravelry" and a link icon, never the Ravelry logo itself (unless we get permission)
3. **Clear separation:** The Discover tab has separate "Community" (Stitch), "Marketplace" (Stitch), and "Ravelry" segments — Ravelry content is clearly labeled

---

## What We Remove

- Needles sync (read and write)
- `tokenValid` validation on status endpoint
- `import_status: 'error'` — always "done"
- `authExpired` state in iOS
- Friends sync as a standalone phase (move to background, non-blocking)
- `scope=app-write` from authorize URL
