# User Profiles

**Status:** Complete

## Problem Statement

Users need public profiles to participate in the social layer. The social feed references profile pages, the heatmap lives on profiles, and follows/followers need a destination page.

## Solution Overview

Each user has a profile accessible from the Profile tab. Profiles display avatar, display name, bio, crafting heatmap, recent projects, queue, saved patterns, stash breakdown, needle collection, recent reviews, badges, and follower/following counts. Users can edit their own profile. Tapping followers/following navigates to dedicated list views.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/users/me/profile-summary` | Comprehensive profile data: user info, stats, projects, stash, heatmap, reviews, queue, saved patterns, needles, ravelry, subscription | Complete |
| `PATCH /api/v1/users/me` | Update display_name, bio, avatar_url, craft_preference, knitting_style, experience_level | Complete |
| `POST /api/v1/users/me/avatar` | Upload avatar to Supabase Storage, sets avatar_source='manual' | Complete |
| `PATCH /api/v1/users/me/username` | Change username with availability check and cooldown | Complete |
| `GET /api/v1/users/me/username/check` | Check username availability | Complete |
| `GET /api/v1/users/me/activity-sharing` | Get activity sharing preferences | Complete |
| `PATCH /api/v1/users/me/activity-sharing` | Update activity sharing preferences | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `ProfileView.swift` | Main profile with all sections, navigation destinations for stash/needles/followers/following | Complete |
| `ProfileHeader.swift` | Avatar (tappable with camera icon), name, bio, metadata chips (craft, experience, location, join date), edit/find friends buttons | Complete |
| `ProfileStatsGrid.swift` | 4-cell grid: projects, finished, followers (→FollowListView), following (→FollowListView) | Complete |
| `ProfileProjectsGrid.swift` | Horizontal scroll of recent projects with cover images (user photos → pattern cover fallback) and status pills | Complete |
| `ProfileBadges.swift` | 16 achievement badges computed from profile data, earned as horizontal scroll + locked in collapsible section | Complete |
| `ProfileViewModel.swift` | Loads profile-summary API, all profile models | Complete |
| `EditProfileSheet` | Form: avatar picker, username, display name, bio with save | Complete |
| `FollowListView.swift` | Separate followers/following lists with follow-back buttons | Complete |

### Badges System

16 achievement badges computed client-side from existing profile data (no extra API calls):

| Badge | Requirement |
|---|---|
| Ravelry linked | Connected Ravelry account |
| Pro member | Active subscription |
| First FO | 1 completed project |
| 5 / 10 / 25 projects done | Milestone completions |
| Stash started | 1 stash item |
| Yarn collector | 20+ stash items |
| Made a friend | Following 1+ person |
| 10 followers | 10+ followers |
| Pattern reviewer | 1+ review |
| 10 / 100 hours crafted | Crafting time this year |
| 7-day / 30-day streak | Consecutive crafting days from heatmap |
| Queue planner | 3+ queued patterns |
| Pattern collector | 10+ saved patterns |

Earned badges show as colored chips. Unearned show grayed in a collapsible "X more to earn" section.

### Avatar Resolution

Priority chain:
1. **Manual upload** — `avatar_source = 'manual'`, stored in Supabase Storage
2. **Ravelry photo** — `avatar_source = 'ravelry'`, fetched from Ravelry API and backfilled on profile load
3. **Placeholder** — system person icon

The profile-summary route auto-backfills from Ravelry if avatar is null and Ravelry is connected.

### Profile Sections

All visible on the Profile tab in order:
1. Header (avatar, name, bio, chips)
2. Stats grid (projects, finished, followers, following)
3. **Badges** (earned achievements)
4. Crafting heatmap (52-week activity calendar)
5. Recent projects (horizontal scroll with covers)
6. Queue preview
7. Saved patterns preview
8. Yarn stash breakdown (bar chart by weight)
9. Needles & hooks breakdown
10. Recent reviews
11. Recent activity
12. Ravelry connection status

### Navigation from Profile

| Tap target | Destination |
|---|---|
| Avatar / "Edit profile" | EditProfileSheet |
| "Find friends" button | FindFriendsView |
| Followers count | FollowListView(type: .followers) |
| Following count | FollowListView(type: .following) |
| "View all" on stash | StashView |
| "View all" on needles | NeedlesView |
| Project card | ProjectDetailView |
| Stash item | StashItemDetailView |
| Settings gear | SettingsView |

## Tier Gating

Profiles are free for all users. Pro users get a gold ring around their avatar.

## Technical Notes

- Profile data loaded via single `GET /api/v1/users/me/profile-summary` (parallel DB queries)
- Heatmap shows 52 weeks of crafting_sessions grouped by date
- Badge computation uses `longestStreak()` function that calculates consecutive days from heatmap data
- Craft label handles both "crocheting" (from onboarding) and "crochet" (from Ravelry import)
- Profile cover photos fall back: user photos → pattern cover → placeholder icon
