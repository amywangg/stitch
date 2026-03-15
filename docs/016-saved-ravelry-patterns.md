# Saved Ravelry Patterns

**Status:** Partially complete

## Problem Statement

Ravelry hosts the largest database of knitting and crochet patterns, but its interface is dated and not optimized for mobile. Users want to browse, save, and reference Ravelry patterns from within Stitch without switching apps. The AI agent needs a curated dataset of patterns the user cares about to make personalized recommendations.

## Solution Overview

Lightweight snapshots of Ravelry patterns that users explicitly save or bookmark. This is not a full catalog mirror. When a user searches Ravelry from within Stitch, they can save individual patterns. Each saved entry stores key metadata (name, craft, weight, yardage, gauge, needle sizes, difficulty, photo, designer, free/paid status) for quick reference and AI agent consumption. The AI agent queries this table to recommend patterns based on the user's stash, needles, and preferences.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `GET /api/v1/ravelry/search` | Proxy to Ravelry pattern search API (requires OAuth) | Not started |
| `GET /api/v1/ravelry/patterns/[ravelryId]` | Fetch full pattern details from Ravelry | Not started |
| `GET /api/v1/saved-patterns` | List user's saved patterns with optional filters (weight, craft) | Not started |
| `POST /api/v1/saved-patterns` | Save a Ravelry pattern snapshot | Not started |
| `DELETE /api/v1/saved-patterns/[id]` | Remove a saved pattern | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `SavedPatternsView.swift` | Grid of saved patterns with cover photos | Not started |
| `SavedPatternsViewModel.swift` | Load, filter, delete saved patterns | Not started |
| `RavelrySearchView.swift` | Search Ravelry patterns with filters (craft, weight, free/paid) | Not started |
| `RavelrySearchViewModel.swift` | Search API calls, pagination, save action | Not started |
| `RavelryPatternDetailView.swift` | Pattern detail with save/unsave button | Not started |
| `SavedPatternCard.swift` | Grid card with photo, name, designer, difficulty | Not started |
| Filter bar | Filter by weight, craft, free/paid | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/ravelry/search/page.tsx` | Ravelry search page with filters and pagination | Not started |
| `(app)/ravelry/saved/page.tsx` | Saved patterns grid | Not started |
| `RavelryPatternCard` component | Card with photo, metadata, save button | Not started |
| Filter sidebar | Weight, craft, difficulty, free/paid filters | Not started |

### Database

| Table | Purpose |
|---|---|
| `saved_patterns` | Snapshots: user_id, ravelry_id (Int), name, permalink, craft, weight, yardage_min/max, gauge, needle_sizes (String[]), difficulty (Float), photo_url, designer, free (Boolean) |

Unique on `[user_id, ravelry_id]`. Indexed on `[user_id]` and `[user_id, weight]`.

## Implementation Checklist

- [x] Database schema (saved_patterns table with constraints and indexes)
- [ ] Ravelry search proxy API route (authenticated, uses user's OAuth tokens)
- [ ] Ravelry pattern detail proxy route
- [ ] API route: list saved patterns with filters
- [ ] API route: save pattern (extract and store metadata snapshot)
- [ ] API route: delete saved pattern
- [ ] Free tier limit check (15 saved patterns for free users)
- [ ] iOS SavedPatternsViewModel
- [ ] iOS SavedPatternsView (grid layout with cover photos)
- [ ] iOS SavedPatternCard component
- [ ] iOS RavelrySearchViewModel (search, paginate, save)
- [ ] iOS RavelrySearchView with filter controls
- [ ] iOS RavelryPatternDetailView with save/unsave toggle
- [ ] iOS filter bar (weight, craft, free/paid)
- [ ] Web Ravelry search page
- [ ] Web saved patterns page
- [ ] Web RavelryPatternCard component
- [ ] Web filter sidebar
- [ ] Activity event: emit "pattern_saved" when saving a Ravelry pattern

## Dependencies

- Ravelry Sync (005) for OAuth tokens needed to call the Ravelry API
- Authentication (001) for user identification and token resolution
- Subscriptions (002) for Pro tier limit enforcement (10 free, unlimited Pro)
- AI Agent (009) reads saved_patterns for personalized recommendations

## Tier Gating

| Feature | Free | Plus | Pro |
|---|---|---|---|
| Save Ravelry patterns | 15 max | Unlimited | Unlimited |
| Search Ravelry | Yes | Yes | Yes |
| View saved pattern details | Yes | Yes | Yes |

The save endpoint must check `FREE_LIMITS` (free tier) before allowing new saves. Plus and Pro have unlimited saves.

## Technical Notes

- The Ravelry search proxy uses the user's encrypted OAuth tokens from `ravelry_connections`. Decrypt with `lib/encrypt.ts` before making API calls. Never expose Ravelry credentials to the client.
- Photo URLs from Ravelry are relative paths. Store as-is in `photo_url` and prepend `https://images4.ravelry.com` at render time on both iOS and web.
- The `needle_sizes` field is a String array (e.g., `["US 7", "4.5mm"]`). This comes from Ravelry's pattern data and is stored verbatim for display and AI matching.
- Difficulty is a Float from 1 to 10, matching Ravelry's community difficulty rating. Display as a bar or fraction (e.g., "4.2 / 10").
- The search proxy should support Ravelry's search parameters: query text, craft (knitting/crochet), weight, yardage range, difficulty range, free/paid, availability. Pass these through as query parameters.
- Pagination: Ravelry returns paginated results. The proxy should forward page and page_size parameters and return total count for client-side pagination controls.
- The AI agent uses this table as its primary pattern dataset. When recommending patterns, it queries saved_patterns filtered by the user's yarn weights in stash, needle sizes in collection, and craft preference. Keep the schema stable for agent consumption.
- Do not store Ravelry search results automatically. Only save patterns the user explicitly chooses to keep. This keeps the table small, relevant, and legally compliant with Ravelry's API terms.
