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

## Technical Notes

- Clerk iOS SDK uses `ClerkManager.shared.sessionToken()` to get JWTs, which `APIClient` attaches as Bearer tokens automatically.
- The webhook route verifies Clerk's `svix` signature before processing events. The `CLERK_WEBHOOK_SECRET` env var is required.
- `getDbUser()` has an upsert fallback so the app does not break if a webhook is delayed or missed. This means the first API call from a new user may be slightly slower.
- Onboarding steps are tracked individually so a user who kills the app mid-flow can resume where they left off.
- iOS tokens must never be stored in UserDefaults. KeychainManager is the only approved storage.
