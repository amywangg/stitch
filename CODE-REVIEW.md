# Stitch Codebase Audit — 2026-03-15

Full health check across iOS, web API, shared libs, components, and database schema.

---

## Critical: Extract Shared Patterns

### iOS: Duplicated View Infrastructure (25+ files)

Every view reimplements the same error alert, loading state, and empty state. This is the single biggest source of duplication.

**Error alert** — identical in 25+ views:
```swift
.alert("Error", isPresented: .init(
    get: { viewModel.error != nil },
    set: { if !$0 { viewModel.error = nil } }
)) { Button("OK") { viewModel.error = nil } }
  message: { Text(viewModel.error ?? "") }
```

**Loading/empty/content switching** — identical in 15+ views:
```swift
if viewModel.isLoading && viewModel.items.isEmpty {
    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
} else if viewModel.items.isEmpty {
    ContentUnavailableView { ... }
} else {
    List(viewModel.items) { ... }
}
```

- [ ] Extract `ErrorAlertModifier` ViewModifier — applies `.alert` from any ViewModel with an `error` property
- [ ] Extract `LoadableContent<Item, Content, Empty>` generic view — handles loading/empty/content states
- [ ] Apply to all 25+ feature views

### iOS: Duplicated ViewModel Boilerplate (20+ files)

Every ViewModel repeats:
```swift
func load() async {
    isLoading = true
    defer { isLoading = false }
    do {
        let response: APIResponse<...> = try await APIClient.shared.get("...")
    } catch is CancellationError { return }
    catch { self.error = error.localizedDescription }
}
```

- [ ] Create `Loadable` protocol with default `load()` implementation
- [ ] Standardize CancellationError handling (currently missing in `StashViewModel`, `NeedlesViewModel`)

### iOS: Duplicated Optimistic Delete (4+ ViewModels)

`ProjectsViewModel`, `PatternsViewModel`, `StashViewModel`, `FeedViewModel` all have identical delete-with-revert logic.

- [ ] Extract generic `optimisticDelete(from:matching:endpoint:)` helper on a protocol extension

### Web API: No Route Wrapper (95+ routes)

Every route repeats auth + getDbUser + error handling:
```typescript
const { userId: clerkId } = await auth()
if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const user = await getDbUser(clerkId)
```

- [ ] Create `withAuth(handler)` wrapper that handles auth, returns `user` to handler, catches errors
- [ ] Create `withOwnership(model, id, handler)` for routes that need `findFirst({ where: { id, user_id } })`
- [ ] Migrate all 95+ routes to use wrappers

### Web API: No Input Validation (all POST/PATCH routes)

Zero Zod schemas on any route. Raw `await req.json()` everywhere with manual `allowed` field filtering.

- [ ] Add Zod schemas for every POST/PATCH route (start with patterns, projects, stash, social)
- [ ] Create shared schemas in `lib/schemas/` (e.g., `paginationSchema`, `slugSchema`)
- [ ] Replace manual `allowed` field filtering with Zod `.pick()` or `.partial()`

### Web API: Duplicated Pagination (25+ routes)

Same 15-line pagination block repeated in 25+ routes.

- [ ] Create `paginate(model, where, options)` helper that returns `{ items, total, page, pageSize, hasMore }`
- [ ] Apply to all paginated routes

---

## High: Large Files to Split

### iOS files over 600 lines

| File | Lines | Split into |
|------|-------|------------|
| `Features/Projects/ProjectsView.swift` | 1556 | `ProjectCard`, `ProjectGrid`, `ProjectFilters`, `ProjectStatusSection` |
| `Features/Profile/ProfileView.swift` | 1239 | `ProfileHeader`, `ProfileStats`, `ProfileProjectsGrid`, `ProfilePatternsGrid` |
| `Features/Projects/ProjectDetailView.swift` | 1132 | `ProjectInfoSection`, `ProjectYarnSection`, `ProjectProgressSection`, `ProjectNotesSection` |
| `Features/Patterns/PatternsView.swift` | 945 | `PatternCard`, `PatternGrid`, `PatternFilters` |
| `Features/Needles/NeedlesView.swift` | 917 | `NeedleRow`, `NeedleGroupHeader`, `NeedleFilters` |
| `Features/Patterns/PatternDiscoverView.swift` | 823 | `DiscoverFilters`, `DiscoverResults`, `DiscoverPatternCard` |
| `Features/Patterns/RavelryPatternDetailView.swift` | 798 | `RavelryPatternHeader`, `RavelryPatternInfo`, `RavelryPatternActions` |
| `Features/Counter/CounterView.swift` | 596 | `CounterInstructionLayout`, `CounterBasicLayout`, `SessionBar`, `CounterControls` |

- [ ] Split each file into extracted sub-components (one file per component)

### Web files over 600 lines

| File | Lines | Split into |
|------|-------|------------|
| `api/v1/integrations/ravelry/sync/route.ts` | 842 | `lib/ravelry-sync/projects.ts`, `lib/ravelry-sync/stash.ts`, `lib/ravelry-sync/queue.ts`, `lib/ravelry-sync/needles.ts` |
| `app/(marketing)/page.tsx` | 832 | `HeroSection`, `FeaturesGrid`, `PricingTable`, `DownloadSection` |
| `components/features/discover/PatternDiscovery.tsx` | 691 | `CraftSelection`, `YarnSelection`, `CategorySelection`, `DiscoverResults` |
| `lib/ravelry-client.ts` | 431 | Extract OAuth signing to `lib/ravelry-oauth.ts` |

- [ ] Split each file as described

---

## High: Duplicated iOS Components to Extract

### AsyncImage avatar pattern (10+ locations)

`PostCard`, `ActivityCard`, `NotificationsView`, `ProfileView`, and 6+ others all repeat:
```swift
AsyncImage(url: URL(string: urlString ?? "")) { image in
    image.resizable().scaledToFill()
} placeholder: { Color.gray.opacity(0.3) }
.frame(width: 36, height: 36)
.clipShape(Circle())
```

- [ ] Create `AvatarImage(url:size:)` component in `Components/`

### AsyncImage general pattern (10+ locations)

Same for rectangular images with rounded corners.

- [ ] Create `RemoteImage(url:cornerRadius:aspectRatio:)` component in `Components/`

### Tab/segment picker (3+ locations)

`PatternsView`, `FeedView`, and others implement identical segment-style tab pickers.

- [ ] Create `SegmentTabPicker<T: Hashable>` component

### Filter chip UI (3+ locations)

`GlossaryView`, `TutorialListView`, pattern filters all use identical chip styling.

- [ ] Create `FilterChipRow<T: Hashable>` component

### Layout/Sort enums (duplicated pair)

`ProjectsViewModel` and `PatternsViewModel` define identical `Layout` and `Sort` enums.

- [ ] Create shared `GridLayout` enum and `SortOption` protocol

### Ravelry sync message (2 ViewModels)

`StashViewModel.syncRavelry()` and `NeedlesViewModel.syncRavelry()` are identical except the endpoint.

- [ ] Extract `RavelrySyncHelper.sync(endpoint:entityName:)` → returns message string

---

## High: Database Schema Issues

### Missing foreign key indexes (4 fields)

Queries on these columns will table-scan:

- [ ] `yarns.company_id` — add `@@index([company_id])`
- [ ] `project_yarns.yarn_id` — add `@@index([yarn_id])`
- [ ] `project_yarns.stash_item_id` — add `@@index([stash_item_id])`
- [ ] `likes.user_id` — add `@@index([user_id])`
- [ ] `comments.user_id` — add `@@index([user_id])`

### Missing `updated_at` on mutable models (3 models)

- [ ] `user_needles` — add `updated_at DateTime @updatedAt`
- [ ] `notifications` — add `updated_at DateTime @updatedAt`
- [ ] `pdf_uploads` — add `updated_at DateTime @updatedAt`

### Missing `deleted_at` on user content (1 model)

- [ ] `pattern_queue` — add `deleted_at DateTime?` for soft delete consistency

### Missing indexes on join paths (2 models)

- [ ] `post_bookmarks` — add `@@index([post_id])` and `@@index([user_id])`
- [ ] `glossary_synonyms` — add `@@index([term_id])`

---

## Medium: Web Shared Code Issues

### Duplicated size recommendation logic

Two separate implementations with different algorithms:
- `lib/size-math.ts` — `scoreSizes()` with measurement deltas
- `lib/size-recommendation.ts` — `recommendSizes()` with weighted pairs

- [ ] Consolidate into one implementation, deprecate the other

### Duplicated rounding functions

`round1()` in `size-math.ts`, `round2()` in `time-math.ts`, inline `Math.round(x * 10) / 10` in 6+ files.

- [ ] Add `round(n: number, decimals: number)` to `utils.ts`, replace all instances

### Dead exports

- [ ] Remove `formatDate()` from `lib/utils.ts` (never imported)
- [ ] Remove `getTotalSteps()` from `lib/instruction-resolver.ts` (trivial, never imported)

### Card styling duplication

`rounded-xl bg-surface border border-border-default` repeated 10+ times across React components.

- [ ] Create `<Card>` component in `components/ui/`

### Type safety: Ravelry client

`ravelry-client.ts` returns `Record<string, unknown>` from API calls, forcing `as` casts in callers.

- [ ] Add typed interfaces for Ravelry API responses
- [ ] Replace `Record<string, unknown>` returns with typed responses

---

## Medium: Web API Consistency

### Duplicated slug generation (3 routes)

`patterns/route.ts`, `projects/route.ts`, `pdf/parse/route.ts` repeat slug uniqueness loop. Ravelry sync already extracted it.

- [ ] Extract `generateUniqueSlug(model, userId, title)` to `lib/utils.ts`

### Duplicated Ravelry write-back (6 routes)

Same try-catch push-to-Ravelry pattern in 6 routes.

- [ ] Extract `pushToRavelry(userId, operation, fallbackMessage?)` helper

### Inconsistent response formats

Some routes return `{ error }`, others `{ error, message }`, others `{ error, code, message }`.

- [ ] Standardize all error responses to `{ error: string, code?: string }` format
- [ ] Use error helpers from `lib/errors.ts` consistently

### Inconsistent ownership checks

Some routes check ownership via WHERE clause (returns 404), others check inline (returns 403).

- [ ] Standardize: ownership in WHERE clause → 404 (don't leak existence)

### Missing transactions on multi-step operations

Routes that write to DB + push to Ravelry have no transaction protection. DB commits even if Ravelry fails.

- [ ] Wrap multi-step writes in `prisma.$transaction()` where atomicity matters

### Missing rate limiting

No rate limiting on AI routes, social posting, file uploads, or Ravelry sync.

- [ ] Add rate limiting middleware (at minimum on AI and social routes)

---

## Low: Config & Misc

### TypeScript target mismatch

- `packages/db/tsconfig.json`: target ES2022
- `apps/web/tsconfig.json`: target ES2017

- [ ] Align to same target (ES2022 is fine for this stack)

### Unused supabase seed reference

`supabase/config.toml` references `./seed.sql` which doesn't exist (seeds are in TypeScript).

- [ ] Remove `sql_paths` from config or create a stub `seed.sql`

### iOS: inconsistent loading approach

Some views use `.task {}`, others use `.onAppear { Task {} }`. Both work but `.task` is preferred (auto-cancels).

- [ ] Standardize all data loading to `.task {}`

---

## Summary

| Category | Issues | Severity |
|----------|--------|----------|
| Duplicated iOS view infrastructure | 25+ files | Critical |
| Missing API route wrapper / validation | 95+ routes | Critical |
| Duplicated pagination | 25+ routes | Critical |
| Large files needing split | 12 files | High |
| Duplicated iOS components | 6 patterns | High |
| Database schema gaps | 11 fields/indexes | High |
| Web shared code duplication | 5 issues | Medium |
| API consistency issues | 6 patterns | Medium |
| Config/misc | 3 issues | Low |

### Recommended order of work

1. **iOS `ErrorAlertModifier` + `LoadableContent`** — eliminates duplication in 25+ files, biggest bang for buck
2. **Web `withAuth()` route wrapper** — eliminates boilerplate in 95+ routes
3. **Zod validation on all POST/PATCH** — security fix, should happen soon
4. **Database indexes** — `db:push` and done, prevents future perf issues
5. **Split large files** — tackle the 1500-line `ProjectsView.swift` first
6. **Extract iOS components** (`AvatarImage`, `RemoteImage`, `SegmentTabPicker`)
7. **Web pagination helper + slug helper** — quick wins
8. **Consolidate size recommendation** — pick one algorithm
9. **Everything else** — card component, type safety, rate limiting, config alignment
