# User Profiles

**Status:** Not started

## Problem Statement

Users need public profiles to participate in the social layer. The social feed (006) references profile pages, the heatmap (007) lives on profiles, and follows/followers need a destination page. Without profiles, the community features have no anchor.

## Solution Overview

Each user has a public profile accessible by username. Profiles display the user's avatar, display name, bio, crafting heatmap, recent projects, reviews, and follower/following counts. Users can edit their own profile (display name, bio, avatar). Other users can follow/unfollow from the profile page.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/users/:username` | Public profile data: display_name, avatar_url, bio, project count, review count, follower/following counts, member_since | Not started |
| `PATCH /api/v1/users/me` | Update own display_name, bio, avatar_url | Not started |
| `POST /api/v1/users/me/avatar` | Upload avatar to Supabase Storage | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `ProfileView.swift` | Own profile with edit button, heatmap, recent activity | Not started |
| `UserProfileView.swift` | Other user's profile with follow button | Not started |
| `EditProfileView.swift` | Edit display name, bio, avatar (camera + library picker) | Not started |
| `ProfileViewModel.swift` | Load profile data, follow/unfollow, upload avatar | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/profile/[username]/page.tsx` | Public profile page | Not started |
| `(app)/settings/profile/page.tsx` | Edit own profile | Not started |
| `ProfileHeader` component | Avatar, name, bio, follow button, stats | Not started |
| `ProfileActivity` component | Tabs: projects, reviews, activity | Not started |

### Database

Uses existing `users` table fields: `display_name`, `avatar_url`, `bio` (add `bio` column if not present). No new tables.

## Implementation Checklist

- [ ] Add `bio` field to users table if not present
- [ ] Add `username` field to users table (unique, URL-safe, derived from display_name or email)
- [ ] API route: get public profile by username
- [ ] API route: update own profile
- [ ] API route: avatar upload to Supabase Storage
- [ ] iOS ProfileView (own profile)
- [ ] iOS UserProfileView (other user's profile with follow button)
- [ ] iOS EditProfileView with avatar picker
- [ ] iOS ProfileViewModel
- [ ] Web profile page with username routing
- [ ] Web profile edit in settings
- [ ] Integrate heatmap (007) into profile page
- [ ] Integrate recent projects into profile page
- [ ] Integrate reviews into profile page
- [ ] Integrate follower/following counts and lists

## Dependencies

- Authentication (001) for user identity
- Social Feed (006) for follows, activity events
- Crafting Activity Heatmap (007) for profile heatmap display
- Pattern Reviews (008) for review list on profile
- Supabase Storage bucket for avatar uploads

## Tier Gating

Free for all users. Profiles are a core social feature that drives engagement and organic growth.

## Monetization Role

Profiles anchor the social layer. Pro users get a Pro badge on their profile, which serves as social proof and aspiration for free users. The profile page surfaces Pro-only features (AI insights, richer project cards) that free users can see but not access, driving content-desire conversion.

## Technical Notes

- Usernames should be auto-generated from display_name (lowercase, hyphenated) with a uniqueness suffix if needed. Allow users to customize.
- Avatar storage path: `avatars/{userId}.jpg` in Supabase Storage. Resize to 256x256 on upload.
- The profile endpoint should aggregate counts efficiently. Consider denormalized counters on the users table if query performance becomes an issue.
- Profile pages should be accessible without authentication (public profiles), but follow actions require auth.
