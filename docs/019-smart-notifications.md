# Smart Notifications

**Status:** Not started

## Problem Statement

Users forget to return to the app between knitting sessions, especially during the critical first 30 days. Without timely, relevant nudges, retention drops below hobby-app benchmarks. Notifications must be helpful and non-spammy — the craft community is sensitive to aggressive marketing tactics.

## Solution Overview

Context-aware push notifications tied to real user activity and milestones. Four categories: progress milestones, re-engagement, social digest, and trial/subscription reminders. All notifications respect user preferences and are designed to feel like a helpful companion, not a marketing channel.

## Key Components

### Backend (Next.js API)

| Route / Service | Purpose | Status |
|---|---|---|
| `POST /api/v1/notifications/push` | Internal endpoint for sending push notifications via APNs/FCM | Not started |
| `GET /api/v1/notifications/preferences` | Get user's notification preferences | Not started |
| `PATCH /api/v1/notifications/preferences` | Update notification preferences | Not started |
| Cron: progress milestones | Check for users hitting 25%, 50%, 75%, 90% of a section's target rows | Not started |
| Cron: re-engagement | Detect users who haven't opened the app in 5+ days with active projects | Not started |
| Cron: social digest | Daily digest of activity from followed users (opt-in) | Not started |
| Cron: trial reminders | Day 10 and Day 13 trial expiry reminders | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| Push notification registration | Request permission, store device token | Not started |
| `NotificationPreferencesView.swift` | Toggle each notification category on/off | Not started |
| Rich notification content | Show project photo in notification | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/settings/notifications/page.tsx` | Notification preferences | Not started |
| Web push support (future) | Service worker for browser notifications | Not started |

### Database

| Table | Purpose |
|---|---|
| `notification_preferences` | Per-user toggles: progress_milestones, re_engagement, social_digest, trial_reminders (all Boolean, default true) |
| `push_tokens` | Device tokens for APNs/FCM: user_id, platform, token, created_at |

## Notification Types

### Progress Milestones (free, all users)
- "You're 50% through the body section of your Honey Cowl!" (at 25%, 50%, 75%, 90%)
- Triggered by row counter activity crossing threshold percentages of `target_rows`
- Only fires once per milestone per section

### Re-engagement (free, all users)
- "You haven't knit in 5 days — your Honey Cowl is waiting" (only after 5+ days of inactivity)
- "Pick up where you left off — row 47 of the sleeve" (includes specific progress context)
- Maximum 1 per week, never on consecutive days
- Only for users with active (non-hibernating) projects

### Social Digest (free, opt-in)
- "3 new projects from people you follow" (daily at user's preferred time)
- Only sent if there are 3+ new items to show
- Links to the feed page

### Trial/Subscription Reminders
- Day 10: "Your Pro trial ends in 4 days. Here's what you've used: [3 AI analyses, 5 projects]"
- Day 13: "Last day of your Pro trial — upgrade to keep unlimited access"
- Post-trial: "Your 3rd project slot just filled up — upgrade to add more" (contextual, at friction point)
- Maximum 1 subscription notification per week post-trial

## Implementation Checklist

- [ ] Database schema for notification_preferences and push_tokens
- [ ] Push notification service (APNs for iOS, optionally FCM for future Android)
- [ ] Device token registration endpoint
- [ ] Notification preferences API routes
- [ ] Progress milestone cron job
- [ ] Re-engagement cron job
- [ ] Social digest cron job
- [ ] Trial reminder cron job (Day 10, Day 13)
- [ ] iOS push notification permission request (during onboarding, after activation)
- [ ] iOS NotificationPreferencesView in settings
- [ ] iOS rich notification with project photo
- [ ] Web notification preferences page
- [ ] Rate limiting: no more than 2 notifications per day total
- [ ] Analytics: track notification open rates per type

## Dependencies

- Authentication (001) for user identity
- Projects (003) for progress milestone data
- Social Feed (006) for social digest content
- Subscriptions (002) for trial status
- APNs certificate/key configured in the deployment environment

## Tier Gating

All notification types are free. Trial/subscription reminders only apply to users without an active subscription.

## Technical Notes

- Request push notification permission **after** the activation moment (user has created a project and tapped the counter), not during onboarding. Asking too early reduces opt-in rates.
- Use APNs directly for iOS (p8 key). No need for Firebase/FCM until Android is supported.
- Cron jobs should run on Vercel Cron (or equivalent). Keep execution time under 10 seconds per job by batching users.
- The re-engagement notification should include the specific project name and current row to feel personal, not generic.
- Never send notifications between 10 PM and 8 AM in the user's timezone. Store timezone on the user record or infer from device.
- The social digest should be sent at a consistent time the user chooses (default: 9 AM local time).
