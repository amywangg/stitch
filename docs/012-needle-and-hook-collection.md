# Needle and Hook Collection

**Status:** Complete

## Problem Statement

Knitters and crocheters accumulate needles and hooks over time. They need to track what they own to avoid buying duplicates and to quickly find the right needle for a project.

## Solution Overview

A personal needle/hook inventory organized by sets (from the tool catalog) and individual items. Users add needles via the catalog (pre-built sets from brands like ChiaoGoo, Knit Picks), AI lookup, manual entry, or the product line browser. Needles are Stitch-only — not synced from Ravelry (the Ravelry needles endpoint is unreliable).

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/needles` | List user's needles with set info | Complete |
| `POST /api/v1/needles` | Add individual needle (type, size, material, brand) | Complete |
| `DELETE /api/v1/needles/[id]` | Remove needle | Complete |
| `GET /api/v1/needles/sets/[setId]` | Get set with all items | Complete |
| `DELETE /api/v1/needles/sets/[setId]` | Remove entire set | Complete |
| `GET /api/v1/tool-catalog` | List brands with set counts | Complete |
| `GET /api/v1/tool-catalog/sets` | List sets, filterable by brand/type/search | Complete |
| `POST /api/v1/tool-catalog/add-set` | Add all items from a catalog set to user's collection | Complete |
| `POST /api/v1/tool-catalog/lookup` | AI-powered set lookup by brand + name | Complete |
| `GET /api/v1/tool-catalog/product-lines` | Browse individual needle product lines by brand/type | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `NeedlesView` | List/grid layout grouped by sets and type, with context menus | Complete |
| `NeedlesViewModel` | Load, group, delete needles | Complete |
| `NeedlePickerSheet` | Two-tab picker (My Collection / Search) for adding needles to projects | Complete |
| `AddFromCatalogView` | Browse catalog brands → sets → add to collection | Complete |
| `AIToolLookupSheet` | AI-powered set finder (enter brand + set name) | Complete |

### NeedlePickerSheet (Two-Tab)

When adding a needle to a project:
- **My collection** tab — browse existing needles, tap to link. Manual entry option with type/size/material pickers.
- **Search** tab — search tool catalog product lines with type filter chips (All/Circular/Straight/DPN/Hooks). Tapping a product line opens size picker sheet with cable length for circulars. Adds to collection AND links to project.

### Common Sizes

Available in manual entry pickers:
`2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 3.8, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0 mm`

## Ravelry Sync

**Not synced.** The Ravelry needles API is unreliable (returns 302 on write attempts). Needles are Stitch-only data. The "Sync from Ravelry" button was removed from the UI.

## Tier Gating

All needle features are free. No limits on collection size.
