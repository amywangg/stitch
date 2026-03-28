# Authentication and Onboarding

**Status:** Complete (iOS), partial (web)

## Problem Statement

Users need a secure, frictionless way to create accounts, sign in across iOS and web, and get oriented with the app's features. The onboarding flow should reduce churn by guiding new users through craft preferences, experience level, and optional Ravelry import before they hit the main app.

## Solution Overview

Clerk handles authentication on both platforms: iOS SDK with custom SwiftUI views, web with Clerk components and middleware. A multi-step onboarding flow runs once after first sign-up, tracked per-step in the database so users can resume if interrupted. Clerk webhooks sync user records to our database on create, update, and delete. Username is auto-generated from Clerk profile data during webhook processing.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `app/api/webhooks/clerk/route.ts` | Syncs user.created/updated/deleted to DB, auto-generates unique username | Complete |
| `lib/auth.ts` - `getDbUser(clerkId)` | Resolves Clerk ID to DB user, upserts on first call as fallback | Complete |
| `middleware.ts` | Clerk protection on `/dashboard`, `/projects`, `/api/v1`, etc. | Complete |
| `PATCH /api/v1/onboarding` | Marks onboarding steps as complete (boolean flags) | Complete |
| `GET /api/v1/onboarding` | Returns current onboarding step completion status | Complete |
| `PATCH /api/v1/users/me` | Updates profile fields: display_name, bio, avatar_url, craft_preference, knitting_style, experience_level | Complete |
| `POST /api/v1/users/me/avatar` | Upload avatar to Supabase Storage, sets avatar_source='manual' | Complete |
| `PATCH /api/v1/users/me/username` | Change username with availability check and 30-day cooldown | Complete |
| `GET /api/v1/users/me/username/check` | Check username availability with debounce | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `ClerkManager.swift` | Clerk iOS SDK wrapper, session management, token refresh | Complete |
| `KeychainManager.swift` | Stores JWT in iOS Keychain only | Complete |
| `SplashView.swift` | Animated logo, 1.8s display on launch | Complete |
| `SignInView.swift` | Dark-themed sign-in with email, password, social buttons | Complete |
| `SignUpView.swift` | Dark-themed sign-up with email, password, social buttons | Complete |
| `OnboardingView.swift` | 7-step flow (see below) | Complete |

### Database

| Table | Purpose |
|---|---|
| `users` | Core user record synced from Clerk. Includes craft_preference, knitting_style, experience_level, avatar_url, avatar_source |
| `user_onboarding` | Tracks completion of each onboarding step per user (boolean flags) |

## Onboarding Flow (7 Steps)

The flow is implemented in `OnboardingView.swift`. All steps except Welcome and Done are skippable. Progress dots at the top show where the user is.

| Step | Screen | What it does | Skippable |
|------|--------|-------------|-----------|
| 0 | **Welcome** | Personalized greeting with user's first name, app logo | No |
| 1 | **Craft preference** | Knitting / Crochet / Both → saves to `users.craft_preference` | Yes |
| 1a | **Knitting style** (sub-step) | English (throwing) / Continental (picking) — only shown for knitters. Saves to `users.knitting_style` | Yes |
| 2 | **Experience level** | Beginner / Intermediate / Advanced → saves to `users.experience_level`. Tailors tutorials and suggestions | Yes |
| 3 | **Ravelry connect** | OAuth connection with benefit list (projects, stash, queue, friends). Opens `ASWebAuthenticationSession` | Yes ("I'll do this later") |
| 4 | **Measurements** | Body measurements form (bust, waist, hip, arm length, etc.) with quick-size picker and cm/inches toggle | Yes ("Set up later") |
| 5 | **First project** | "I have a pattern in mind" vs "Just exploring for now" — sets intent | Yes |
| 6 | **Done** | Checkmark animation + 3 quick-start hints (tap + on Projects, discover patterns, try voice commands) | No |

### Design Details

- Dark theme (forced `.preferredColorScheme(.dark)`)
- Coral-to-orange gradient on app icon
- Animated progress dots (current step wider, completed steps filled)
- Each selectable option is a card with emoji/icon, title, subtitle, and chevron
- Onboarding steps persisted to `user_onboarding` table via `PATCH /api/v1/onboarding`
- User preferences persisted to `users` table via `PATCH /api/v1/users/me`
- Local preferences cached in `UserDefaults` for instant access (craft_preference, knitting_style)
- Clerk-generated username — no username step in onboarding (username auto-derived from Clerk profile during webhook)

### Features Step (Removed)

The previous swipeable feature highlights step was removed in favor of quick-start hints on the Done screen. Users learn features by doing, not reading.

## Implementation Checklist

- [x] Clerk iOS SDK integration (ClerkManager.swift)
- [x] iOS Keychain token storage
- [x] SplashView with animated logo
- [x] iOS SignInView (email + password + social)
- [x] iOS SignUpView (email + password + social)
- [x] iOS 7-step OnboardingView with progress dots
- [x] Craft preference step with knitting style sub-step
- [x] Experience level step
- [x] Ravelry connect step
- [x] Measurements step with quick-size picker
- [x] First project intent step
- [x] Done step with quick-start hints
- [x] Clerk webhook route (user.created/updated/deleted)
- [x] getDbUser() with upsert fallback
- [x] Web middleware protecting routes
- [x] user_onboarding DB table
- [x] Onboarding API routes (PATCH + GET)
- [x] Avatar upload to Supabase Storage with avatar_source tracking
- [x] Username availability check API
- [x] Profile fields: craft_preference, knitting_style, experience_level
- [ ] Web sign-in page with custom Clerk styling
- [ ] Web sign-up page with custom Clerk styling
- [ ] Web onboarding wizard

## Avatar Resolution

The avatar follows this priority chain:

1. **Manual upload** — user uploads via Edit Profile → stored in Supabase Storage, `avatar_source = 'manual'`
2. **Ravelry photo** — fetched from Ravelry API during sync or profile-summary load, `avatar_source = 'ravelry'`
3. **Placeholder** — system person icon when no avatar exists

Ravelry sync only overwrites the avatar when `avatar_source !== 'manual'`, preserving user-uploaded photos.

## Dependencies

- Clerk account with iOS + web apps configured
- Clerk webhook endpoint registered in Clerk dashboard
- Supabase Storage bucket for avatar uploads (`avatars` bucket)
- Ravelry OAuth app with `app-write` scope for the connect step

## Tier Gating

Authentication and onboarding are available to all users. No Pro gating.

## Technical Notes

- Clerk iOS SDK uses `ClerkManager.shared.sessionToken()` to get JWTs, which `APIClient` attaches as Bearer tokens automatically
- The webhook route verifies Clerk's `svix` signature before processing events
- `getDbUser()` has an upsert fallback so the app does not break if a webhook is delayed
- Onboarding steps are tracked individually so a user who kills the app mid-flow can resume
- iOS tokens must never be stored in UserDefaults — KeychainManager is the only approved storage
- Quick sync with Ravelry runs silently on login (see 005-ravelry-sync.md)
- Notification polling starts on login (see 019-smart-notifications.md)
