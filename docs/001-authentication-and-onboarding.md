# Authentication and Onboarding

**Status:** Partially complete

## Problem Statement

Users need a secure, frictionless way to create accounts, sign in across iOS and web, and get oriented with the app's features. The onboarding flow should reduce churn by guiding new users through craft preferences, feature highlights, and optional Ravelry import before they hit the main app.

## Solution Overview

Clerk handles authentication on both platforms: iOS SDK with custom SwiftUI views, web with Clerk components and middleware. A multi-step onboarding flow runs once after first sign-up, tracked per-step in the database so users can resume if interrupted. Clerk webhooks sync user records to our database on create, update, and delete.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `app/api/webhooks/clerk/route.ts` | Syncs user.created, user.updated, user.deleted events to DB | Complete |
| `lib/auth.ts` - `getDbUser(clerkId)` | Resolves Clerk ID to DB user, upserts on first call as fallback | Complete |
| `middleware.ts` | Clerk protection on `/dashboard`, `/projects`, `/api/v1`, etc. | Complete |
| Web sign-in page (`(auth)/sign-in`) | Clerk `<SignIn />` with custom styling | Not started |
| Web sign-up page (`(auth)/sign-up`) | Clerk `<SignUp />` with custom styling | Not started |
| `POST /api/v1/onboarding/complete-step` | Marks an onboarding step as complete | Not started |
| `GET /api/v1/onboarding/status` | Returns which onboarding steps are done | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `ClerkManager.swift` | Clerk iOS SDK wrapper, session management, token refresh | Complete (real SDK) |
| `KeychainManager.swift` | Stores JWT in iOS Keychain only | Complete |
| `SplashView.swift` | Animated logo, 1.8s display on launch | Complete |
| `SignInView.swift` | Dark-themed sign-in with email, password, social buttons | Complete |
| `SignUpView.swift` | Dark-themed sign-up with email, password, social buttons | Complete |
| `OnboardingView.swift` | 5-step flow: Welcome, Craft preference, Features, Ravelry, Done | Complete |
| Forgot password flow | Email-based password reset | Not started |
| Deep link handler for email verification | Handle Clerk verification links | Not started |
| Profile completion screen | Avatar, display name, bio after onboarding | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(auth)/sign-in/page.tsx` | Custom-styled Clerk sign-in | Not started |
| `(auth)/sign-up/page.tsx` | Custom-styled Clerk sign-up | Not started |
| Email verification page | Post-registration verification | Not started |
| Onboarding wizard component | Web equivalent of iOS onboarding | Not started |
| Profile completion page | Avatar, display name, bio | Not started |

### Database

| Table | Purpose |
|---|---|
| `users` | Core user record synced from Clerk (clerk_id, email, display_name, avatar_url, is_pro) |
| `user_onboarding` | Tracks completion of each onboarding step per user |

## Implementation Checklist

- [x] Clerk iOS SDK integration (ClerkManager.swift)
- [x] iOS Keychain token storage
- [x] SplashView with animated logo
- [x] iOS SignInView (email + password + social)
- [x] iOS SignUpView (email + password + social)
- [x] iOS 5-step OnboardingView
- [x] Clerk webhook route (user.created/updated/deleted)
- [x] getDbUser() with upsert fallback
- [x] Web middleware protecting routes
- [x] user_onboarding DB table
- [ ] Web sign-in page with custom Clerk styling
- [ ] Web sign-up page with custom Clerk styling
- [ ] Web email verification flow
- [ ] iOS forgot password flow
- [ ] iOS deep link handling for email verification
- [ ] Onboarding API routes (complete-step, status)
- [ ] Web onboarding wizard
- [ ] Profile completion flow (iOS + web)
- [ ] Avatar upload to Supabase Storage

## Dependencies

- Clerk account with iOS + web apps configured
- Clerk webhook endpoint registered in Clerk dashboard
- Supabase Storage bucket for avatar uploads (profile completion)

## Tier Gating

Authentication and onboarding are available to all users. No Pro gating.

## Onboarding Strategy (Monetization-Aligned)

The onboarding flow must achieve **activation in the first session**: user creates a project + increments the counter at least once. 63% of users consider onboarding a key factor in their subscription decision.

### Recommended First-Session Flow

1. **Welcome** — "What do you love to make?" (knitting/crochet/both) + experience level (beginner/intermediate/advanced)
2. **Quick win** — "Let's set up your first project." Guide them to create a project with a title and yarn
3. **Core loop** — show the row counter, have them tap it once. They've now used the #1 daily feature
4. **Data investment** — "Want to import your Ravelry stash?" (if they use Ravelry) or "Add your first yarn to your stash" (if not)
5. **Pro taste** — show one AI feature in action (e.g., auto-suggest patterns for their stash yarn) with a "Pro trial" badge
6. **Done** — they have a project, a row count, and stash data. They're invested.

### Rules

- Never show a paywall before the activation moment
- No tutorial screens — learn by doing
- 2-3 personalization questions max
- First session ends with something the user made (a project card, a row count, a saved pattern)

### Reverse Trial Integration

On signup, the user automatically receives 14 days of full Pro access. The onboarding flow should surface Pro features naturally during this window. See `002-subscriptions-and-pro-tier.md` for reverse trial implementation and `017-monetization-and-growth.md` §4-5 for strategy.

### Activation Tracking

Track the activation metric: "created project + incremented counter at least once." This metric is the primary indicator of retention and should feed into analytics (see analytics requirements in `FEATURE-GAPS.md`).

## Technical Notes

- Clerk iOS SDK uses `ClerkManager.shared.sessionToken()` to get JWTs, which `APIClient` attaches as Bearer tokens automatically.
- The webhook route verifies Clerk's `svix` signature before processing events. The `CLERK_WEBHOOK_SECRET` env var is required.
- `getDbUser()` has an upsert fallback so the app does not break if a webhook is delayed or missed. This means the first API call from a new user may be slightly slower.
- Onboarding steps are tracked individually so a user who kills the app mid-flow can resume where they left off.
- iOS tokens must never be stored in UserDefaults. KeychainManager is the only approved storage.
- On user creation (Clerk webhook or `getDbUser` upsert): set `users.trial_ends_at = now + 14 days`, `users.is_pro = true` to activate the reverse trial.
