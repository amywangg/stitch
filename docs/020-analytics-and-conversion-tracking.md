# Analytics and Conversion Tracking

**Status:** Not started

## Problem Statement

Without analytics, there is no way to measure whether the monetization strategy is working. We need to track the full funnel: signup → activation → trial → conversion → retention → churn. We also need feature-level usage data to understand which Pro features drive upgrades and which free features drive retention.

## Solution Overview

Lightweight event tracking that captures key user actions and funnel milestones. Server-side events for critical metrics (activation, conversion), client-side events for engagement tracking. RevenueCat provides subscription-specific analytics. The goal is actionable data, not a data warehouse.

## Key Metrics

### Funnel Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Activation rate | % of signups who create a project + increment counter | > 50% in session 1 |
| Trial-to-paid conversion | % of trial users who subscribe before or shortly after trial ends | 15-20% |
| Free-to-paid conversion | % of all free users who eventually subscribe | 3-5% (year 1), 5-8% (year 2) |
| D1 retention | % of users who return day after signup | 30%+ |
| D7 retention | % returning after 7 days | 15%+ |
| D30 retention | % returning after 30 days | 10%+ |
| DAU/MAU ratio | Daily active / monthly active | 20%+ |
| Monthly churn | % of paying subscribers who cancel per month | < 8% |

### Feature Usage Metrics

| Event | Why it matters |
|-------|---------------|
| `counter_increment` | Core loop engagement — should be the most frequent event |
| `project_created` | Investment signal |
| `pattern_saved` | Data lock-in signal |
| `stash_item_added` | Data lock-in signal |
| `ai_tool_used` (with tool name) | Pro feature engagement — which AI tools drive the most value |
| `pdf_uploaded` | Pro feature usage |
| `social_post_created` | Community engagement |
| `ravelry_synced` | Integration engagement |
| `upgrade_prompt_shown` (with context) | Where users see upgrade prompts |
| `upgrade_prompt_tapped` | Where users act on upgrade prompts |

### Conversion Trigger Tracking

Track what screen/action immediately preceded an upgrade:
- Hit project limit → upgrade
- Hit pattern limit → upgrade
- Tried AI tool (gated) → upgrade
- Trial expiry reminder → upgrade
- Paywall view → upgrade

## Key Components

### Backend (Next.js API)

| Route / Service | Purpose | Status |
|---|---|---|
| `POST /api/v1/analytics/event` | Record a tracking event (batch-friendly) | Not started |
| `GET /api/v1/analytics/funnel` | Admin: funnel metrics for a date range | Not started |
| `GET /api/v1/analytics/retention` | Admin: cohort retention table | Not started |
| Activation check middleware | After counter increment, check if user is activated (first project + first counter use) → set `users.activated_at` | Not started |

### Database

| Table | Purpose |
|---|---|
| `analytics_events` | Append-only event log: user_id, event_name, properties (JSON), created_at, platform (ios/web) |
| Add to `users` | `activated_at` (DateTime?), `trial_ends_at` (DateTime?) |

Index on `[event_name, created_at]` for funnel queries. Index on `[user_id, created_at]` for per-user history. Consider partitioning by month if the table grows large.

### iOS

- Lightweight analytics client that batches events and sends to the API
- Track: app_open, screen_view, counter_increment, project_created, ai_tool_used, upgrade_prompt_shown/tapped

### Web

- Same event tracking via `api.post('/analytics/event', ...)`
- Track: page_view, counter_increment, project_created, ai_tool_used, upgrade_prompt_shown/tapped

## Implementation Checklist

- [ ] Database schema for analytics_events table
- [ ] Add activated_at and trial_ends_at to users table
- [ ] Event tracking API route (batch support)
- [ ] Activation detection: set activated_at on first project + counter use
- [ ] iOS analytics client with event batching
- [ ] Web analytics event tracking
- [ ] Admin funnel metrics endpoint
- [ ] Admin retention cohort endpoint
- [ ] RevenueCat analytics dashboard integration (revenue, MRR, churn, LTV)
- [ ] Conversion trigger tracking (what preceded upgrade)
- [ ] Feature usage dashboard (which AI tools are used most)

## Dependencies

- Authentication (001) for user identity
- Subscriptions (002) for subscription events (use RevenueCat analytics for these)
- All feature routes should emit events at key moments

## Tier Gating

Analytics infrastructure is internal. No user-facing tier gating.

## Technical Notes

- Keep the event tracking endpoint fast: validate, insert, return 200. No processing at write time.
- Batch events from iOS: collect events locally and send in batches of 10-50 every 30 seconds or on app background.
- RevenueCat provides built-in analytics for subscription metrics (MRR, churn, LTV, trial conversion). Use their dashboard rather than rebuilding this. Our analytics focus on activation, retention, and feature usage.
- For retention cohorts, query by `users.created_at` week → check for `analytics_events` in subsequent weeks. This query can be expensive; run it as a scheduled job and cache results.
- Consider using PostHog or Mixpanel if self-hosted analytics becomes too complex. But start simple: a single append-only table with JSON properties covers most needs.
- Privacy: do not track PII in event properties. User ID is sufficient for linking events to users. No IP addresses, no device fingerprints beyond what's needed for dedup.
- The `activated_at` field on users is the single most important metric. Every other metric is downstream of whether users activate.
