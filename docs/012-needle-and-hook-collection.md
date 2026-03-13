# Needle and Hook Collection

**Status:** Partially complete

## Problem Statement

Knitters and crocheters accumulate needles and hooks across many sizes, types, and materials. Without a tracked inventory, users waste time searching for the right needle before starting a project, buy duplicates they already own, or skip patterns because they cannot remember whether they have the required needles.

## Solution Overview

A personal inventory of needles and hooks with size, type, length, material, and brand. Syncs from Ravelry on import. Provides filtering and sorting so users can quickly check if they own the right needle for a pattern. Feeds into the AI agent's recommendation engine to suggest patterns matching the user's available tools.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `GET /api/v1/needles` | List user's needles with optional filters (type, size_mm) | Not started |
| `POST /api/v1/needles` | Add a needle or hook to the collection | Not started |
| `PATCH /api/v1/needles/[id]` | Update needle details | Not started |
| `DELETE /api/v1/needles/[id]` | Remove needle from collection | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `NeedlesView.swift` | Grid or list of needles, grouped by type | Not started |
| `NeedlesViewModel.swift` | CRUD operations, filter/sort state | Not started |
| `NeedleRow.swift` | Row showing size, type, material, brand | Not started |
| `AddNeedleSheet.swift` | Form with type picker, size picker, optional fields | Not started |
| Needle size picker | Scroll wheel or segmented picker for common sizes | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/needles/page.tsx` | Needle collection page with filter sidebar | Not started |
| `NeedleCard` component | Card showing type icon, size, material, brand | Not started |
| Add/edit needle dialog | Form with type, size, length, material, brand | Not started |

### Database

| Table | Purpose |
|---|---|
| `user_needles` | Needle inventory: user_id, type, size_mm, size_label, length_cm, material, brand, notes, ravelry_id |

Types: `straight`, `circular`, `dpn`, `crochet_hook`. Unique on `[user_id, ravelry_id]`. Indexed on `[user_id]`.

## Implementation Checklist

- [x] Database schema (user_needles table with constraints and indexes)
- [x] Ravelry sync imports needle data (populates ravelry_id)
- [ ] API routes: CRUD for needles
- [ ] API route: filter by type and size range
- [ ] iOS NeedlesViewModel
- [ ] iOS NeedlesView (grouped by type, sortable by size)
- [ ] iOS NeedleRow component
- [ ] iOS AddNeedleSheet with size picker
- [ ] iOS edit and delete support
- [ ] Web needles page with type filter tabs
- [ ] Web NeedleCard component
- [ ] Web add/edit needle dialog
- [ ] "Patterns I can make" query (match user needles to pattern needle_size_mm)
- [ ] Integration with AI agent for needle-aware pattern recommendations

## Dependencies

- Authentication (001) for user identification
- Ravelry Sync (005) for importing existing needle collection
- Pattern Library (004) for cross-referencing pattern needle requirements
- AI Agent (009) for needle-aware recommendations (future)

## Tier Gating

Free for all users. No Pro gating on collection size or features.

## Technical Notes

- Needle sizes vary by region. Store `size_mm` as the canonical value and `size_label` as the human-friendly display (e.g., "US 7", "4.5mm", "G/6" for crochet). The iOS size picker should show both metric and US/UK labels.
- Circular needles need `length_cm` (cable length). Common lengths: 40, 60, 80, 100, 120 cm. Straight needles and DPNs do not use this field.
- Material options: bamboo, metal, wood, plastic, steel. Allow free-text brand field.
- The "patterns I can make" feature queries `patterns.needle_size_mm` and `saved_patterns.needle_sizes` against the user's `user_needles.size_mm` values. This can be a simple WHERE IN filter.
- Navigation placement: this could live as a section within Settings, or as a standalone screen accessible from the Profile tab. Decide based on how frequently users access it during testing.
