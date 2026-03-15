# Feature Gaps — Implementation Backlog

This document catalogs every unbuilt piece across all feature docs. Organized by priority tier based on the monetization and growth strategy (doc 017). Designed to be handed to an implementation agent.

---

## Priority 1: Core Loop (must ship before launch)

These features make the app usable day-to-day. Without them, there is no retention.

### 003 — Projects and Row Counter

The row counter is the #1 daily-use feature and the primary retention hook. Nothing else matters if this doesn't work.

**API routes (all not started):**
- `GET /api/v1/projects` — list with pagination + status filter
- `POST /api/v1/projects` — create (enforce 3 active project limit for free tier)
- `GET /api/v1/projects/[id]` — detail with sections, gauge, photos, yarns
- `PATCH /api/v1/projects/[id]` — update
- `DELETE /api/v1/projects/[id]` — soft delete
- `POST /api/v1/projects/[id]/sections` — add section
- `PATCH /api/v1/projects/[id]/sections/[sectionId]` — update section
- `DELETE /api/v1/projects/[id]/sections/[sectionId]` — remove section
- `POST /api/v1/counter/[sectionId]/increment` — increment + log history + Realtime broadcast
- `POST /api/v1/counter/[sectionId]/decrement` — decrement + log history
- `POST /api/v1/counter/[sectionId]/reset` — reset
- `POST /api/v1/projects/[id]/photos` — upload to Supabase Storage
- `DELETE /api/v1/projects/[id]/photos/[photoId]` — remove photo
- `POST /api/v1/projects/[id]/gauge` — save gauge measurement

**iOS (all not started):**
- ProjectsView (list with status filter tabs)
- ProjectDetailView (sections, photos, gauge, progress)
- ProjectCreateView (form with title, craft type, pattern link, yarn)
- ProjectEditView
- CounterView (large tap target, haptics, section switcher)
- SectionManagementView (add, reorder via drag, delete)
- GaugeInputView
- PhotoGalleryView (camera + library picker)
- ProjectViewModel, CounterViewModel

**Web (all not started):**
- Projects list, detail, create/edit pages
- Counter component with keyboard shortcuts
- Section manager, photo upload components
- `useCounterRealtime` hook (Supabase Realtime)

### 004 — Pattern Library (CRUD only, PDF parsing exists)

**API routes (not started):**
- `GET /api/v1/patterns` — list with pagination + filters
- `POST /api/v1/patterns` — create manually
- `GET /api/v1/patterns/[id]` — detail with sections, rows, sizes
- `PATCH /api/v1/patterns/[id]` — update
- `DELETE /api/v1/patterns/[id]` — soft delete
- `POST /api/v1/patterns/[id]/sections` — add section
- `PATCH /api/v1/patterns/[id]/sections/[sectionId]` — update section
- `POST /api/v1/pdf/upload` — upload PDF to Supabase Storage

**iOS (all not started):**
- PatternsView (grid/list with search + filters)
- PatternDetailView
- PatternUploadView (document picker → AI parsing)
- PatternReviewView (edit AI-extracted data before saving)
- PatternReadingView (row-by-row follow-along, current row highlighted)
- PatternCreateView (manual entry)
- PatternViewModel

**Web (all not started):**
- Pattern library page, detail page, upload page, review page
- Pattern reading component

### 010 — Yarn Stash Management

Stash is free, unlimited, and creates data lock-in (endowment effect). Critical for AI tools.

**API routes (all not started):**
- `GET /api/v1/stash` — paginated list with filters (status, weight, company)
- `POST /api/v1/stash` — add item (link existing yarn or create inline)
- `PATCH /api/v1/stash/:id` — update
- `DELETE /api/v1/stash/:id` — remove
- `GET /api/v1/stash/stats` — total skeins, grams, breakdown by weight/status
- `GET /api/v1/yarns/search` — typeahead for yarn catalog
- `POST /api/v1/yarns` — add yarn to shared catalog
- `GET /api/v1/yarn-companies` — list companies

**iOS (all not started):**
- StashListView (grid/list, filter chips)
- StashDetailView (yarn info, status picker, linked projects)
- AddStashItemView (yarn search typeahead, colorway, skeins)
- StashFilterSheet, StashStatsCard, StashViewModel

**Web (all not started):**
- Stash list page, add page, StashCard, StashFilters, YarnSearch, StashStats

### 012 — Needle and Hook Collection

Free, unlimited. Feeds into yarn-sub needle matching (already built).

**API routes (all not started):**
- `GET /api/v1/needles` — list with optional type/size filters
- `POST /api/v1/needles` — add
- `PATCH /api/v1/needles/[id]` — update
- `DELETE /api/v1/needles/[id]` — remove

**iOS + Web (all not started):**
- NeedlesView, NeedleRow, AddNeedleSheet, NeedlesViewModel
- Web needles page, NeedleCard, add/edit dialog

---

## Priority 2: Monetization Infrastructure

These enable revenue. Must ship alongside or immediately after core loop.

### 002 — Subscriptions (partially complete)

**Not started:**
- App Store Connect: create products (monthly, yearly, lifetime)
- RevenueCat dashboard: configure entitlement "Stitch Pro", offerings, paywall template
- RevenueCat webhook handler: parse INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE events → update `users.is_pro` + `subscriptions`
- Web Stripe checkout via RevenueCat Billing
- `GET /api/v1/subscription/status` API route
- Grace period handling (keep Pro during billing retry)
- Promo codes and free trial configuration
- Restore purchases error handling on iOS
- Subscription status indicator (Pro badge) on iOS and web
- Web pricing page, checkout flow, management page, ProGateBanner

**New from monetization strategy (017):**
- Annual plan ($39.99/year) — add product in App Store Connect + RevenueCat
- Lifetime plan ($99.99) — add product, set `expires_at = null` + `period_type = 'lifetime'`
- Consider Plus tier ($1.99/mo) — requires new entitlement, new `FREE_LIMITS` logic
- 14-day reverse trial — grant Pro on signup, revoke after 14 days (see new feature below)

### NEW — Reverse Trial System

Not documented anywhere yet. Needs:

**Backend:**
- On user creation (Clerk webhook or `getDbUser` upsert): set `users.trial_ends_at = now + 14 days`, `users.is_pro = true`
- Cron job or webhook-triggered check: when `trial_ends_at` passes, set `is_pro = false` (only if no active subscription)
- `requirePro()` should consider `trial_ends_at` in its check
- Trial status endpoint: `GET /api/v1/subscription/status` should return `{ is_trial: true, trial_ends_at, days_remaining }`

**iOS:**
- Trial countdown banner (subtle, not aggressive)
- Day 10 reminder: "Your Pro trial ends in 4 days. Here's what you've used: [stats]"
- Post-trial: contextual upgrade prompts at natural friction points

**Web:**
- Same trial banner + countdown
- Post-trial upgrade prompts

**Critical rule:** Never delete user data created during trial. All projects, patterns, stash remain. User just can't exceed free limits or use AI tools.

### NEW — Onboarding Enhancements (from 017)

Doc 001 has a 5-step onboarding, but the monetization strategy requires specific activation moments:

**Not yet planned:**
- Guide user to create first project + increment counter in session 1
- Personalization questions: "What do you love to make?" + experience level
- Show one AI feature taste during onboarding (e.g., stash-to-pattern match) with Pro trial badge
- Never show paywall before activation moment
- Track activation metric: "created project + incremented counter at least once"

---

## Priority 3: Social & Community (retention multiplier)

Social features drive daily visits and organic growth. All social features are free for all users.

### 006 — Social Feed and Activity

**ALL not started. This is the largest unbuilt feature.**

**API routes (17 routes, all not started):**
- Posts CRUD: `POST/GET/PATCH/DELETE /api/v1/posts`
- Feed: `GET /api/v1/feed` (posts + activity_events interleaved)
- Follows: `POST/DELETE /api/v1/follows/:userId`, `GET /api/v1/users/:id/followers`, `GET /api/v1/users/:id/following`
- Comments: `POST/DELETE /api/v1/comments`
- Likes: `POST/DELETE /api/v1/likes`
- Bookmarks: `POST/DELETE /api/v1/bookmarks/:postId`
- Notifications: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/read`
- Activity event auto-creation hooks in project/pattern/counter/session/review routes

**iOS (all not started):**
- FeedView, PostComposerView, PostDetailView, ActivityEventCard
- CommentsSheet, ReactionPicker, FollowersView/FollowingView
- NotificationsView with badge, FeedViewModel, PostViewModel, NotificationsViewModel

**Web (all not started):**
- Feed page, post detail page, notifications page, profile page with follow button
- FeedItem, ActivityEventCard, PostCard, CommentList, ReactionBar components

**Tier update needed:** Doc 006 currently gates post creation to Pro. Per user's decision, social posting should be **free for all users**. Update the doc.

### 008 — Pattern Reviews and Ratings

**All not started:**
- Review CRUD API routes (5 routes)
- Aggregate ratings endpoint
- Activity event creation on review submit
- iOS: ReviewFormView, ReviewListView, RatingsSummaryCard, StarRatingView, post-completion prompt
- Web: ReviewForm, ReviewList, RatingsSummary, StarRating components

### 018 — User Profiles

Full PRD: `docs/018-user-profiles.md`

**All not started:**
- `GET /api/v1/users/:username` — public profile data
- `PATCH /api/v1/users/me` — update display_name, bio, avatar
- Avatar upload to Supabase Storage
- iOS: ProfileView, UserProfileView, EditProfileView, ProfileViewModel
- Web: `(app)/profile/[username]/page.tsx`, profile edit in settings
- Integrate heatmap (007), recent projects, reviews, activity into profile page

---

## Priority 4: Engagement Features (retention + habit building)

### 007 — Crafting Activity Heatmap

**All not started:**
- CRUD API routes for crafting sessions (4 routes)
- Heatmap data endpoint (daily aggregation for past year)
- Stats endpoint (streaks, weekly/monthly/yearly totals)
- Auto-session creation from row counter activity
- iOS: HeatmapView (calendar grid), CraftingTimerView, ManualSessionEntryView, SessionListView, CraftingStatsCard
- Web: Heatmap SVG/CSS component, CraftingStats display
- Profile page integration

### 011 — Pattern Queue

**Not started (except iOS tab placeholder):**
- Queue CRUD API routes (4 routes + reorder + start-project)
- iOS: QueueView (drag-to-reorder), QueueItemRow, QueueViewModel, add-to-queue button, start-project flow
- Web: Queue page, QueueCard, add-to-queue button

### 015 — Gauge Calculator (API done, UI not started)

**iOS (all not started):**
- GaugeCalculatorView with mode switcher
- MeasurementToRowsForm, RowsToMeasurementForm, GaugeCompareForm
- GaugeResultView, auto-fill from project gauge

**Web (all not started):**
- Gauge calculator page with mode tabs
- GaugeForm, GaugeResult components

### 014 — User Measurements

**Not started:**
- `GET /api/v1/measurements` — get user's measurements
- `PUT /api/v1/measurements` — upsert measurements
- iOS: MeasurementsView (grouped form), MeasurementsViewModel, unit toggle
- Web: Measurements form in settings

Note: The `POST /api/v1/measurements/recommend-size` endpoint is now handled by `POST /api/v1/ai/size-rec` (already built).

---

## Priority 5: Content & Discovery

### 013 — Tutorials and Learning

**All not started:**
- Seed tutorial content (3-5 per category minimum)
- API routes: list tutorials, get tutorial with steps, update progress
- iOS: TutorialsView, TutorialCategoryView, TutorialReaderView, TutorialStepView
- Web: Tutorials listing page, tutorial reader
- Contextual linking from pattern instructions to tutorials

### 016 — Saved Ravelry Patterns (schema done)

**Not started:**
- `GET /api/v1/saved-patterns` — list with filters
- `POST /api/v1/saved-patterns` — save snapshot
- `DELETE /api/v1/saved-patterns/[id]` — remove
- iOS: SavedPatternsView, RavelrySearchView, RavelryPatternDetailView, SavedPatternCard
- Web: Ravelry search page, saved patterns page
- Free tier limit (15 saved patterns)

---

## Priority 6: Polish & Infrastructure

### 001 — Auth Gaps

- Web sign-in/sign-up pages with custom Clerk styling
- Web email verification flow
- iOS forgot password flow
- iOS deep link handling for email verification
- Onboarding API routes (`POST /api/v1/onboarding/complete-step`, `GET /api/v1/onboarding/status`)
- Web onboarding wizard
- Profile completion flow (avatar upload, display name, bio)

### 005 — Ravelry Sync Gaps

- Automatic sync on app open (currently manual only)
- Conflict resolution for bidirectional edits
- Sync error recovery UI
- Background sync scheduling for Pro users
- Disconnect/revoke flow
- Web Ravelry settings UI

### 019 — Smart Notifications

Full PRD: `docs/019-smart-notifications.md`

**All not started:**
- Push notification service (APNs)
- Notification preferences API (get/update)
- Cron jobs: progress milestones, re-engagement, social digest, trial reminders
- iOS push registration + preferences UI
- Web notification preferences page
- Database: notification_preferences, push_tokens tables

### 020 — Analytics & Conversion Tracking

Full PRD: `docs/020-analytics-and-conversion-tracking.md`

**All not started:**
- Event tracking API route (batch-friendly)
- analytics_events table
- Add activated_at and trial_ends_at to users table
- Activation detection middleware
- iOS/web analytics clients with event batching
- Admin funnel and retention endpoints
- RevenueCat analytics integration
- Conversion trigger tracking

---

## Tier Gating Corrections — APPLIED

All corrections from the monetization strategy (017) have been applied to the feature docs:

| Doc | Correction | Status |
|-----|-----------|--------|
| 002 | Social posting → "Full access" for both tiers, added annual/lifetime plans, added reverse trial section | Done |
| 004 | Saved patterns limit 10 → 15, added reverse trial note | Done |
| 006 | Post creation free for all users, removed Pro gate from checklist | Done |
| 016 | Saved patterns limit 10 → 15 | Done |
| 001 | Added enhanced onboarding flow from monetization strategy, reverse trial integration | Done |
| 003 | Added monetization role section (row counter as #1 retention hook) | Done |
| 007 | Added monetization role section (habit building, AI time estimator feed) | Done |
| 008 | Added monetization role section (community content driver) | Done |
| 010 | Added monetization role section (endowment effect, data lock-in) | Done |
| CLAUDE.md | Updated tier gating table (saved patterns 15, social posting free, AI tools breakdown) | Done |
| pro-gate.ts | Updated FREE_LIMITS.savedPatterns from 10 to 15 | Done |

---

## AI Tools Status (009)

All 9 AI routes are built (backend only). No iOS or web UI exists for any of them:

| Route | Status |
|-------|--------|
| `POST /api/v1/ai/stash-match` | Backend done, no UI |
| `GET /api/v1/ai/saved-matches` | Backend done, no UI |
| `POST /api/v1/ai/convert-gauge` | Backend done, no UI |
| `POST /api/v1/ai/explain-row` | Backend done, no UI |
| `POST /api/v1/ai/yarn-sub` | Backend done, no UI |
| `POST /api/v1/ai/size-rec` | Backend done, no UI |
| `POST /api/v1/ai/time-estimate` | Backend done, no UI |
| `POST /api/v1/ai/stash-planner` | Backend done, no UI |
| `POST /api/v1/ai/yarn-equiv` | Backend done, no UI |

All AI tools are Pro-gated except `explain-row` (free, uses GPT-4o-mini).

---

## Summary: Build Order

1. **Projects + Row Counter** (003) — the daily-use core loop
2. **Pattern Library CRUD** (004) — store and follow patterns
3. **Stash Management** (010) + **Needles** (012) — data investment, AI input
4. **Subscriptions** (002) + **Reverse Trial** — monetization infrastructure
5. **Social Feed** (006) + **Profiles** — retention multiplier, organic growth
6. **Heatmap** (007) + **Queue** (011) — engagement features
7. **Gauge Calculator UI** (015) + **Measurements UI** (014) — utility tools
8. **AI Tool UIs** (009) — the Pro differentiator
9. **Reviews** (008) + **Tutorials** (013) + **Saved Patterns UI** (016) — content & discovery
10. **Auth polish** (001) + **Ravelry gaps** (005) + **Notifications** + **Analytics** — infrastructure
