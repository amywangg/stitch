# Social Feed and Activity

**Status:** Schema complete, no UI or API

## Problem Statement

Users want to share their knitting progress with friends and see what others are making. Without a social layer, the app is purely a personal tool with no community engagement or discovery. A Goodreads/Letterboxd-style activity feed turns solitary crafting into a shared experience.

## Solution Overview

Auto-generated activity events capture user actions (starting a project, finishing, saving a pattern, hitting row milestones, logging sessions). Users can also write manual posts with photos. Everything is commentable and likeable with emoji reactions. A chronological feed shows activity from followed users.

## Key Components

### Backend (Next.js API)

- `POST /api/v1/posts` - create a post with optional photos and project link. **Not started.**
- `GET /api/v1/posts` - paginated post list (own + followed users). **Not started.**
- `PATCH /api/v1/posts/:id` - edit post content. **Not started.**
- `DELETE /api/v1/posts/:id` - soft delete. **Not started.**
- `GET /api/v1/feed` - aggregated feed of posts + activity_events from followed users, reverse chronological, paginated. **Not started.**
- `POST /api/v1/follows/:userId` - follow a user. **Not started.**
- `DELETE /api/v1/follows/:userId` - unfollow. **Not started.**
- `GET /api/v1/users/:id/followers` - paginated follower list. **Not started.**
- `GET /api/v1/users/:id/following` - paginated following list. **Not started.**
- `POST /api/v1/comments` - add comment to post or activity_event (polymorphic, exactly one parent). **Not started.**
- `DELETE /api/v1/comments/:id` - soft delete. **Not started.**
- `POST /api/v1/likes` - like/react to post or activity_event. **Not started.**
- `DELETE /api/v1/likes/:id` - remove like. **Not started.**
- `POST /api/v1/bookmarks/:postId` - bookmark a post. **Not started.**
- `DELETE /api/v1/bookmarks/:postId` - remove bookmark. **Not started.**
- `GET /api/v1/notifications` - paginated notifications. **Not started.**
- `PATCH /api/v1/notifications/read` - mark notifications as read. **Not started.**
- Activity event auto-creation hooks in project/pattern/counter routes. **Not started.**
- Notification creation on follow, like, comment, mention. **Not started.**

### iOS (SwiftUI)

- `FeedView` - scrollable feed of posts and activity events from followed users. **Not started.**
- `PostComposerView` - write a post, attach photos, link a project. **Not started.**
- `PostDetailView` - full post with comments and reactions. **Not started.**
- `ActivityEventCard` - render different event types (project started, completed, milestone, etc.). **Not started.**
- `CommentsSheet` - bottom sheet for viewing/adding comments. **Not started.**
- `ReactionPicker` - emoji reaction bar (heart, fire, yarn, clap, heart-eyes). **Not started.**
- `FollowersView` / `FollowingView` - user lists. **Not started.**
- `NotificationsView` - notification inbox with unread badge on tab. **Not started.**
- `FeedViewModel`, `PostViewModel`, `NotificationsViewModel`. **Not started.**

### Web (Next.js)

- `(app)/feed/page.tsx` - feed page with infinite scroll. **Not started.**
- `(app)/post/[id]/page.tsx` - post detail with comments. **Not started.**
- `components/features/feed/` - FeedItem, ActivityEventCard, PostCard, CommentList, ReactionBar. **Not started.**
- `(app)/notifications/page.tsx` - notification inbox. **Not started.**
- `(app)/profile/[username]/page.tsx` - profile with follow button and activity tab. **Not started.**

### Database

- `activity_events` - auto-generated events (project_started, project_completed, project_frogged, pattern_saved, pattern_queued, review_posted, stash_added, row_milestone, session_logged). Links to project/pattern with metadata JSON.
- `posts` - user-written content with soft deletes.
- `post_photos` - multiple photos per post with sort order.
- `comments` - polymorphic on post_id OR activity_event_id (exactly one parent set).
- `likes` - polymorphic on post_id OR activity_event_id. Optional reaction field for emoji reactions.
- `follows` - follower/following with unique constraint.
- `post_bookmarks` - saved posts.
- `notifications` - type, resource_type, resource_id, optional message, read flag.

## Implementation Checklist

- [x] Database schema for all social tables (activity_events, posts, post_photos, comments, likes, follows, post_bookmarks, notifications)
- [x] Indexes on created_at for feed queries, user_id for ownership
- [x] Polymorphic comments and likes (post OR activity_event)
- [x] Unique constraints on follows and likes
- [ ] Feed API route with pagination (posts + activity_events interleaved by date)
- [ ] Posts CRUD API routes
- [ ] Follow/unfollow API routes
- [ ] Comments CRUD API routes
- [ ] Likes/reactions API routes
- [ ] Bookmarks API routes
- [ ] Notifications API routes
- [ ] Activity event auto-creation in project routes (on create, complete, frog)
- [ ] Activity event auto-creation in pattern routes (on save, queue)
- [ ] Activity event auto-creation in counter routes (on milestone)
- [ ] Activity event auto-creation in crafting session routes (on log)
- [ ] Activity event auto-creation in review routes (on post review)
- [ ] Notification triggers (follow, like, comment, mention)
- [ ] Photo upload to Supabase Storage for posts
- [x] ~~Pro gate on post creation~~ — removed, posting is free for all users
- [ ] iOS FeedView with mixed post/event cards
- [ ] iOS PostComposerView with photo picker
- [ ] iOS PostDetailView with comments
- [ ] iOS ReactionPicker
- [ ] iOS NotificationsView with badge
- [ ] iOS FollowersView / FollowingView
- [ ] Web feed page with infinite scroll
- [ ] Web post detail page
- [ ] Web notifications page
- [ ] Web profile page with follow button

## Dependencies

- Auth (Clerk) - required for user identity and follow relationships
- Supabase Storage - required for post photo uploads
- Project and pattern routes - must emit activity events on state changes
- Counter routes - must emit milestone events
- Crafting sessions - must emit session_logged events
- Pattern reviews - must emit review_posted events

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| View feed | Yes | Yes |
| Follow users | Yes | Yes |
| Like/react | Yes | Yes |
| Comment | Yes | Yes |
| Create posts | Yes | Yes |
| Bookmark posts | Yes | Yes |

All social features are free for all users. Community participation drives daily visits, organic growth, and word-of-mouth. Activity events are generated for all users regardless of tier. See `017-monetization-and-growth.md` §3 for rationale.

## Technical Notes

- The feed query must interleave `posts` and `activity_events` from followed users, sorted by `created_at` descending. Use a UNION-style approach or two separate queries merged client-side.
- Comments and likes are polymorphic: exactly one of `post_id` or `activity_event_id` must be non-null. Enforce this at the API layer since Prisma does not support database-level check constraints.
- Reactions use a nullable `reaction` field. Null means a simple like. Non-null values are emoji identifiers (fire, yarn, heart, clap, heart-eyes). The unique constraint on `[user_id, activity_event_id, reaction]` allows one reaction of each type per user.
- Activity events should be created in the same transaction as the triggering action to avoid orphaned events.
- Row milestones should fire at configurable thresholds (e.g., every 100 rows, or at 50, 100, 250, 500, 1000). Store the milestone value in `metadata.milestone`.
- Notifications should be batched or debounced for high-frequency actions (e.g., multiple likes in quick succession).
- Post photos are stored in Supabase Storage under `posts/{postId}/{photoId}.jpg`. The `post_photos.url` field stores the relative path.
