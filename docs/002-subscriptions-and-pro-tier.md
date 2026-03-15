# Subscriptions and Pro Tier

**Status:** Partially complete

## Problem Statement

Stitch needs a sustainable revenue model that works across iOS and web. Users can upgrade to Plus ($1.99/mo) for unlimited projects, patterns, and cross-device sync, or to Pro ($4.99/mo) for all Plus features plus AI tools, unlimited PDFs, and Ravelry auto-sync. Subscriptions must be manageable from either platform, with RevenueCat handling cross-platform entitlement tracking.

## Solution Overview

RevenueCat manages subscriptions on both platforms: StoreKit 2 on iOS, Stripe via RevenueCat Billing on web. Two entitlements — "Stitch Plus" and "Stitch Pro" — gate features at different levels. RevenueCat webhooks update the database when subscription status changes. Server-side gating uses `requirePlus()` for Plus-or-above features and `requirePro()` for Pro-only features.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `app/api/webhooks/revenuecat/route.ts` | Receives RevenueCat events, updates users.is_pro + subscriptions table | Skeleton only |
| `lib/pro-gate.ts` - `requirePro()` | Server-side check, returns 403 response if user is not Pro | Complete |
| `lib/pro-gate.ts` - `FREE_LIMITS` | Defines free tier caps (3 projects, 10 patterns, 2 PDFs/month) | Complete |
| Web checkout page | RevenueCat Billing / Stripe checkout flow | Not started |
| `GET /api/v1/subscription/status` | Returns current subscription details for the user | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `SubscriptionManager.swift` | RevenueCat SDK wrapper: configure, purchase, restore, listen | Complete (real SDK) |
| `ProGateBanner` component | Shows paywall via RevenueCatUI when user hits a limit | Complete |
| PaywallView in SettingsView | Full paywall presentation for browsing/purchasing | Complete |
| CustomerCenterView in SettingsView | Manage subscription, cancel, billing info | Complete |
| Subscription status indicator | Show Pro badge in profile/settings | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| Pricing page | Show Pro benefits and pricing | Not started |
| Checkout flow | RevenueCat Billing / Stripe integration | Not started |
| Pro badge component | Visual indicator in nav/profile | Not started |
| Subscription management page | View status, cancel, update payment | Not started |
| ProGateBanner component | Web equivalent of iOS gate banner | Not started |

### Database

| Table | Purpose |
|---|---|
| `users` | `is_pro` boolean flag checked by `requirePro()` |
| `subscriptions` | Full subscription record: store, product_id, period_type, status, expires_at, original_purchase_date |

## Implementation Checklist

- [x] RevenueCat iOS SDK integration (SubscriptionManager.swift)
- [x] SubscriptionManager: configure(), logIn(), logOut(), refresh(), purchasePro(), restorePurchases()
- [x] SubscriptionManager: listenForUpdates() for real-time status changes
- [x] PaywallView via RevenueCatUI in ProGateBanner
- [x] CustomerCenterView in SettingsView
- [x] requirePro() server-side gate
- [x] FREE_LIMITS constants
- [x] RevenueCat webhook route skeleton
- [ ] App Store Connect: create products (plus.monthly, pro.monthly, pro.yearly, pro.lifetime)
- [ ] RevenueCat dashboard: configure entitlements "Stitch Plus" and "Stitch Pro"
- [ ] RevenueCat dashboard: configure offerings and paywall template (show all three tiers)
- [ ] RevenueCat webhook handler: parse events, update users.is_pro and subscriptions table
- [ ] Handle webhook event types: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE
- [ ] Web Stripe checkout via RevenueCat Billing
- [ ] Subscription status API route
- [ ] Subscription status display on web
- [ ] Grace period handling (keep Pro active during billing retry)
- [ ] Promo codes and free trial configuration
- [ ] Restore purchases error handling and UI feedback on iOS

## Dependencies

- Authentication (001) must be complete, users must exist in DB
- App Store Connect account with products created
- RevenueCat project with iOS app and web app configured
- Stripe account connected to RevenueCat for web billing

## Pricing Plans

### Plans

| Plan | Price | Notes |
|------|-------|-------|
| Free | $0 | Generous daily-use core loop |
| Plus (monthly) | $1.99/mo | Unlimited projects, patterns, sync — no AI |
| Pro (monthly) | $4.99/mo | Everything including AI tools |
| Pro (annual) | $39.99/year | 33% off monthly Pro |
| Pro (lifetime) | $99.99 | ~20 months of monthly; appeals to older demographic |

App Store Connect product IDs:
- `com.stitchmarker.plus.monthly`
- `com.stitchmarker.pro.monthly`
- `com.stitchmarker.pro.yearly`
- `com.stitchmarker.pro.lifetime`

Lifetime purchases set `expires_at = null` and `period_type = 'lifetime'` in the subscriptions table.

### Why Three Tiers

RevenueCat data shows 38% of churned subscribers would NOT have canceled if a lower-priced tier existed. The Plus tier captures the "I just want unlimited projects and sync" user without giving away AI margin. It also creates a natural step-up path: Free → Plus → Pro.

## Reverse Trial

New users receive 14 days of full Pro access on signup. See `017-monetization-and-growth.md` §4 for details.

**Implementation:**
- On user creation: set `users.trial_ends_at = now + 14 days`, `users.is_pro = true`
- `requirePro()` must check `trial_ends_at` in addition to `is_pro`
- Cron or webhook: when `trial_ends_at` passes and no active subscription, set `is_pro = false`
- `GET /api/v1/subscription/status` returns `{ is_trial, trial_ends_at, days_remaining }` during trial
- **Critical rule:** Never delete user data created during trial

## Tier Gating

| Feature | Free | Plus ($1.99/mo) | Pro ($4.99/mo) |
|---|---|---|---|
| Row counter | Unlimited | Unlimited | Unlimited |
| Stash / needles | Unlimited | Unlimited | Unlimited |
| Social posting | Yes | Yes | Yes |
| Gauge calculator | Yes | Yes | Yes |
| Heatmap / streaks | Yes | Yes | Yes |
| Reviews | Yes | Yes | Yes |
| Ravelry first import | Yes | Yes | Yes |
| Active projects | 3 | Unlimited | Unlimited |
| Saved patterns | 15 | Unlimited | Unlimited |
| PDF parsing (AI) | 2/month | 5/month | Unlimited |
| PDF storage | 2 | 5 | Unlimited |
| Cross-device realtime | No | Yes | Yes |
| Ravelry auto re-sync | No | No | Yes |
| AI tools (other 8 routes) | No | No | Yes |
| Row instruction explainer | Yes (GPT-4o-mini) | Yes | Yes |

## Technical Notes

- Two RevenueCat entitlements: `"Stitch Plus"` and `"Stitch Pro"`. Pro includes all Plus features. SubscriptionManager checks entitlements, not product IDs.
- DB fields: `users.is_pro` (boolean) and `users.tier` (string: `"free"`, `"plus"`, `"pro"`). The `tier` field replaces the binary `is_pro` check. Migration: rename `is_pro` to `tier` or add `tier` alongside `is_pro` for backwards compatibility.
- Server-side gating needs two helpers: `requirePlus(user, 'feature')` for Plus-or-above features (unlimited projects, sync) and `requirePro(user, 'feature')` for Pro-only features (AI tools, Ravelry re-sync). Both return `null` if allowed, `NextResponse` 403 if not.
- RevenueCat webhook events include a `subscriber` object with `entitlements`. Check both entitlements' `expires_date` and `unsubscribe_detected_at` to determine tier.
- The `subscriptions` table stores `period_type` (monthly, yearly, lifetime), `store` (app_store, stripe), and `product_id` for distinguishing Plus vs Pro.
- On iOS, `SubscriptionManager` calls `logIn(appUserId)` with the Clerk user ID so RevenueCat can match the subscriber across platforms.
- On iOS, `SubscriptionManager` calls `logIn(appUserId)` with the Clerk user ID so RevenueCat can match the subscriber across platforms.
- Grace period: when RevenueCat sends BILLING_ISSUE, keep `is_pro = true` but set a `billing_issue_at` timestamp. Only revoke on EXPIRATION.
- Lifetime purchases never expire. Set `expires_at = null` and `period_type = 'lifetime'` in the subscriptions table.
