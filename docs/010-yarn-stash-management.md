# Yarn Stash Management

**Status:** Schema complete, Ravelry sync imports data

## Problem Statement

Crafters accumulate yarn over time and lose track of what they own, how much they have, and what they can make with it. Without stash management, users buy duplicate yarn or start projects without enough yardage. The stash is also a key input for the AI agent's pattern recommendations.

## Solution Overview

A personal yarn inventory where each stash item links to a yarn from a shared catalog (yarns + yarn_companies). Users add yarn manually or import from Ravelry. Stash items track status (in stash, used up, gifted, for sale) and link to projects via project_yarns. The stash feeds into the AI agent for "what can I make?" recommendations.

## Key Components

### Backend (Next.js API)

- `GET /api/v1/stash` - paginated stash list with filters (status, weight, company). Includes yarn details (name, company, weight, fiber). **Not started.**
- `POST /api/v1/stash` - add a stash item. Accepts yarn_id (existing catalog entry) or creates a new yarn catalog entry inline. **Not started.**
- `PATCH /api/v1/stash/:id` - update skeins, colorway, status, notes. **Not started.**
- `DELETE /api/v1/stash/:id` - remove from stash. **Not started.**
- `GET /api/v1/stash/stats` - summary: total skeins, total grams, breakdown by weight category, breakdown by status. **Not started.**
- `GET /api/v1/yarns/search` - search the shared yarn catalog by name, company, weight. Used for typeahead when adding stash items. **Not started.**
- `POST /api/v1/yarns` - add a yarn to the shared catalog (if not already present). **Not started.**
- `GET /api/v1/yarn-companies` - list companies for filter dropdowns. **Not started.**
- Activity event creation (stash_added) when a user adds yarn. **Not started.**

### iOS (SwiftUI)

- `StashListView` - grid or list of stash items with filter chips (weight, status, company). Shows yarn photo, name, company, colorway, skeins remaining, weight badge. **Not started.**
- `StashDetailView` - full detail for a stash item: yarn info, colorway, skeins, grams, notes, status picker, linked projects. **Not started.**
- `AddStashItemView` - form with yarn search (typeahead against catalog), colorway, skeins, grams, notes. Option to create a new yarn if not in catalog. **Not started.**
- `YarnSearchView` - typeahead search component for finding yarns in the shared catalog. **Not started.**
- `StashFilterSheet` - bottom sheet for selecting weight, status, and company filters. **Not started.**
- `StashStatsCard` - summary card on stash page showing totals. **Not started.**
- `StashViewModel` - CRUD operations, filtering, stats. **Not started.**

### Web (Next.js)

- `(app)/stash/page.tsx` - stash list with filters and stats summary. **Not started.**
- `(app)/stash/add/page.tsx` - add stash item form with yarn search. **Not started.**
- `components/features/stash/StashCard.tsx` - card for stash grid/list display. **Not started.**
- `components/features/stash/StashFilters.tsx` - filter bar for weight, status, company. **Not started.**
- `components/features/stash/YarnSearch.tsx` - typeahead component for yarn catalog. **Not started.**
- `components/features/stash/StashStats.tsx` - totals and breakdown charts. **Not started.**

### Database

- `user_stash` - user_id, yarn_id, colorway, skeins (Float), grams, notes, status ("in_stash" | "used_up" | "gifted" | "for_sale"), ravelry_id. Unique on [user_id, ravelry_id]. Indexed on user_id.
- `yarns` - shared catalog. id, company_id, name, colorway, weight, fiber_content, yardage_per_skein, grams_per_skein, ravelry_id (unique), image_url.
- `yarn_companies` - id, name (unique), website.
- `project_yarns` - links projects to yarns/stash items. project_id, yarn_id, stash_item_id, name_override (for imports without catalog match), colorway, skeins_used.

## Implementation Checklist

- [x] Database schema for user_stash, yarns, yarn_companies, project_yarns
- [x] Ravelry sync imports stash items and creates yarn catalog entries
- [x] Status field with enum values (in_stash, used_up, gifted, for_sale)
- [x] Unique constraint on [user_id, ravelry_id] for dedup during sync
- [x] Shared yarn catalog with ravelry_id for dedup
- [ ] Stash CRUD API routes with pagination and filters
- [ ] Stash stats endpoint (totals, weight breakdown, status breakdown)
- [ ] Yarn catalog search endpoint (typeahead)
- [ ] Yarn catalog create endpoint (for manual additions)
- [ ] Yarn companies list endpoint
- [ ] Activity event creation (stash_added) on add
- [ ] iOS StashListView with grid/list toggle and filter chips
- [ ] iOS StashDetailView with status picker and project links
- [ ] iOS AddStashItemView with yarn search
- [ ] iOS YarnSearchView typeahead component
- [ ] iOS StashFilterSheet
- [ ] iOS StashStatsCard
- [ ] Web stash list page with filters
- [ ] Web add stash item page with yarn search
- [ ] Web StashCard component
- [ ] Web StashFilters component
- [ ] Web YarnSearch typeahead
- [ ] Web StashStats display
- [ ] Link to AI agent ("What can I make with this?") from stash detail

## Dependencies

- Auth (Clerk) - required for user identity
- Ravelry connection - provides initial stash import (existing, working)
- Projects - project_yarns links stash items to projects
- AI agent (009) - reads stash for pattern recommendations (future)
- Activity events (006) - stash_added events feed into social feed

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| View stash | Yes | Yes |
| Add/edit/delete stash items | Yes | Yes |
| Stash stats | Yes | Yes |
| Ravelry initial import | Yes | Yes |
| Ravelry re-sync | No | Yes |
| AI recommendations from stash | No | Yes |

Stash management is free. Ravelry re-sync (after initial import) and AI-powered recommendations require Pro.

## Technical Notes

- The yarn catalog (`yarns` table) is shared across all users. When a user adds a yarn that matches an existing catalog entry (by name + company or ravelry_id), link to the existing row rather than creating a duplicate.
- Ravelry sync already creates yarn catalog entries with `ravelry_id`. The typeahead search should search both the local catalog and optionally proxy to Ravelry's yarn search for yarns not yet in the catalog.
- The `skeins` field is a Float to support partial skeins (e.g., 2.5 skeins remaining after a project).
- When a project is completed, prompt the user to update stash quantities (mark skeins as used, reduce count). This can be manual or calculated from `project_yarns.skeins_used`.
- The `name_override` field in `project_yarns` handles Ravelry imports where the yarn text does not match any catalog entry. Display `name_override` as fallback when `yarn_id` is null.
- Weight categories for filtering: lace, fingering, sport, dk, worsted, aran, bulky, super_bulky. These map to the `yarns.weight` field.
- Stash photos: the yarn catalog has an `image_url` field. For Ravelry imports, this comes from the Ravelry API. For manual additions, users could upload a photo to Supabase Storage, but this is a lower priority enhancement.
- The "What can I make with this?" link from stash detail should open the AI agent with a pre-filled prompt including the yarn name, weight, and available yardage.
