# Pattern Queue

**Status:** Partially complete

## Problem Statement

Users need a "want to make" list to save patterns they plan to knit or crochet later. Without a queue, users resort to external tools (bookmarks, spreadsheets, Ravelry) to track what they want to make next, reducing engagement with the app.

## Solution Overview

A reorderable queue where users save patterns with optional notes. Each entry links to the patterns table and supports Ravelry sync via ravelry_queue_id. One entry per user per pattern (enforced by unique constraint). Users can start a new project directly from a queue item, pre-filling project details from the pattern.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `GET /api/v1/queue` | List user's queue (ordered by sort_order) | Not started |
| `POST /api/v1/queue` | Add pattern to queue (pattern_id, optional notes) | Not started |
| `PATCH /api/v1/queue/[id]` | Update notes or sort_order for a queue entry | Not started |
| `DELETE /api/v1/queue/[id]` | Remove pattern from queue | Not started |
| `POST /api/v1/queue/reorder` | Bulk update sort_order for drag-to-reorder | Not started |
| `POST /api/v1/queue/[id]/start-project` | Create project from queue item, pre-fill from pattern | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `QueueView.swift` | Main queue list with drag-to-reorder | Placeholder only (tab exists in MainTabView) |
| `QueueViewModel.swift` | Load, add, remove, reorder queue items | Not started |
| `QueueItemRow.swift` | Row displaying pattern title, cover image, notes | Not started |
| Add-to-queue button on pattern detail | Quick add from pattern browsing | Not started |
| Start project from queue sheet | Pre-fills project creation from pattern data | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/queue/page.tsx` | Queue page with drag-to-reorder list | Not started |
| `QueueCard` component | Card showing pattern info, notes, remove button | Not started |
| Add-to-queue button on pattern pages | Quick add from pattern detail | Not started |

### Database

| Table | Purpose |
|---|---|
| `pattern_queue` | Queue entries: user_id, pattern_id, notes, sort_order, ravelry_queue_id |

Unique constraints: `[user_id, pattern_id]`, `[user_id, ravelry_queue_id]`. Indexed on `[user_id]`.

## Implementation Checklist

- [x] Database schema (pattern_queue table with constraints and indexes)
- [x] Ravelry sync imports queue data (populates ravelry_queue_id)
- [x] Queue tab in iOS MainTabView
- [ ] API routes: CRUD for queue entries
- [ ] API route: bulk reorder
- [ ] API route: start project from queue item
- [ ] iOS QueueViewModel (load, add, remove, reorder)
- [ ] iOS QueueView with drag-to-reorder
- [ ] iOS QueueItemRow component
- [ ] iOS add-to-queue button on pattern detail screen
- [ ] iOS start-project-from-queue flow
- [ ] Web queue page with sortable list
- [ ] Web QueueCard component
- [ ] Web add-to-queue button on pattern pages
- [ ] Activity event: emit "pattern_queued" when adding to queue

## Dependencies

- Pattern Library (004) for patterns table and pattern detail views
- Ravelry Sync (005) for importing existing Ravelry queue entries
- Authentication (001) for user identification

## Tier Gating

Free for all users. No Pro gating on queue size or functionality.

## Technical Notes

- The reorder endpoint should accept an array of `{ id, sort_order }` pairs and update them in a single transaction to avoid inconsistent ordering.
- When starting a project from a queue item, pre-fill title, craft_type, pattern_id, and linked yarn/needle info from the pattern. Do not auto-remove from queue, let the user decide.
- Ravelry sync should match existing queue entries by ravelry_queue_id to avoid duplicates on re-import.
- The QueueView tab already exists in MainTabView but renders a placeholder. Replace the placeholder with the real implementation.
