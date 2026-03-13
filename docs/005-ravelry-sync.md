# Ravelry Sync

**Status:** Complete

## Problem Statement

Most serious knitters already have years of project history, yarn stash data, and pattern queues on Ravelry. Stitch must import this data so users do not have to re-enter everything manually, and optionally sync changes back to Ravelry so users can maintain both platforms without double entry.

## Solution Overview

OAuth 2.0 integration with Ravelry's API. Users authorize Stitch to access their Ravelry account, and we import projects, stash (yarns), queue, and needles. Tokens are encrypted at rest with AES-256-GCM. Bidirectional sync is opt-in via a user-controlled toggle, with per-type timestamps to enable incremental syncs.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/integrations/ravelry/connect` | Generates OAuth authorization URL with state parameter | Complete |
| `GET /api/v1/integrations/ravelry/callback` | Handles OAuth callback, exchanges code for tokens, encrypts and stores | Complete |
| `POST /api/v1/integrations/ravelry/sync` | Triggers bidirectional sync for all types (projects, stash, queue, needles) | Complete |
| `GET /api/v1/integrations/ravelry/status` | Returns connection status, last sync times, import stats | Complete |
| `PATCH /api/v1/integrations/ravelry/settings` | Update sync preferences (sync_to_ravelry toggle) | Complete |
| `lib/encrypt.ts` | AES-256-GCM encryption/decryption for OAuth tokens | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| Ravelry section in SettingsView | Connect button, sync trigger, status display | Complete |
| Ravelry connect step in OnboardingView | Optional Ravelry authorization during onboarding | Complete |
| Sync status indicators | Last sync time, item counts per type | Complete |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| Ravelry settings section | Connect, disconnect, sync controls | Not started |
| Sync progress indicator | Visual feedback during sync | Not started |

### Database

| Table | Purpose |
|---|---|
| `ravelry_connections` | OAuth tokens (encrypted), sync preferences, per-type sync timestamps |
| `saved_patterns` | Lightweight Ravelry pattern snapshots (title, author, ravelry_url) |
| `projects` | Synced projects (ravelry_id, ravelry_permalink fields) |
| `user_stash` | Imported yarn stash |
| `pattern_queue` | Imported Ravelry queue items |
| `user_needles` | Imported needle inventory |
| `yarns` | Yarn reference data |
| `yarn_companies` | Yarn brand/company data |

## Implementation Checklist

- [x] OAuth connect endpoint with state parameter
- [x] OAuth callback with token exchange
- [x] AES-256-GCM token encryption at rest
- [x] Sync endpoint: projects
- [x] Sync endpoint: stash (yarns)
- [x] Sync endpoint: queue
- [x] Sync endpoint: needles
- [x] Per-type sync timestamps (stash_synced_at, projects_synced_at, queue_synced_at, needles_synced_at)
- [x] Write-back toggle (sync_to_ravelry), user-controlled
- [x] Import stats tracking (JSON with counts per type)
- [x] Status endpoint returning connection and sync info
- [x] Settings endpoint for updating sync preferences
- [x] iOS SettingsView Ravelry section
- [x] iOS OnboardingView Ravelry connect step
- [x] saved_patterns table for Ravelry pattern snapshots
- [ ] Automatic sync on app open (currently manual trigger only)
- [ ] Conflict resolution for bidirectional edits (last-write-wins or user prompt)
- [ ] Sync error recovery UI (retry failed items, show which items failed)
- [ ] Background sync job scheduling (periodic auto-sync for Pro users)
- [ ] Ravelry disconnect/revoke flow (delete tokens, optionally remove synced data)
- [ ] Web Ravelry settings UI
- [ ] Rate limiting compliance with Ravelry API limits

## Dependencies

- Authentication (001) for user identification
- Ravelry API credentials (RAVELRY_CLIENT_KEY, RAVELRY_CLIENT_SECRET, RAVELRY_CALLBACK_URL)
- ENCRYPTION_KEY env var (64 hex characters for AES-256)

## Tier Gating

| Feature | Free | Pro |
|---|---|---|
| First Ravelry import | Yes | Yes |
| Manual re-sync | No | Yes |
| Automatic re-sync | No | Yes |
| Write-back to Ravelry | No | Yes |

## Technical Notes

- OAuth tokens are encrypted with AES-256-GCM before storage. The `ENCRYPTION_KEY` env var must be exactly 64 hex characters (32 bytes). The `lib/encrypt.ts` module handles encryption and decryption, storing the IV alongside the ciphertext.
- The sync endpoint fetches all items from Ravelry's API, then upserts into local tables using `ravelry_id` as the match key. This is an incremental approach: only items modified after the last sync timestamp are fetched.
- Write-back (sync_to_ravelry) is off by default. When enabled, local edits to synced projects trigger a PATCH to Ravelry's API. This is a one-way push, not a merge.
- Ravelry's API has rate limits. The sync endpoint should batch requests and respect `Retry-After` headers.
- The `saved_patterns` table stores lightweight snapshots of Ravelry patterns (not full structured data). Users who want full pattern data should use the PDF parsing feature (004) or manual entry.
- Conflict resolution is not yet implemented. Currently, the most recent sync overwrites local data. A future improvement should detect conflicts (local edit timestamp vs Ravelry edit timestamp) and prompt the user.
- The disconnect flow should: (1) delete the ravelry_connections row, (2) optionally ask the user if they want to keep or remove synced data, (3) revoke the token via Ravelry's API if they support it.
