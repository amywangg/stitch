# Crafting Activity Heatmap

**Status:** Schema complete, no UI or API

## Problem Statement

Crafters have no visibility into their consistency or progress over time. Without a way to see how often they craft, it is hard to build habits or feel motivated. A visual heatmap, similar to GitHub's contribution graph, gives users a satisfying at-a-glance view of their crafting activity.

## Solution Overview

A calendar grid showing one cell per day for the past year. Cell color intensity (light purple to dark purple) reflects total crafting minutes that day. Users log time via an in-app timer, automatic row counter tracking, or manual entry. The heatmap appears on the user's profile page.

## Key Components

### Backend (Next.js API)

- `POST /api/v1/crafting-sessions` - create a session (manual entry or timer stop). **Not started.**
- `GET /api/v1/crafting-sessions` - list sessions with date range and project filters. **Not started.**
- `PATCH /api/v1/crafting-sessions/:id` - edit duration, notes, or project link. **Not started.**
- `DELETE /api/v1/crafting-sessions/:id` - delete a session. **Not started.**
- `GET /api/v1/crafting-sessions/heatmap` - returns daily totals for the past year as `{ date: string, minutes: number }[]`. Aggregates by `date` field, grouped with `SUM(duration_minutes)`. **Not started.**
- `GET /api/v1/crafting-sessions/stats` - summary stats: total minutes this week/month/year, longest streak, current streak. **Not started.**
- Auto-tracking hook in counter increment route: if time since last increment > 30 min, start a new session; otherwise extend the current one. **Not started.**

### iOS (SwiftUI)

- `HeatmapView` - calendar grid component. 52 columns (weeks) x 7 rows (days). Color scale from `Color.clear` (0 min) through light purple to dark purple. Tappable cells show day detail. **Not started.**
- `CraftingTimerView` - start/stop timer with project picker. Floating button or embedded in project detail. **Not started.**
- `ManualSessionEntryView` - form for logging past sessions (date picker, duration, project, notes). **Not started.**
- `SessionListView` - list of sessions for a given day or project, with edit/delete. **Not started.**
- `CraftingStatsCard` - summary card showing streaks and totals. **Not started.**
- `HeatmapViewModel` - fetches heatmap data and stats. **Not started.**
- `CraftingTimerViewModel` - manages timer state, creates session on stop. **Not started.**

### Web (Next.js)

- `components/features/heatmap/Heatmap.tsx` - SVG or CSS grid calendar component. Tooltip on hover showing date and minutes. **Not started.**
- `components/features/heatmap/CraftingStats.tsx` - streak and total display. **Not started.**
- `(app)/profile/[username]/page.tsx` - integrate heatmap into profile page. **Not started.**
- `(app)/projects/[slug]/page.tsx` - session list and timer for specific project. **Not started.**

### Database

- `crafting_sessions` - user_id, project_id (optional), date (Date type for grouping), started_at, ended_at, duration_minutes, source ("timer" | "counter" | "manual"), notes.
- Indexed on `[user_id, date]` for heatmap aggregation query.
- Indexed on `[user_id, created_at]` for recent session listing.
- Indexed on `[project_id]` for per-project session history.

## Implementation Checklist

- [x] Database schema for crafting_sessions
- [x] Date field (db.Date) for calendar-day grouping
- [x] Source field to distinguish timer, counter, and manual entries
- [x] Indexes for heatmap query, recent sessions, and per-project lookup
- [ ] CRUD API routes for crafting sessions
- [ ] Heatmap data endpoint (daily aggregation for past year)
- [ ] Stats endpoint (streaks, weekly/monthly/yearly totals)
- [ ] Auto-session creation from row counter activity
- [ ] Activity event emission (session_logged) for social feed
- [ ] iOS HeatmapView calendar grid component
- [ ] iOS CraftingTimerView with start/stop and project picker
- [ ] iOS ManualSessionEntryView form
- [ ] iOS SessionListView with edit/delete
- [ ] iOS CraftingStatsCard (streaks, totals)
- [ ] Web Heatmap SVG/CSS grid component with tooltips
- [ ] Web CraftingStats display
- [ ] Profile page integration (iOS and web)
- [ ] Project detail integration (session list per project)

## Dependencies

- Auth (Clerk) - required for user identity
- Projects - optional link for per-project session tracking
- Row counter routes - required for auto-tracking integration
- Activity events (006) - session_logged events feed into the social feed

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| Manual session entry | Yes | Yes |
| In-app timer | Yes | Yes |
| Heatmap on profile | Yes | Yes |
| Auto-tracking from counter | Yes | Yes |
| Stats (streaks, totals) | Yes | Yes |

This feature is free for all users. No tier gating.

## Technical Notes

- The heatmap query should use Prisma's `groupBy` on the `date` field with `_sum` on `duration_minutes`, filtered to the past 365 days. This is efficient with the `[user_id, date]` composite index.
- Color scale thresholds: 0 min = empty, 1-15 min = level 1 (lightest), 16-45 min = level 2, 46-90 min = level 3, 91+ min = level 4 (darkest). These thresholds can be tuned based on user data.
- Auto-tracking from the row counter: when a counter increment comes in, check if the user has an open session (source = "counter") within the last 30 minutes. If yes, extend `ended_at` and recalculate `duration_minutes`. If no, create a new session. This avoids creating a session per row increment.
- The timer stores `started_at` in local state. On stop, it calculates `duration_minutes`, sets `ended_at`, and POSTs to the API. If the app is killed mid-timer, the session is lost. A future enhancement could persist timer state locally.
- The `date` field uses Prisma's `@db.Date` type (no time component) so that grouping works correctly regardless of timezone. The API should convert the user's local date to this field.
- Streak calculation: count consecutive days with at least one session, working backwards from today. "Longest streak" requires scanning the full history. Cache this if it becomes expensive.
