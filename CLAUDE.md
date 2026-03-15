# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Stitch is a knitting app (Ravelry competitor) with row counter, pattern library, social features, and AI-powered PDF pattern parsing.

**Primary frontend**: SwiftUI iOS app (`apps/ios/`) — main user-facing product.
**Secondary frontend**: Next.js 14 App Router (`apps/web/`) — web frontend + REST API.

```
stitch/
├── apps/
│   ├── web/       # Next.js 14 — web UI + API routes (Vercel)
│   └── ios/       # SwiftUI iOS app (Xcode, iOS 17+)
├── packages/
│   └── db/        # Prisma schema + generated client (shared)
├── supabase/      # Local Supabase config
└── CLAUDE.md
```

**Monorepo**: Turborepo + pnpm workspaces
**Port**: Web `3000` (single service — no separate AI server)

---

## Stack

| Layer | Choice |
|---|---|
| Web + API | Next.js 14 App Router |
| iOS | SwiftUI (iOS 17+) |
| Database | Supabase (hosted PostgreSQL + RLS) |
| ORM | Prisma (`packages/db/`) |
| Auth | Clerk |
| Subscriptions | RevenueCat (Apple IAP + Stripe web) |
| File storage | Supabase Storage |
| Realtime | Supabase Realtime (counter sync) |
| AI/PDF parsing | Next.js API routes (`openai` + `pdf-parse`) |
| Deployment | Vercel (web) + Xcode/TestFlight (iOS) |

---

## Architecture Rules

1. **All AI/external API calls go through Next.js API routes** — never directly from Swift
2. **Every Supabase table has RLS enabled** — include RLS policy with every new table
3. **Clerk JWT is verified on every authenticated API route** using `await auth()` + `getDbUser(clerkId)`
4. **RevenueCat entitlements checked client-side**, validated server-side via webhook
5. **Swift views are presentational** — business logic lives in ViewModels (MVVM strict)
6. **Never use `service_role` key client-side** — only in server-side API routes
7. **Never expose API keys to the iOS client** — all secrets live in `.env.local` and Next.js routes
8. **No third-party cloud storage integrations** (Google Drive, Dropbox, iCloud, etc.) — all file storage uses Supabase Storage. External integrations are limited to Ravelry only.

---

## UI/UX Design System

Load `/ui-ux` before building any UI. Full spec at `.claude/skills/ui-ux/SKILL.md`.

Key rules: Letterboxd/Goodreads editorial style, content-forward layouts, warm not clinical. Coral (`#FF6B6B`) primary, Teal (`#4ECDC4`) secondary, semantic color tokens for light/dark. System fonts only, `rounded-2xl` cards, portrait 2:3 pattern covers, progress bars on project cards. Sentence case for all UI text, verb-first buttons, no exclamation marks in copy. Skeleton loading states, optimistic updates, 44px min tap targets. See the skill file for component specs, screen layouts, interaction patterns, and anti-patterns.

---

## Instant UI Feedback (CRITICAL)

**Every mutation must be immediately reflected in the UI. No stale data. No requiring the user to navigate away and back to see changes.**

### Rules

1. **Optimistic updates first**: When a user performs an action (add comment, change status, toggle, delete, etc.), update the local ViewModel state immediately before or alongside the API call. Do not wait for the API response to update the UI.
2. **Reload after mutation**: After any successful POST/PATCH/DELETE, the ViewModel must refresh the relevant data. If the view shows a list, reload the list. If it shows a detail, reload the detail. Never assume the user will navigate away.
3. **Loading indicators for slow operations**: If an action takes >200ms (file uploads, AI calls, sync operations), show a loading spinner or progress indicator. The user must always know something is happening.
4. **No fire-and-forget API calls**: Every API call must have its result handled — either update local state on success, or show an error on failure. `Task { await apiCall() }` without updating state afterward is a bug.
5. **Parent-child refresh**: When a child view modifies data (e.g., editing a project in a sheet), the parent view must refresh when the child dismisses. Use `onChange(of: isPresented)`, completion callbacks, or shared state to trigger reloads.
6. **Callbacks on dismiss**: Any sheet or navigation that allows editing must notify the presenting view when data changes, via an `onDismiss` reload or a shared `@Observable` ViewModel.

### iOS Implementation Pattern

```swift
// GOOD: Optimistic update + API call
func markActive() async {
    project?.status = "active"  // Update UI immediately
    do {
        let _: APIResponse<Project> = try await APIClient.shared.patch(
            "/projects/\(projectId)", body: ["status": "active"]
        )
        await load()  // Refresh with server state
    } catch {
        project?.status = previousStatus  // Revert on failure
        self.error = error.localizedDescription
    }
}

// BAD: Fire-and-forget, UI doesn't update
func markActive() async {
    try? await APIClient.shared.patch("/projects/\(projectId)", body: ["status": "active"])
    // User sees stale "Completed" status until they navigate away and back
}
```

### Common Violations to Avoid

- Changing project status without updating the local `project` object
- Adding/deleting a comment without updating the comments array
- Toggling a setting without reflecting the new value
- Uploading a photo without showing it when the upload completes
- Editing in a sheet without reloading the parent view on dismiss

---

## AI Tooling Guide

Load `/ai-tooling` before building any AI-powered feature. Full spec at `.claude/skills/ai-tooling/SKILL.md`.

Key rules: AI features are tools, not chatbots. No chat interfaces, no freeform prompts, no conversational UI. Users interact through structured controls (dropdowns, pickers, toggles, buttons). Context is pulled automatically from user data (stash, gauge, measurements, projects). LLM responses are parsed into typed JSON on the server and rendered with purpose-built components -- never raw text. All AI routes are Pro-gated, use `response_format: { type: 'json_object' }`, and validate output with a schema before returning. Prompts live in `apps/web/lib/prompts/`. No streaming, no disclaimers, no "regenerate" without parameter changes.

---

## API Design Standards

Load `/api-design` before building any API route. Full spec at `.claude/skills/api-design/SKILL.md`.

Key rules: All input validated with Zod schemas (in `apps/web/lib/schemas/`). Standardized error responses with machine-readable codes (`UNAUTHORIZED`, `VALIDATION_ERROR`, `NOT_FOUND`, `PRO_REQUIRED`, `FREE_LIMIT_REACHED`). Pagination via `parsePagination()` helper (offset-based, 20 default, 50 max; cursor-based for feeds). Auth is always `auth()` + `getDbUser()` + ownership check in the same WHERE clause. Error helpers in `apps/web/lib/errors.ts`. Ravelry push after primary DB write, never before. Rate limiting on AI and social routes.

---

## Data Modeling Standards

Load `/data-modeling` before adding or modifying any database model. Full spec at `.claude/skills/data-modeling/SKILL.md`.

Key rules: Models are lowercase plural snake_case. All IDs are UUID (`@default(uuid())`). Every model gets `created_at`; mutable models get `updated_at @updatedAt`. Soft deletes (`deleted_at`) on user content (projects, patterns, posts, comments) only. Index every FK in WHERE clauses. Composite indexes for common query patterns (user_id + created_at for feeds). String enums with comment docs, not Prisma enum blocks. Ravelry sync fields are optional (`String?`) with `@@unique([user_id, ravelry_id])`. After changes: `prisma validate` then `db:push` then `db:generate`.

---

## Testing Standards

Load `/testing` before writing any tests. Full spec at `.claude/skills/testing/SKILL.md`.

Key rules: Vitest for web, XCTest for iOS. Test against real Postgres, never mock Prisma. Mock only Clerk auth and external APIs (OpenAI, Ravelry). Co-locate test files with source (`route.test.ts` next to `route.ts`). Factory functions for fixtures (`makeProject()`, `makeUser()`). Every route needs happy-path + auth + validation tests at minimum. Test behavior (HTTP responses, DB state), not implementation (which Prisma method was called). iOS tests focus on ViewModel state transitions with a `MockAPIClient`.

---

## Commands

```bash
# From repo root
pnpm dev            # Start all apps (turbo)
pnpm build          # Build all workspaces
pnpm lint           # Lint all workspaces

# Database (from packages/db/ or root)
pnpm db:generate    # Regenerate Prisma client after schema changes
pnpm db:migrate     # Apply migrations (production)
pnpm db:push        # Push schema directly (dev/prototyping)
pnpm db:studio      # Open Prisma Studio

# iOS
cd apps/ios && xcodegen generate   # Regenerate .xcodeproj from project.yml
open apps/ios/Stitch.xcodeproj     # Open in Xcode
```

---

## Environment Setup

**Single `.env.local` at repo root** — `apps/web/.env.local` and `packages/db/.env` are symlinks to it.

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=...

# Ravelry
RAVELRY_CLIENT_KEY=...
RAVELRY_CLIENT_SECRET=...
RAVELRY_CALLBACK_URL=http://localhost:3000/api/v1/integrations/ravelry/callback

# Security (AES-256 key — 64 hex chars)
ENCRYPTION_KEY=...

# AI / PDF parsing
OPENAI_API_KEY=sk-...
```

iOS config: `apps/ios/Stitch/Config/Environment.swift` (API URLs, Clerk publishable key, RevenueCat key, Supabase keys — all with `#if DEBUG` switches).

---

## Code Generation Guidelines

- Always generate complete files, not snippets
- Include error handling — no force unwraps, no empty catch blocks
- Add `// MARK:` sections for organization in Swift files
- If touching Supabase schema, include the migration SQL + RLS policy
- If adding an API route, include the Swift `APIClient` method to call it

---

## Feature Implementation Recipes

### Recipe: Add a New API Route (Next.js)

1. Create `apps/web/app/api/v1/your-domain/route.ts`
2. Pattern:

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)
  // business logic
  return NextResponse.json({ success: true, data: ... })
}
```

3. Always use `getDbUser(clerkId)` to resolve the DB user.
4. Use Zod for input validation on POST/PATCH routes.
5. For Pro-gated features: `const err = requirePro(user, 'feature name'); if (err) return err`
6. Also add the corresponding `APIClient` method in Swift.

### Recipe: Add a New iOS Screen

1. **ViewModel**: `apps/ios/Stitch/Features/YourFeature/YourViewModel.swift` — `@Observable` class
2. **View**: `apps/ios/Stitch/Features/YourFeature/YourView.swift` — SwiftUI `View`
3. **API call**: `APIClient.shared.get/post/patch/delete()` — attaches Clerk JWT automatically
4. **Navigation**: Add `Route` case to `AppRouter.swift`, add `.navigationDestination` in parent view

### Recipe: Add a New DB Model

1. Edit `packages/db/prisma/schema.prisma`
2. Run `pnpm db:push` (dev) or `pnpm db:migrate` (production)
3. Run `pnpm db:generate` to regenerate the client
4. Write RLS policy in the same commit

### Recipe: Full-Stack Feature (End to End)

1. DB schema change → `pnpm db:generate`
2. API route(s) in `apps/web/app/api/v1/`
3. **iOS first**: ViewModel + View + APIClient call + navigation wiring
4. **Web second**: Page component in `apps/web/app/(app)/your-page/`
5. Realtime (if needed): Supabase Realtime channel in `useCounterRealtime` / `RealtimeManager`

---

## Web Conventions (`apps/web/`)

### File Structure

```
apps/web/
├── app/
│   ├── layout.tsx              # Root: ClerkProvider
│   ├── (marketing)/            # Public pages
│   ├── (auth)/                 # Clerk sign-in/sign-up
│   ├── (app)/                  # Protected app pages (require auth)
│   └── api/
│       ├── webhooks/clerk/     # User sync from Clerk
│       ├── webhooks/revenuecat/ # Subscription sync
│       └── v1/                 # REST API routes
├── components/
│   ├── ui/                     # Design system primitives (CVA + cn)
│   ├── layout/                 # AppLayout, BottomNav
│   └── features/               # Feature-specific components
├── hooks/                      # use-counter-realtime, use-pro-gate
├── lib/
│   ├── prisma.ts               # Re-exports prisma from @stitch/db
│   ├── supabase.ts             # createSupabaseBrowserClient/ServerClient
│   ├── auth.ts                 # getDbUser(clerkId)
│   ├── pro-gate.ts             # requirePro(), FREE_LIMITS
│   ├── encrypt.ts              # AES-256 for Ravelry tokens
│   ├── api.ts                  # Client-side fetch wrapper (Clerk token)
│   └── utils.ts                # cn(), slugify(), formatDate()
├── stores/                     # Zustand: counter-store, theme-store
├── types/index.ts              # Frontend types
└── middleware.ts               # Clerk auth protection
```

### Code Style

- App Router only — no Pages Router patterns
- Always use `@/` imports — never relative `../../` paths. No `.js` extensions needed.
- Zod for all input validation on API routes
- Return errors, don't throw — use `return NextResponse.json(...)` in route handlers

### Response Format

```typescript
// Success
return NextResponse.json({ success: true, data: thing })

// Paginated
return NextResponse.json({ success: true, data: { items, total, page, pageSize, hasMore } })

// Error
return NextResponse.json({ error: 'Not found' }, { status: 404 })
```

### Authorization Pattern

```typescript
const thing = await prisma.things.findFirst({ where: { id, user_id: user.id } })
if (!thing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
```

### Styling

Tailwind + semantic tokens. Dark mode via `dark:` prefix (`darkMode: 'class'`).
Icons: `lucide-react`. Animations: `framer-motion`. CSS merging: `cn()` from `@/lib/utils`.

| Token | Usage |
|-------|-------|
| `bg-background` | Page background |
| `bg-surface` | Card/elevated surfaces |
| `text-content-default` | Primary text |
| `text-content-secondary` | Secondary/muted text |
| `border-border-default` | Default borders |
| `bg-coral-500` | Primary brand color |
| `bg-teal-500` | Secondary brand color |

### Client-Side API Calls

```typescript
import { api } from '@/lib/api'
const response = await api.get<ApiResponse<Thing>>('/things')
const response = await api.post<ApiResponse<Thing>>('/things', { title: 'New' })
```

### Zustand Store Pattern

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useMyStore = create<MyState>()(
  persist((set) => ({ items: [], setItems: (items) => set({ items }) }), { name: 'stitch-my-store' })
)
```

---

## iOS Conventions (`apps/ios/`)

### File Structure

```
apps/ios/Stitch/
├── StitchApp.swift          # @main; configures Clerk + RevenueCat
├── App/
│   ├── AppRouter.swift      # NavigationPath root
│   └── MainTabView.swift    # Tab bar
├── Config/
│   └── Environment.swift    # API base URLs, SDK keys (dev/prod)
├── Core/
│   ├── Network/APIClient.swift                    # URLSession + Clerk JWT
│   ├── Auth/ClerkManager.swift                    # Clerk iOS SDK (real)
│   ├── Auth/KeychainManager.swift                 # JWT in Keychain only
│   ├── Subscriptions/SubscriptionManager.swift    # RevenueCat (real)
│   └── Realtime/RealtimeManager.swift             # Supabase Realtime (stub)
├── Features/                # One folder per domain
├── Components/              # StitchButton, StitchCard, ProGateBanner
├── Models/Models.swift      # Codable structs
└── Extensions/Color+Hex.swift
```

### Code Style

- MVVM architecture, `@Observable` macro (iOS 17+)
- All network calls in `APIClient` — never call URLSession directly in ViewModels
- Use `async/await` everywhere, no Combine unless legacy
- Error types are enums conforming to `LocalizedError`
- No force unwraps, no empty catch blocks

### Feature Structure

```
/Features/FeatureName/
  FeatureView.swift         # UI only
  FeatureViewModel.swift    # State + business logic
```

### MVVM Pattern

```swift
@Observable
final class ThingViewModel {
    var things: [Thing] = []
    var isLoading = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<Thing>> = try await APIClient.shared.get("/things")
            things = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct ThingView: View {
    @State private var viewModel = ThingViewModel()
    var body: some View {
        List(viewModel.things) { thing in ThingRow(thing: thing) }
            .task { await viewModel.load() }
    }
}
```

### API Client

`APIClient.shared` automatically attaches `Authorization: Bearer <clerk_token>`:
```swift
let response: APIResponse<Project> = try await APIClient.shared.get("/projects/\(id)")
let response: APIResponse<Project> = try await APIClient.shared.post("/projects", body: body)
let response: APIResponse<Project> = try await APIClient.shared.patch("/projects/\(id)", body: body)
```

### Subscriptions (RevenueCat)

`SubscriptionManager.shared` wraps RevenueCat SDK:
- Configured in `StitchApp.init()`, logged in via `.task(id: clerk.user?.id)` in RootView
- `isPro` stays in sync via `Purchases.shared.customerInfoStream`
- Entitlement ID: `"Stitch Pro"` — products: monthly, yearly, lifetime
- Paywall: `PaywallView()` from RevenueCatUI (configured in RevenueCat dashboard)
- Customer Center: `CustomerCenterView()` for manage/cancel/restore

### UI/UX Standards

- Follow Apple HIG for navigation and gestures
- Loading states: prefer skeleton screens over spinners
- Error states: always recoverable — never dead ends
- Haptic feedback on primary actions
- AI responses: stream with typewriter effect, show stop button

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| Coral | `#FF6B6B` | Primary actions, CTAs |
| Teal | `#4ECDC4` | Secondary / accent |

Use `Color(hex: "#FF6B6B")` from `Extensions/Color+Hex.swift`.

### SDK Status

| Manager | SDK | Status |
|---------|-----|--------|
| `ClerkManager.swift` | `clerk-ios` | Real |
| `SubscriptionManager.swift` | `purchases-ios` (RevenueCat) | Real |
| `RealtimeManager.swift` | `supabase-swift` | Stub — needs implementation |

### XcodeGen

`.xcodeproj` is generated from `apps/ios/project.yml`. After changing dependencies or build settings:
```bash
cd apps/ios && xcodegen generate
```

---

## Database (`packages/db/`)

**Schema**: `packages/db/prisma/schema.prisma`

**Key models**: `users`, `subscriptions`, `ravelry_connections`, `projects`, `project_sections`, `row_counter_history`, `project_gauge`, `patterns`, `pattern_sections`, `pattern_rows`, `posts`, `comments`, `likes`, `follows`, `notifications`

**Always import prisma from**:
```typescript
import { prisma } from '@/lib/prisma'    // in web app
import { prisma } from '@stitch/db'      // in packages
```

**Soft deletes**: `projects` and `patterns` use `deleted_at`. Always filter `deleted_at: null`.

**Supabase**: Always use typed client. RLS policies written alongside every new table.

---

## Tier Definitions

| Feature | Free | Plus ($1.99/mo) | Pro ($4.99/mo) |
|---|---|---|---|
| Row counter | ✓ | ✓ | ✓ |
| Stash / needles | Unlimited | Unlimited | Unlimited |
| Social posting | ✓ | ✓ | ✓ |
| Active projects | 3 | Unlimited | Unlimited |
| Saved patterns | 15 | Unlimited | Unlimited |
| PDF parsing (AI) | 2/month | 5/month | Unlimited |
| Cross-device realtime | — | ✓ | ✓ |
| AI tools (other 8 routes) | — | — | ✓ |
| Row instruction explainer | ✓ (GPT-4o-mini) | ✓ | ✓ |
| Ravelry auto re-sync | — | — | ✓ |

### Tier Implementation

- **Config**: All tier limits are centralized in `apps/web/lib/pro-gate.ts` → `TIER_LIMITS`. Changing a limit there updates all gates.
- **Server**: `getUserTier(user)` derives tier from `subscription.plan`. Use `requirePlus()`, `requirePro()`, or `requireCapacity()` to gate routes.
- **iOS**: `SubscriptionManager.shared.tier` (`.free` / `.plus` / `.pro`) synced from RevenueCat entitlements. Use `.isPlusOrAbove` for Plus+ features, `.isPro` for Pro-only.
- **Webhook**: `POST /api/webhooks/revenuecat` maps product IDs to tiers. Product ID mapping in `PRODUCT_TIER_MAP`.
- **DB**: `subscriptions.plan` stores `"free" | "plus" | "pro"`. `users.is_pro` is a legacy boolean kept in sync for backward compatibility.

### Feature Tier Annotation Rule (CRITICAL)

**Every new feature documented in `docs/` or implemented in code MUST specify its tier gate (free/plus/pro).** When implementing a gated feature:
1. Add the tier to the feature's doc entry or code comment
2. Apply the correct server-side gate (`requirePlus`, `requirePro`, or `requireCapacity`)
3. Apply the correct client-side gate (check `SubscriptionManager.shared.tier` in iOS)
4. Show an upgrade prompt when a free/plus user hits the gate — never silently fail or hide the feature entirely

---

## Auth Flow

1. **Web**: Clerk `<SignIn />` → session cookie → `await auth()` in API routes
2. **iOS**: Clerk iOS SDK → custom SignInView/SignUpView → `ClerkManager.shared.sessionToken()` → `Authorization: Bearer`
3. **Webhook** `user.created` → create `users` row + `subscriptions` row (free tier) — fallback: `getDbUser()` upserts on first API call
4. Tokens stored in **iOS Keychain** only — never UserDefaults

## Subscription Flow

1. **iOS**: RevenueCat SDK → `PaywallView()` → StoreKit 2
2. **Web**: RevenueCat Billing (Stripe) → checkout
3. **Both**: RevenueCat webhook → `POST /api/webhooks/revenuecat` → update `users.is_pro` in DB

## Counter Realtime

1. Client calls `POST /api/v1/counter/[sectionId]/increment`
2. API writes `project_sections.current_row` in Supabase PostgreSQL
3. Supabase Realtime broadcasts the `UPDATE` automatically
4. Web: `useCounterRealtime(sectionId)` subscribes
5. iOS: `RealtimeManager.subscribeToCounter(sectionId:onUpdate:)` subscribes

---

## AI / PDF Parsing

No separate Python service — everything runs inside Next.js.

| Route | What it does |
|---|---|
| `POST /api/v1/pdf/parse` | Upload PDF → `pdf-parse` extracts text → GPT-4o returns structured pattern |
| `POST /api/v1/gauge/measurement-to-rows` | `target_cm` + `rows_per_10cm` → estimated row count + checkpoints |
| `POST /api/v1/gauge/rows-to-measurement` | `row_count` + `rows_per_10cm` → estimated cm/inches |
| `POST /api/v1/gauge/compare` | Pattern gauge vs user gauge → stitch/row ratios + needle advice |

Key files: `apps/web/lib/pdf.ts` (extraction), `apps/web/lib/openai.ts` (AI client + prompt).

PDF parse is Pro-only. Requires `OPENAI_API_KEY` in `.env.local`.

---

## Ravelry Integration

Bidirectional OAuth sync via `apps/web/app/api/v1/integrations/ravelry/`.

### Data Philosophy

- **User personal data** (stash → `user_stash`, queue → `pattern_queue`, projects → `projects`, needles → `user_needles`): always sync to our own Supabase tables
- **Pattern data**: only saved to `patterns` table when a user explicitly saves/favorites/queues — never bulk-import the Ravelry catalog
- **Search/browse**: always proxy to Ravelry API in real time, never store search results
- **Yarn catalog** (`yarns` + `yarn_companies`): shared reference data, populated from Ravelry imports — not a full mirror

### Source of Truth

- **Ravelry is source of truth** for synced data
- App writes → Ravelry API first → our tables update on next sync
- Never write directly to synced tables without going through Ravelry API (when `sync_to_ravelry` is enabled)
- `ravelry_connections.synced_at` tracks last successful sync

### Sync Strategy

| Data | Our table | Sync direction | Trigger |
|------|-----------|---------------|---------|
| Stash | `user_stash` | Ravelry → Stitch (+ write-back if enabled) | App open + manual |
| Queue | `pattern_queue` | Ravelry → Stitch | App open + manual |
| Projects | `projects` | Bidirectional | App open + manual |
| Needles | `user_needles` | Ravelry → Stitch | App open + manual |
| Patterns | `patterns` | Snapshot on save only | User action |

### Auth & Tokens

- OAuth tokens stored in `ravelry_connections` table (AES-256 encrypted via `lib/encrypt.ts`)
- Ravelry username stored on connection — used for personal data endpoints
- All Ravelry API calls go through Next.js API routes — credentials never exposed to iOS client

### API Quirks

- Photos come as relative URLs — prepend `https://images4.ravelry.com`
- Store original relative path, construct full URL at display time
- Pagination uses `page` + `page_size` params, max `page_size` is 100
- Pattern availability can be null for free patterns — always treat as optional
- Rate limit: respect 1 req/sec for search endpoints, batch where possible

**Key endpoints**: `/patterns/search.json`, `/patterns/[id].json`, `/people/[username]/stash.json`, `/people/[username]/queue/list.json`

---

## AI Agent

Schema supports an AI knitting assistant: `agent_conversations` + `agent_messages` tables.

### Data Access Strategy

- Agent queries **our Supabase tables only** — never hits Ravelry API directly
- "What can I make with my stash?" → read `user_stash` + `yarns` → call Ravelry search API via our proxy route
- "What should I cast on next?" → read `user_stash` + `patterns` (user's saved patterns) → reason locally
- Agent never bulk-queries the Ravelry pattern catalog — uses search API or user's saved patterns only
- User context (stash, queue, projects) included in agent context window for personalized recommendations

---

## Common Pitfalls

- **Prisma import**: Always `@/lib/prisma` in web, `@stitch/db` in packages
- **Auth in routes**: Always `await auth()` then `getDbUser(clerkId)` — both steps required
- **Response format**: `{ success: true, data: ... }` for success; `{ error: '...' }` for errors
- **Return errors, don't throw**: In Next.js route handlers use `return NextResponse.json(...)`, not `throw`
- **Soft deletes**: Always add `deleted_at: null` to queries for projects and patterns
- **Pro gate**: Call `requirePro(user, 'feature name')` before gated logic
- **Path alias**: Use `@/` always — never `../../` relative paths in web app
- **CSS merging**: Use `cn()` from `@/lib/utils` — never string concatenation
- **iOS tokens**: Keychain only via `KeychainManager.shared` — never UserDefaults
- **Env files**: Single root `.env.local` — app-level files are symlinks, don't edit them directly
- **No `.js` extensions**: Next.js uses bundler resolution
