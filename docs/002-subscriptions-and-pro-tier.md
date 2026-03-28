# Subscriptions and Pro Tier

**Status:** Complete (iOS SDK + server gating + custom paywall)

## Problem Statement

Stitch needs a sustainable revenue model that works across iOS and web. Users can upgrade to Plus ($1.99/mo) for unlimited projects, patterns, and cross-device sync, or to Pro ($4.99/mo) for all Plus features plus AI tools, unlimited PDFs, and Ravelry auto-sync. Subscriptions must be manageable from either platform, with RevenueCat handling cross-platform entitlement tracking.

## Solution Overview

RevenueCat manages subscriptions on both platforms: StoreKit 2 on iOS, Stripe via RevenueCat Billing on web. Two entitlements — "Stitch Plus" and "Stitch Pro" — gate features at different levels. RevenueCat webhooks update the database when subscription status changes. Server-side gating uses `requirePlus()` for Plus-or-above features and `requirePro()` for Pro-only features.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `app/api/webhooks/revenuecat/route.ts` | Receives RevenueCat events, updates users.is_pro + subscriptions table | Complete |
| `lib/pro-gate.ts` - `requirePro()` | Server-side check, returns 403 with PRO_REQUIRED if not Pro | Complete |
| `lib/pro-gate.ts` - `requirePlus()` | Server-side check for Plus-or-above features | Complete |
| `lib/pro-gate.ts` - `requireCapacity()` | Checks usage against tier limits (PDF parses/month, etc.) | Complete |
| `lib/pro-gate.ts` - `TIER_LIMITS` | Centralized tier limit config for free/plus/pro | Complete |
| `lib/pro-gate.ts` - `getUserTier()` | Derives tier from subscription.plan | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `SubscriptionManager.swift` | RevenueCat SDK wrapper: configure, logIn, logOut, refresh, purchase, restore, listenForUpdates | Complete |
| `SubscriptionManager.tier` | Computed tier (.free / .plus / .pro) from entitlements | Complete |
| `StitchPaywallView.swift` | Custom paywall with Plus/Pro tier picker, feature list, pricing cards, purchase flow | Complete |
| `ProGateBanner.swift` | Crown icon + "Upgrade to Pro" button, presents StitchPaywallView | Complete |
| CustomerCenterView in SettingsView | RevenueCat-managed subscription management UI | Complete |
| Pro badge in profile header | Gold ring around avatar for Pro users | Complete |

### Custom Paywall (StitchPaywallView)

All paywall presentations use `StitchPaywallView()` (not RevenueCat's default `PaywallView()`). Features:

- **Tier picker** — Plus / Pro segmented control at top
- **Feature list** — checkmarks for included features, minus for excluded, dynamically updates per tier
- **Pricing cards** — yearly (with savings %) and monthly options side by side
- **Purchase button** — "Subscribe to Pro yearly" with loading state
- **Restore purchases** — link below purchase button
- **Legal text** — auto-renewal terms

### Pro-Gated Entry Points

| Feature | Where gated | Gate type |
|---|---|---|
| AI pattern builder | PatternsView menu button | `subscriptions.isPro` → StitchPaywallView |
| AI PDF parsing | StartPatternFlowView, PDFParseFlowView | `subscriptions.isPro` → StitchPaywallView |
| AI parse prompt on project | ProjectDetailView, CounterView | `subscriptions.isPro` → StitchPaywallView |
| AI tools (8 routes) | Server-side `requirePro()` | 403 PRO_REQUIRED |
| PDF parsing over limit | Server-side `requireCapacity()` | 403 FREE_LIMIT_REACHED |
| Active projects over limit | Server-side `requireCapacity()` | 403 FREE_LIMIT_REACHED |

## Tier Gating

| Feature | Free | Plus ($1.99/mo) | Pro ($4.99/mo) |
|---|---|---|---|
| Row counter | Unlimited | Unlimited | Unlimited |
| Stash / needles | Unlimited | Unlimited | Unlimited |
| PDF storage | **Unlimited** | Unlimited | Unlimited |
| Social posting | Yes | Yes | Yes |
| Pattern marketplace (buy/sell) | Yes | Yes | Yes |
| Reviews & ratings | Yes | Yes | Yes |
| Active projects | 3 | Unlimited | Unlimited |
| Saved patterns | 15 | Unlimited | Unlimited |
| PDF parsing (AI) | 2/month | 5/month | Unlimited |
| Cross-device realtime | No | Yes | Yes |
| AI tools (8 routes) | No | No | Yes |
| AI pattern builder | No | No | Yes |
| Ravelry auto re-sync | No | No | Yes |
| Row instruction explainer | Yes (GPT-4o-mini) | Yes | Yes |

**Note:** PDF storage was made unlimited for all tiers. Only AI *parsing* of PDFs is gated.

## Pricing Plans

| Plan | Price |
|------|-------|
| Free | $0 |
| Plus (monthly) | $1.99/mo |
| Pro (monthly) | $4.99/mo |
| Pro (annual) | $34.99/year (save 42%) |
| Pro (lifetime) | $99.99 |

## RevenueCat Configuration

### Required Setup (RevenueCat Dashboard)

1. **Products** — Import from App Store Connect: `stitch_monthly`, `stitch_yearly`, `stitch_lifetime`
2. **Entitlements** — Create `Stitch Pro` (all 3 products) and `Stitch Plus` (plus products)
3. **Offerings** — Default offering with `$rc_monthly`, `$rc_annual`, `$rc_lifetime` packages
4. **API Key** — `test_wtNabmgUgQDoADuIhIGYnEuaFmp` (configured in `AppConfig.revenueCatAPIKey`)

### RevenueCat SDK Integration

- Configured in `StitchApp.init()` → `SubscriptionManager.shared.configure()`
- User associated via `logIn(userId)` when Clerk auth completes (in RootView `.task(id: clerk.user?.id)`)
- Entitlement stream listened via `listenForUpdates()` for real-time tier changes
- `SubscriptionManager.shared.tier` checked by `subscriptions.isPro` / `subscriptions.isPlusOrAbove` in views

## Technical Notes

- Two RevenueCat entitlements: `"Stitch Plus"` and `"Stitch Pro"`. Pro includes all Plus features
- `SubscriptionManager` checks entitlements in order: Pro first, then Plus, else free
- Server-side uses `subscription.plan` column: `"free"` | `"plus"` | `"pro"`
- `users.is_pro` boolean kept for backward compatibility, synced from webhook
- On iOS, `logIn(appUserId)` uses the Clerk user ID for cross-platform matching
- All paywall presentations use `StitchPaywallView()` — never RevenueCat's default `PaywallView()`
- `CustomerCenterView()` from RevenueCatUI is used only in SettingsView for subscription management
