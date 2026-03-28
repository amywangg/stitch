# Social Feed and Activity

**Status:** Complete (iOS + API)

## Problem Statement

Users want to share their knitting progress with friends and see what others are making. Without a social layer, the app is purely a personal tool with no community engagement. A Goodreads/Letterboxd-style activity feed turns solitary crafting into a shared experience.

## Solution Overview

Auto-generated activity events capture user actions (starting a project, finishing, saving a pattern, hitting row milestones, logging sessions). Users can also write manual posts with photos, linked projects/patterns, tagged yarns/needles, and session data. Everything is commentable and likeable. A chronological feed shows activity from followed users.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/social/feed` | Aggregated feed (posts + activity events from followed users), cursor-paginated | Complete |
| `POST /api/v1/social/posts` | Create post with photos, project/pattern links, yarns, session data. Notifies all followers | Complete |
| `GET /api/v1/social/posts/[id]` | Get post with comments, likes, photos | Complete |
| `DELETE /api/v1/social/posts/[id]` | Soft delete post | Complete |
| `POST /api/v1/social/posts/[id]/like` | Toggle like on post. Creates notification for post owner | Complete |
| `POST /api/v1/social/posts/photo` | Upload post photo to Supabase Storage | Complete |
| `POST /api/v1/social/activity/[id]/like` | Toggle like on activity event. Creates notification | Complete |
| `POST /api/v1/social/comments` | Add comment on post or activity event. Creates notification | Complete |
| `DELETE /api/v1/social/comments/[id]` | Soft delete comment | Complete |
| `POST /api/v1/social/follow` | Follow user. Creates follow notification | Complete |
| `DELETE /api/v1/social/follow` | Unfollow user | Complete |
| `GET /api/v1/social/followers` | Paginated follower list with follow-back status | Complete |
| `GET /api/v1/social/following` | Paginated following list | Complete |
| `GET /api/v1/social/users/search` | Search users by username or display name | Complete |
| `GET /api/v1/social/friends/ravelry` | Cross-reference Ravelry friends with Stitch users | Complete |
| `GET /api/v1/social/notifications` | Paginated notifications with unread count | Complete |
| `PATCH /api/v1/social/notifications/read` | Mark specific or all notifications read | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `FeedView` | Scrollable feed with tab picker (For You / Following), bell icon with badge | Complete |
| `ComposePostView` | Polywork-style compose: photo carousel, text, suggested projects, add context (yarn/needle/session), auto-populate from project | Complete |
| `PostCard` / `ActivityCard` | Feed item rendering with like, comment, share | Complete |
| `CommentsView` | Bottom sheet for viewing/adding comments | Complete |
| `FindFriendsView` | Search users + Ravelry friends (on Stitch with follow, not on Stitch with invite) | Complete |
| `FollowListView` | Separate followers and following lists with follow/follow-back buttons | Complete |
| `NotificationsView` | Notification inbox with tap-to-mark-read, mark all read | Complete |
| `NotificationService` | Shared singleton polling unread count every 30s, powers tab badge | Complete |

### Compose Post Flow

The compose view (`ComposePostView`) follows a Polywork/Threads-inspired design:

1. **Photos** — Instagram-style carousel with swipe. Dashed placeholder when empty. Up to 4 photos.
2. **Text** — Auto-focused text field, character limit shown near 2000.
3. **"Working on" suggestions** — Horizontal chips of user's active projects. Tapping auto-populates project, pattern, yarns, and needles.
4. **Attached context cards** — Rich cards for project, pattern, yarns, needles, session time. Each removable with X.
5. **"Add context" section** — Row actions: Link project (picker), Add yarn (stash picker), Add needle (picker), Log session time.
6. **Post button** — Coral capsule pinned to bottom bar.

When a project is attached, its linked pattern, yarns, and needles are auto-populated. Detaching the project clears all auto-populated context.

### Notification Types

| Type | Created by | iOS display |
|------|-----------|-------------|
| `follow` | `POST /social/follow` | "X started following you" |
| `like` | `POST /social/posts/[id]/like`, `POST /social/activity/[id]/like` | "X liked your post/activity" |
| `comment` | `POST /social/comments` | "X commented on your post/activity" |
| `new_post` | `POST /social/posts` (notifies all followers) | "X shared a new post" |
| `pattern_sold` | Stripe webhook | Custom message with pattern title |
| `mention` | Not yet implemented | "X mentioned you" |

### Find Friends

- **Search** — text search by username, instant results
- **Ravelry friends on Stitch** — fetches full Ravelry friend list, cross-references against `ravelry_connections`, shows follow button
- **Ravelry friends not on Stitch** — shows invite button with personalized share message
- **Share Stitch** — general invite link at bottom

### Followers / Following Lists

Separate views for followers and following:
- Followers list includes `isFollowing` (follow-back status) so users can follow back
- Following list shows all followed users with unfollow button
- Both use `FollowListView(type: .followers/.following)`

## Activity Events (Auto-Generated)

Created automatically by API routes when users take actions:

| Event type | Trigger |
|---|---|
| `project_started` | POST /projects, POST /projects/create-from-pattern |
| `project_completed` | PATCH /projects/:id (status → completed) |
| `project_frogged` | PATCH /projects/:id (status → frogged) |
| `pattern_saved` | POST /ravelry/patterns/save |
| `pattern_queued` | POST /queue |
| `review_posted` | POST /patterns/:id/reviews |
| `stash_added` | POST /stash |
| `row_milestone` | Counter increment (at rows 50, 100, 250, 500, 1000) |
| `session_logged` | POST /sessions |

## Content Moderation

- **Text** — OpenAI moderation API (free, fast) for NSFW/hate + GPT-4o-mini for craft-relevance
- **Images** — GPT-4o-mini vision. Only rejects NSFW, violence, hate, illegal content. Flowers, pets, selfies, food are all allowed.

## Tier Gating

All social features are free. No Pro gate on posting, liking, commenting, or following.

## Technical Notes

- Feed uses cursor-based pagination for consistent ordering
- Notifications polled every 30 seconds via `NotificationService.shared`
- Unread badge shown on Feed tab and bell icon (changes to `bell.badge.fill` when unread)
- Post photos uploaded to `post-photos` Supabase Storage bucket
- Activity events link to project and/or pattern via FK
- Polymorphic comments and likes (post_id OR activity_event_id, exactly one set)
