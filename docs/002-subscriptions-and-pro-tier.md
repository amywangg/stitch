# Subscriptions and Pro Tier

**Status:** Partially complete

## Problem Statement

Stitch needs a sustainable revenue model that works across iOS and web. Users should be able to upgrade to Pro for unlimited access to projects, patterns, AI parsing, social posting, and cross-device sync. The subscription must be manageable from either platform, with RevenueCat handling cross-platform entitlement tracking.

## Solution Overview

RevenueCat manages subscriptions on both platforms: StoreKit 2 on iOS, Stripe via RevenueCat Billing on web. A single entitlement ("Stitch Pro") gates all premium features. RevenueCat webhooks update the database when subscription status changes. Server-side gating uses `requirePro()` to check `users.is_pro` before allowing access to premium features.

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
- [ ] App Store Connect: create products (com.stitchmarker.pro.monthly, .yearly, .lifetime)
- [ ] RevenueCat dashboard: configure entitlement "Stitch Pro"
- [ ] RevenueCat dashboard: configure offerings and paywall template
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

## Tier Gating

| Feature | Free | Pro ($4.99/mo) |
|---|---|---|
| Active projects | 3 | Unlimited |
| Saved patterns | 10 | Unlimited |
| PDF uploads | 2/month | Unlimited |
| AI pattern parsing | No | Yes |
| Social posting | Read-only | Full access |
| Cross-device realtime | No | Yes |
| Row counter | Yes | Yes |
| Ravelry first import | Yes | Yes |
| Ravelry auto re-sync | No | Yes |

## Technical Notes

- The entitlement ID is "Stitch Pro". SubscriptionManager checks for this entitlement, not individual product IDs.
- RevenueCat webhook events include a `subscriber` object with `entitlements`. The handler should check the "Stitch Pro" entitlement's `expires_date` and `unsubscribe_detected_at` to determine status.
- The `subscriptions` table stores `period_type` (monthly, yearly, lifetime) and `store` (app_store, stripe) for analytics.
- `requirePro(user, 'feature name')` returns `null` if the user has access, or a `NextResponse` 403 if not. Always check: `const err = requirePro(user, 'name'); if (err) return err;`
- On iOS, `SubscriptionManager` calls `logIn(appUserId)` with the Clerk user ID so RevenueCat can match the subscriber across platforms.
- Grace period: when RevenueCat sends BILLING_ISSUE, keep `is_pro = true` but set a `billing_issue_at` timestamp. Only revoke on EXPIRATION.
- Lifetime purchases never expire. Set `expires_at = null` and `period_type = 'lifetime'` in the subscriptions table.
