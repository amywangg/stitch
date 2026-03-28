# Stitch — Master Feature Index

Stitch is a knitting and crochet companion app built as a modern alternative to Ravelry. It combines project tracking with a row counter, a pattern library with AI-powered PDF parsing, yarn stash management, social features, and bidirectional Ravelry sync. The app ships as a SwiftUI iOS app (primary) and a Next.js 14 web app, backed by Supabase PostgreSQL and Prisma ORM.

This document serves as both a feature summary and an implementation checklist. Each feature has a dedicated PRD in the `docs/` directory.

---

## Feature Index

| # | Feature | PRD | Status | Notes |
|---|---------|-----|--------|-------|
| 001 | Authentication and Onboarding | [PRD](001-authentication-and-onboarding.md) | **Complete** | Clerk iOS auth, 7-step onboarding (craft, knitting style, experience, Ravelry, measurements, first project), webhook user sync, avatar upload |
| 002 | Subscriptions and Pro Tier | [PRD](002-subscriptions-and-pro-tier.md) | **Complete** | RevenueCat SDK, custom StitchPaywallView, Plus/Pro tiers, server-side gating. Needs App Store Connect products + RevenueCat dashboard config |
| 003 | Projects and Row Counter | [PRD](003-projects-and-row-counter.md) | **Complete** | Visual counter with progress ring, haptics, milestones, voice commands (10), cast-on mode, project photos, manual progress, session logging, Ravelry push-back |
| 004 | Pattern Library and PDF Parsing | [PRD](004-pattern-library-and-pdf-parsing.md) | **Complete** | Pattern CRUD, folders, PDF upload/parsing (Pro-gated), PDF annotation (free), pattern builder, AI builder (Pro), curated browse, Ravelry search |
| 005 | Ravelry Sync | [PRD](005-ravelry-sync.md) | **Complete** | Bidirectional OAuth 1.0a. Full sync (7 phases + push-back), quick sync on app open (15-min throttle), verified write endpoints |
| 006 | Social Feed and Activity | [PRD](006-social-feed-and-activity.md) | **Complete** | Feed, posts, comments, likes, follows, Polywork-style compose, find friends (Ravelry cross-ref + invite), follower/following lists |
| 007 | Crafting Activity Heatmap | [PRD](007-crafting-activity-heatmap.md) | **Complete** | 52-week heatmap on profile, session logging, time tracking |
| 008 | Pattern Reviews and Ratings | [PRD](008-pattern-reviews-and-ratings.md) | **Complete** | Star ratings, difficulty, would-make-again, review feed |
| 009 | AI Tooling & Pro Features | [PRD](009-ai-knitting-agent.md) | **Complete** | 9 AI routes, gauge calculator, no chat — structured UI only |
| 010 | Yarn Stash Management | [PRD](010-yarn-stash-management.md) | **Complete** | Stash CRUD, yarn search with curated browse, two-tab picker, Ravelry import |
| 011 | Pattern Queue | [PRD](011-pattern-queue.md) | **Complete** | Queue add/remove with Ravelry sync, remove buttons |
| 012 | Needle and Hook Collection | [PRD](012-needle-and-hook-collection.md) | **Complete** | Needle CRUD, tool catalog, AI lookup, two-tab picker, 3.8mm support |
| 013 | Tutorials and Learning | [PRD](013-tutorials-and-learning.md) | **Complete** | Glossary (300+ terms), tutorials (27/140 steps), Learn tab |
| 014 | User Measurements | [PRD](014-user-measurements-and-size-selection.md) | **Complete** | 12+ measurements, quick-size picker, onboarding integration |
| 015 | Gauge Calculator | [PRD](015-gauge-calculator.md) | **Complete** | Measurement-to-rows, comparison API routes |
| 016 | Saved Ravelry Patterns | [PRD](016-saved-ravelry-patterns.md) | **Complete** | Save/unsave Ravelry patterns |
| 017 | Monetization and Growth | [PRD](017-monetization-and-growth.md) | Strategy done | Pricing, free tier, reverse trial documented |
| 018 | User Profiles | [PRD](018-user-profiles.md) | **Complete** | Badges (16 achievements), heatmap, follower lists, Ravelry avatar fallback |
| 019 | In-App Notifications | [PRD](019-smart-notifications.md) | **Partial** | 6 types, polling (30s), badge, tap-to-read. Missing: push (APNs), realtime |
| 020 | Analytics | [PRD](020-analytics-and-conversion-tracking.md) | Not started | Activation, funnels, retention cohorts |
| 021 | Pattern Marketplace | [PRD](021-pattern-marketplace.md) | **Complete** | Stripe Connect, PDF watermarking, legal agreements |
| 022 | Pattern Creation | [PRD](022-pattern-creation.md) | **Complete** | In-app builder, AI builder (Pro), PDF generation |

---

## What's Built

### iOS App Highlights
- 7-step onboarding with progress dots
- Row counter: voice commands, milestones (confetti at 50/100/250/500/1000), haptics, progress ring
- Cast-on mode (full-screen voice-activated counting)
- PDF viewer with annotation tools (highlight, pen, text, eraser, undo/redo) + floating counter
- Project photos (carousel, upload, full-screen zoom)
- Manual progress slider for non-parsed projects
- Custom paywall (StitchPaywallView) — not RevenueCat default
- Polywork-style post composer with auto-populate from project
- Find friends: Ravelry cross-reference + invite, follower/following lists
- Achievement badges (16 types) on profile
- Notification polling (30s) with unread badge on Feed tab + bell icon
- Curated browse (Most Popular, Top Rated, Recently Added) for patterns and yarn
- Two-tab pickers for stash and needles (My Collection / Search)

### API Highlights
- Full Ravelry bidirectional sync (7 pull phases + push-back phase)
- Quick sync on app open (15-min server-side throttle)
- Write-back on every project CRUD, queue add/remove, stash delete
- 6 notification types with polling endpoint
- Content moderation (NSFW-only for images, craft-relevance for text)
- PDF storage unlimited for all tiers
- Project photos, PDF annotations, pattern folders

### Ravelry Integration
- OAuth 1.0a with app-write scope
- Verified writable: Projects (full CRUD), Favorites (create+delete), Queue (create+delete), Stash (delete)
- Not writable: Needles, Library, Profile

---

## Remaining Work

| Priority | Item |
|----------|------|
| High | Push notifications (APNs) — device tokens, server-side push |
| High | App Store Connect products + RevenueCat dashboard paywall config |
| Medium | Supabase Realtime for counter sync (stub exists) |
| Medium | Analytics and conversion tracking (020) |
| Medium | Web UI for all features |
| Low | @mention parsing in comments |
| Low | Social digest notifications (daily summary) |
