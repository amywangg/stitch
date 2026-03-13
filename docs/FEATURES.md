# Stitch - Master Feature Index

Stitch is a knitting and crochet companion app built as a modern alternative to Ravelry. It combines project tracking with a row counter, a pattern library with AI-powered PDF parsing, yarn stash management, social features, and bidirectional Ravelry sync. The app ships as a SwiftUI iOS app (primary) and a Next.js 14 web app, backed by Supabase PostgreSQL and Prisma ORM.

This document serves as both a feature summary and an implementation checklist. Each feature has a dedicated PRD in the `docs/` directory.

---

## Feature Index

| #   | Feature                              | PRD                                          | Status              | Notes                                                                                                          |
| --- | ------------------------------------ | -------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| 001 | Authentication and Onboarding        | [PRD](001-authentication-and-onboarding.md)  | Mostly complete     | Clerk iOS + web auth, custom sign-in/sign-up screens, 5-step onboarding flow, Clerk webhook user sync all done |
| 002 | Subscriptions and Pro Tier           | [PRD](002-subscriptions-and-pro-tier.md)     | Partially complete  | RevenueCat SDK on iOS (PaywallView, CustomerCenterView, SubscriptionManager), webhook route, free limits, DB schema ready. Needs App Store Connect products, RevenueCat dashboard config, web Stripe checkout |
| 003 | Projects and Row Counter             | [PRD](003-projects-and-row-counter.md)       | Schema + API only   | Schema complete, API routes scaffolded. Row counter has sections, history tracking, realtime sync via Supabase. iOS and web UI not built |
| 004 | Pattern Library and PDF Parsing      | [PRD](004-pattern-library-and-pdf-parsing.md)| Schema + API only   | Schema complete (patterns, sections, rows, sizes, tags). PDF upload tracking added. AI parsing route exists (GPT-4o). No UI built |
| 005 | Ravelry Sync                         | [PRD](005-ravelry-sync.md)                   | Complete            | Bidirectional OAuth sync for projects, stash, queue, needles. Encrypted token storage. Per-type sync timestamps. Write-back toggle. All API routes built |
| 006 | Social Feed and Activity             | [PRD](006-social-feed-and-activity.md)       | Schema only         | Schema complete (posts, activity_events, comments, likes with reactions, follows, notifications, bookmarks). Goodreads/Letterboxd style activity feed. No UI built |
| 007 | Crafting Activity Heatmap            | [PRD](007-crafting-activity-heatmap.md)       | Schema only         | Schema complete (crafting_sessions with date, duration, source). GitHub contributions style. No UI or tracking logic built |
| 008 | Pattern Reviews and Ratings          | [PRD](008-pattern-reviews-and-ratings.md)     | Schema only         | Schema complete (pattern_reviews with rating, difficulty_rating, would_make_again). Letterboxd style. No UI or API built |
| 009 | AI Tooling & Pro Features            | [PRD](009-ai-knitting-agent.md)               | Partially complete  | No chat — AI as invisible engine behind buttons. 4 AI routes done (stash-match, saved-matches, convert-gauge, explain-row), gauge calc done, Ravelry search proxy done, 2 prompts written. Needs iOS UI, Zod validation, rate limiting |
| 010 | Yarn Stash Management                | [PRD](010-yarn-stash-management.md)           | Schema only         | Schema complete (user_stash with status, yarns catalog, yarn_companies). Ravelry sync imports stash. No dedicated UI |
| 011 | Pattern Queue                        | [PRD](011-pattern-queue.md)                   | Schema only         | Schema complete (pattern_queue with Ravelry sync). No dedicated UI |
| 012 | Needle and Hook Collection           | [PRD](012-needle-and-hook-collection.md)      | Schema only         | Schema complete (user_needles with type, size, material). Ravelry sync imports needles. No dedicated UI |
| 013 | Tutorials and Learning               | [PRD](013-tutorials-and-learning.md)          | Schema only         | Schema complete (tutorials, tutorial_steps, user_tutorial_progress). No content or UI |
| 014 | User Measurements and Size Selection | [PRD](014-user-measurements-and-size-selection.md) | Schema only    | Schema added (user_measurements with 12+ body measurements stored in cm). No UI or size matching logic |
| 015 | Gauge Calculator                     | [PRD](015-gauge-calculator.md)                | API only            | API routes exist (measurement-to-rows, rows-to-measurement, compare). No iOS UI |
| 016 | Saved Ravelry Patterns               | [PRD](016-saved-ravelry-patterns.md)          | Schema only         | Schema complete (saved_patterns with Ravelry metadata, needle_sizes array, difficulty). Lightweight snapshots for AI agent dataset. No UI |

---

## Status Legend

| Label              | Meaning                                                    |
| ------------------ | ---------------------------------------------------------- |
| Complete           | Fully implemented across all layers (schema, API, UI)      |
| Mostly complete    | Core functionality works, minor gaps remain                |
| Partially complete | Some layers done (e.g. SDK integrated but config pending)  |
| Schema + API only  | Database schema and API routes exist, no UI                |
| Schema only        | Database tables defined, no API routes or UI               |
| API only           | API routes exist, no schema changes needed, no UI          |
| Not started        | Nothing built yet                                          |

---

## Roadmap

### Phase 1 - Foundation

The baseline infrastructure that every other feature depends on.

- [x] 001 - Authentication and Onboarding (mostly complete)
- [ ] 002 - Subscriptions and Pro Tier (partially complete, needs App Store + Stripe config)

### Phase 2 - Core MVP

The primary crafting tools that define the app's core value.

- [ ] 003 - Projects and Row Counter (schema + API done, needs iOS and web UI)
- [ ] 004 - Pattern Library and PDF Parsing (schema + API done, needs UI)
- [ ] 010 - Yarn Stash Management (schema done, needs UI)
- [ ] 011 - Pattern Queue (schema done, needs UI)
- [ ] 012 - Needle and Hook Collection (schema done, needs UI)
- [ ] 015 - Gauge Calculator (API done, needs iOS UI)

### Phase 3 - Ravelry Integration

Importing and syncing data from users' existing Ravelry accounts.

- [x] 005 - Ravelry Sync (complete)
- [ ] 016 - Saved Ravelry Patterns (schema done, needs UI)

### Phase 4 - Social

Community features inspired by Goodreads and Letterboxd.

- [ ] 006 - Social Feed and Activity (schema done, needs API + UI)
- [ ] 007 - Crafting Activity Heatmap (schema done, needs tracking logic + UI)
- [ ] 008 - Pattern Reviews and Ratings (schema done, needs API + UI)

### Phase 5 - AI

An intelligent knitting assistant powered by the user's own data.

- [ ] 009 - AI Knitting Agent (schema done, needs full implementation)

### Phase 6 - Polish

Quality-of-life features that round out the experience.

- [ ] 013 - Tutorials and Learning (schema done, needs content + UI)
- [ ] 014 - User Measurements and Size Selection (schema done, needs UI + matching logic)
