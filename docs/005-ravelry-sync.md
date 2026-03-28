# Ravelry Sync

**Status:** Complete

## Overview

Bidirectional sync between Stitch and Ravelry via OAuth 1.0a. Users authorize Stitch with `app-write` scope, granting both read and write access. Stitch imports projects, patterns (library), queue, stash, and friends from Ravelry, then pushes Stitch-only projects back to Ravelry. OAuth tokens are encrypted at rest with AES-256-GCM.

Two sync modes:

- **Full sync** -- manual trigger, imports all data types and pushes changes back. Takes 30-60s depending on account size.
- **Quick sync** -- fires on app open, throttled to every 15 minutes. Pulls status changes for the 20 most recent projects and pushes locally-modified projects back. Takes 2-5s.

---

## OAuth 1.0a Connection Flow

**Scope:** `app-write` (full read + write for authorized user)

### Step 1: Request Token

`GET /api/v1/integrations/ravelry/connect`

1. Server obtains a request token from `https://www.ravelry.com/oauth/request_token` using HMAC-SHA1.
2. The request token secret is encrypted (AES-256-GCM) and embedded in a state parameter.
3. **iOS**: Returns JSON `{ url, state }` so the app can open `ASWebAuthenticationSession`.
4. **Web**: Sets `ravelry_state` cookie (httpOnly, 10-minute TTL) and redirects to Ravelry's authorize page.

### Step 2: Callback

`GET /api/v1/integrations/ravelry/callback`

Ravelry redirects here with `oauth_token` and `oauth_verifier`.

- **Web flow**: Reads encrypted state from cookie, exchanges for access token, stores in DB, redirects to `/settings`.
- **iOS flow**: No cookie present. Redirects to `stitch://ravelry-callback` with OAuth params. The app then calls the exchange endpoint.

### Step 3: Token Exchange (iOS only)

`POST /api/v1/integrations/ravelry/exchange`

iOS passes `oauth_token`, `oauth_verifier`, and encrypted `state`. Server decrypts the request token secret, exchanges for access token via `https://www.ravelry.com/oauth/access_token`, encrypts both tokens, and upserts `ravelry_connections`.

### Disconnect

`POST /api/v1/integrations/ravelry/disconnect`

Deletes the `ravelry_connections` row (destroying tokens). All imported data (projects, stash, patterns, etc.) is preserved.

### Token Storage

| Field | Encryption | Location |
|-------|-----------|----------|
| `access_token` | AES-256-GCM via `lib/encrypt.ts` | `ravelry_connections` table |
| `token_secret` | AES-256-GCM via `lib/encrypt.ts` | `ravelry_connections` table |
| Request token secret (transient) | AES-256-GCM in state param | Cookie (web) or JSON response (iOS) |

Requires `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes).

---

## Full Sync

`POST /api/v1/integrations/ravelry/sync`

**Timeout:** 300 seconds (`maxDuration = 300`).

Runs seven phases sequentially. After each phase, progress is persisted to `ravelry_connections.import_stats` so the iOS client can poll.

### Phases

| # | Phase | What it does |
|---|-------|-------------|
| 1 | **Profile** | Backfills `bio`, `location`, `avatar_url` from Ravelry profile (only if not manually set) |
| 2 | **Projects** | Fetches all pages of projects, then fetches detail for each (batched 5 at a time). Upserts by `ravelry_id`. Imports photos, yarns, gauge, tags. Links patterns. Backfills activity events for new imports. |
| 3 | **Patterns (Library)** | Fetches all pages of user's Ravelry library. For each volume with a linked pattern, fetches full pattern detail from Ravelry and upserts a rich pattern record (description, gauge, photos, difficulty, etc.). |
| 4 | **Queue** | Fetches all queued projects. Fetches full pattern details for each. Upserts `pattern_queue` by `ravelry_queue_id`. Creates pattern records if missing. |
| 5 | **Stash** | Fetches all stash items. Upserts `yarn_companies` and `yarns` catalog entries. Upserts `user_stash` by `ravelry_id`. |
| 6 | **Friends** | Fetches friend list. Cross-references Ravelry usernames against `ravelry_connections` to find friends already on Stitch. Auto-follows matched users (one-directional). |
| 7 | **Push Back** | Creates Ravelry projects for Stitch-only projects (no `ravelry_id`). Updates all linked projects with current Stitch data. See [Write-Back Pattern](#write-back-pattern). |

### Concurrency Guard

If `import_status` is `'importing'`, the endpoint returns 409 unless the sync has been stuck for over 5 minutes (then it allows restart).

### Stats Object

Persisted to `ravelry_connections.import_stats` as JSON:

```json
{
  "current_phase": "projects",
  "profile": { "updated": true },
  "projects": { "imported": 12, "updated": 3, "total": 15 },
  "patterns": { "imported": 8, "updated": 2 },
  "queue": { "imported": 5, "updated": 0 },
  "stash": { "imported": 20, "updated": 4 },
  "friends": { "matched": 3, "followed": 2, "notOnStitch": 15 },
  "push_back": { "projects_created": 2, "projects_updated": 10, "errors": 0 }
}
```

---

## Quick Sync

`POST /api/v1/integrations/ravelry/sync/quick`

Lightweight sync designed to run on app open.

- **Throttle:** Skips if `synced_at` is less than 15 minutes ago.
- **Skips if:** Not connected, or full sync is in progress.
- **Pull:** Fetches first page of projects (up to 20). Updates status for existing linked projects only. Does not create new projects.
- **Push:** Finds the 20 most recently updated local projects with a `ravelry_id`. Pushes any modified since `synced_at`.
- **Updates** `synced_at` on completion.

---

## Write-Back Pattern

All Ravelry writes follow the same pattern:

1. **DB write first** -- the primary mutation always hits our Postgres database.
2. **Ravelry push second** -- after the DB write succeeds, push to Ravelry.
3. **Non-blocking** -- if the Ravelry push fails, log the error but do not fail the user's request. The data stays in Stitch and will be retried on next sync.

Write helpers live in `apps/web/lib/ravelry-push.ts`.

---

## Verified Ravelry Write Endpoints

Tested as of 2026-03-19 with OAuth 1.0a `app-write` scope.

### Projects -- Full CRUD

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Create | `POST` | `/projects/{username}/create.json` | Returns `{project}` with ID. Creates empty shell, then update with data. |
| Update | `POST` | `/projects/{username}/{id}.json` | Fields: `name`, `notes`, `craft_id`, `status_id`, `started`, `completed`, `rating`, `progress`, `made_for`, `tag_names[]` |
| Delete | `DELETE` | `/projects/{username}/{id}.json` | Returns 200 |

Status mapping: `active` = 1, `completed` = 2, `hibernating` = 3, `frogged` = 4.
Craft mapping: `knitting` = 1, `crochet` = 2.

### Favorites -- Create + Delete

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Create | `POST` | `/people/{username}/favorites/create.json` | Body (flat, not nested): `{ type: "pattern", favorited_id: <id> }`. Types: pattern, yarn, project, stash, designer, yarnbrand. |
| Delete | `DELETE` | `/people/{username}/favorites/{id}.json` | Returns 200 |

### Stash -- Limited

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Create | `POST` | `/people/{username}/stash/create.json` | Creates empty shell. Most fields ignored. |
| Update | `POST` | `/people/{username}/stash/{id}.json` | Only `notes` field actually works. |
| Delete | `DELETE` | `/people/{username}/stash/{id}.json` | Returns 200 |

### Queue -- Limited

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Create | `POST` | `/people/{username}/queue/create.json` | Creates empty shell. Fields ignored. |
| Delete | `DELETE` | `/people/{username}/queue/{id}.json` | Returns 200 |

### Not Writable

| Endpoint | Result |
|----------|--------|
| Needles | 302 redirect on all write attempts |
| Library | No write endpoint found |
| Profile | No write endpoint found |

---

## Safety Rules

1. **Never bulk-delete from Ravelry during sync.** Sync operations only create or update records on Ravelry. Deleting from Ravelry is only allowed when a user explicitly deletes a specific item via a user-initiated action.
2. **Partial failure is OK.** If a phase fails partway through, imported data is kept. The next sync picks up where it left off. Errors are collected in an array and persisted as informational, not fatal.
3. **Local data survives sync.** Items created in Stitch without a `ravelry_id` are never touched by the pull phase. They are Stitch-only data.
4. **Empty accounts are valid.** Zero items from any Ravelry endpoint is treated as success, not error.
5. **Stuck sync recovery.** If `import_status` has been `'importing'` for over 5 minutes, a new sync request is allowed to restart.
6. **Auth errors vs network errors.** Only `RavelryAuthError` (401 from Ravelry) triggers "session expired" UI. Network errors, timeouts, and 302 redirects are logged but do not invalidate the connection.

---

## API Quirks

| Quirk | Details |
|-------|---------|
| **302 for empty data** | Personal endpoints (`/library`, `/queue`, `/stash`) return 302 redirect for accounts with no data or insufficient scope. Treated as empty, not as auth expiry. |
| **302 on write = permissions** | 302 from a write attempt means the endpoint is not writable (e.g., needles). Do not retry with different Content-Type. |
| **Photo URLs** | Ravelry returns photo URLs as full `https://` URLs. Store as-is. Some older docs claim relative URLs -- that is no longer the case for the endpoints we use. |
| **Pagination** | Uses `page` + `page_size` params. Max `page_size` is 100. The `fetchAllPages` helper iterates through all pages automatically. |
| **Non-JSON responses** | Some write endpoints return 200 with no JSON body. The client handles this by checking Content-Type before parsing. |
| **406 on writes** | Means API app type does not have write permissions. Check OAuth scope (`app-write`), not request body format. |
| **Library endpoint** | `/people/{username}/library/list.json` returns 302 for empty libraries. Caught and returned as empty array. |
| **Needles endpoint** | `/people/{username}/needles.json` is unreliable. Needles are Stitch-only and not synced. |
| **Rate limits** | Respect 1 req/sec for search endpoints. Project detail fetches are batched 5 at a time via `batchMap`. |

---

## iOS Sync UI

`apps/ios/Stitch/Features/Settings/RavelerySyncView.swift`

### Behavior

1. On appear, checks current sync status via `GET /integrations/ravelry/status`.
2. If not already importing, fires `POST /integrations/ravelry/sync` in a detached task (non-blocking, since sync takes minutes).
3. Polls status every 1.5 seconds (up to 200 polls = ~5 minutes timeout).
4. Updates progress bar and phase indicators based on `import_stats.current_phase`.

### Displayed Phases

| Key | Label | Icon |
|-----|-------|------|
| `profile` | Profile | `person.fill` |
| `projects` | Projects | `folder.fill` |
| `patterns` | Patterns | `doc.text.fill` |
| `queue` | Queue | `list.bullet` |
| `stash` | Stash | `basket.fill` |
| `push_back` | Sync to Ravelry | `arrow.up.circle.fill` |

### States

| State | Visual | Dismissable |
|-------|--------|-------------|
| `idle` | Spinner + "Preparing sync..." | No |
| `syncing` | Progress bar + phase checklist advancing | No |
| `success` | Green checkmark + stats summary (imported from Ravelry / pushed to Ravelry) | Yes |
| `partialFailure` | Orange warning + stats + error summary | Yes |
| `failed` | Red X + error message + retry button | Yes |

### Stats Summary

On success or partial failure, the view shows two sections:
- **Imported from Ravelry:** Projects (x of y), Patterns, Queue, Stash counts.
- **Pushed to Ravelry:** Projects created, Projects updated counts.
- If all zeros: "Everything is already in sync."

---

## API Routes

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/v1/integrations/ravelry/connect` | `GET` | Obtain request token, return authorize URL | Complete |
| `/api/v1/integrations/ravelry/callback` | `GET` | OAuth callback -- web exchanges tokens, iOS redirects to `stitch://` | Complete |
| `/api/v1/integrations/ravelry/exchange` | `POST` | iOS-only token exchange | Complete |
| `/api/v1/integrations/ravelry/disconnect` | `POST` | Delete tokens, preserve data | Complete |
| `/api/v1/integrations/ravelry/status` | `GET` | Connection status, sync stats, optional token validation (`?validate=true`) | Complete |
| `/api/v1/integrations/ravelry/settings` | `GET` | Sync preferences (currently read-only) | Complete |
| `/api/v1/integrations/ravelry/sync` | `POST` | Full bidirectional sync (all phases) | Complete |
| `/api/v1/integrations/ravelry/sync/quick` | `POST` | Lightweight sync on app open (15-min throttle) | Complete |
| `/api/v1/integrations/ravelry/sync/queue` | `POST` | Queue-only sync | Complete |
| `/api/v1/integrations/ravelry/sync/stash` | `POST` | Stash-only sync | Complete |

---

## Database Tables

| Table | Role in Ravelry sync |
|-------|---------------------|
| `ravelry_connections` | OAuth tokens (encrypted), `synced_at`, `import_status`, `import_stats` (JSON), `import_error`, `sync_to_ravelry` toggle |
| `projects` | `ravelry_id`, `ravelry_permalink` fields for linked projects |
| `project_photos` | Imported from Ravelry project detail |
| `project_yarns` | Imported yarn assignments per project |
| `project_gauge` | Converted from Ravelry gauge (stitches/rows over N inches to per-10cm) |
| `project_tags` / `tags` | Imported from Ravelry tag_names |
| `patterns` | `ravelry_id` for library items. Rich data: description, gauge, difficulty, photos, etc. |
| `pattern_photos` | All photos from Ravelry pattern detail |
| `pattern_queue` | `ravelry_queue_id` for linked queue items |
| `user_stash` | `ravelry_id` for linked stash items |
| `yarns` / `yarn_companies` | Catalog entries created during stash import |
| `follows` | Auto-follows created from Ravelry friends |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `apps/web/lib/ravelry-client.ts` | `RavelryClient` class -- OAuth 1.0a signed requests, GET/POST/PUT/DELETE, all read endpoints |
| `apps/web/lib/ravelry-push.ts` | Write-back helpers -- `ravelryCreateProject`, `ravelryUpdateProject`, `ravelryDeleteProject`, favorites, queue, stash delete |
| `apps/web/lib/ravelry-search.ts` | Pattern search proxy (Basic Auth with OAuth fallback) + pattern detail fetching |
| `apps/web/lib/encrypt.ts` | AES-256-GCM encryption/decryption for OAuth tokens |
| `apps/ios/Stitch/Features/Settings/RavelerySyncView.swift` | iOS sync progress UI |
| `apps/ios/Stitch/Core/Network/RavelrySyncHelper.swift` | Shared sync helper for ViewModels |

---

## Dependencies

- `RAVELRY_CLIENT_KEY`, `RAVELRY_CLIENT_SECRET`, `RAVELRY_CALLBACK_URL` env vars
- `ENCRYPTION_KEY` env var (64 hex characters for AES-256)
- Clerk auth (all routes use `withAuth`)
- `lib/activity.ts` for backfilling activity events on project import

---

## Tier Gating

| Feature | Free | Plus | Pro |
|---------|------|------|-----|
| First Ravelry import | Yes | Yes | Yes |
| Manual re-sync | Yes (TODO: Pro-gate commented out) | Yes | Yes |
| Quick sync on app open | Yes | Yes | Yes |
| Write-back to Ravelry | Yes | Yes | Yes |

Note: The Pro gate for re-sync is stubbed in the code but currently commented out. All tiers can sync.
