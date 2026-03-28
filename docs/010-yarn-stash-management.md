# Yarn Stash Management

**Status:** Complete

## Problem Statement

Crafters accumulate yarn over time and lose track of what they own, how much they have, and what they can make with it. Without stash management, users buy duplicate yarn or start projects without enough yardage.

## Solution Overview

A personal yarn inventory where each stash item links to a yarn from a shared catalog (yarns + yarn_companies). Users add yarn via search (Ravelry's database), from the tool catalog, or manually. Stash items track status and link to projects. Ravelry import populates the stash on sync.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/stash` | Paginated stash list with filters (status, weight) | Complete |
| `POST /api/v1/stash` | Add stash item (from Ravelry yarn or manual) | Complete |
| `GET /api/v1/stash/[id]` | Stash item detail with yarn info and linked projects | Complete |
| `PATCH /api/v1/stash/[id]` | Update colorway, skeins, grams, notes, status | Complete |
| `DELETE /api/v1/stash/[id]` | Delete from stash. Pushes delete to Ravelry if `ravelry_id` exists. | Complete |
| `POST /api/v1/stash/[id]/identify-colorway` | AI colorway identification from photo | Complete |
| `POST /api/v1/stash/[id]/photo` | Upload stash item photo | Complete |
| `GET /api/v1/yarns/search` | Search Ravelry yarn database (proxied) | Complete |
| `GET /api/v1/yarns/[id]/colorways` | Fetch colorway suggestions for a yarn | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `StashView` | List/grid/large layout with sort, search, filter | Complete |
| `StashViewModel` | Load, sort, filter stash items | Complete |
| `StashTabView` | Tab container: Yarn, Needles & Hooks, Supplies, Swatches | Complete |
| `YarnSearchView` | Ravelry yarn search with curated browse sections (Most Popular, Top Rated), weight categories, brand list | Complete |
| `StashPickerSheet` | Two-tab picker (My Stash / Search) for adding yarn to projects. Search creates stash entry + links to project. | Complete |

### Curated Yarn Browse

The `YarnSearchView` browse state (before search) shows:
- **Most Popular** — horizontal card carousel from Ravelry search
- **Top Rated** — second carousel
- **Browse by weight** — grid of weight categories (Lace through Super Bulky)
- **Popular brands** — grid of well-known yarn brands

### StashPickerSheet (Two-Tab)

When adding yarn to a project, users see:
- **My stash** tab — search existing stash items, tap to link
- **Search** tab — search Ravelry's yarn database, select yarn, add colorway + skeins → creates stash entry AND links to project

## Ravelry Sync

- **Pull:** Full sync imports all stash items from Ravelry, creating yarn catalog entries
- **Push:** Only delete is supported (Ravelry stash API ignores most fields on create/update)
- Stash items have `ravelry_id` for deduplication

## Tier Gating

All stash features are free. No limits on stash items.
