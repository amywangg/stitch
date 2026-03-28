# In-App Notifications

**Status:** Partially implemented (in-app notifications working; push notifications not started)

## Overview

Stitch has a working in-app notification system that alerts users to social interactions (follows, likes, comments, new posts) and marketplace events (pattern sales). Notifications are delivered via polling, displayed in a dedicated notifications screen on iOS, and surfaced as unread badges on the Feed tab and bell icon. Push notifications (APNs) are not yet implemented.

## Notification Types

| Type | Created by | Recipient | iOS display text | Status |
|---|---|---|---|---|
| `follow` | `POST /social/follow` | Followed user | **Alice** started following you | Implemented |
| `like` (post) | `POST /social/posts/[id]/like` | Post author | **Alice** liked your post | Implemented |
| `like` (activity) | `POST /social/activity/[id]/like` | Activity author | **Alice** liked your activity | Implemented |
| `comment` (post) | `POST /social/comments` | Post author | **Alice** commented on your post | Implemented |
| `comment` (activity) | `POST /social/comments` | Activity author | **Alice** commented on your activity | Implemented |
| `new_post` | `POST /social/posts` | All followers | **Alice** shared a new post | Implemented |
| `pattern_sold` | `POST /webhooks/stripe` | Pattern seller | **Alice** purchased "Pattern Title" | Implemented |
| `mention` | -- | Mentioned user | **Alice** mentioned you | Planned (not implemented) |

### Self-notification suppression

All routes skip notification creation when the actor is the same as the resource owner (e.g., liking your own post). The `follow` route also prevents self-follows.

### Non-blocking creation

Notification creation is fire-and-forget (`.catch(() => {})`) in all routes except the comment route, which awaits the create but still catches errors. This prevents notification failures from breaking the primary action.

## Database Schema

The `notifications` table in `packages/db/prisma/schema.prisma`:

| Column | Type | Description |
|---|---|---|
| `id` | `String (UUID)` | Primary key |
| `user_id` | `String` | Recipient user ID (FK to `users`) |
| `sender_id` | `String?` | Actor who triggered the notification (FK to `users`) |
| `type` | `String` | One of: `follow`, `like`, `comment`, `new_post`, `pattern_sold`, `mention` |
| `resource_type` | `String?` | Target entity type: `user`, `post`, `activity_event`, `pattern` |
| `resource_id` | `String?` | ID of the target entity |
| `message` | `String?` | Optional display text override (used by `pattern_sold` and `follow`) |
| `read` | `Boolean` | Default `false`; set to `true` when user reads |
| `created_at` | `DateTime` | Creation timestamp |
| `updated_at` | `DateTime` | Auto-updated timestamp |

Indexed on `[user_id, read]` for efficient unread count queries.

## API Routes

### `GET /api/v1/social/notifications`

Returns paginated notifications for the authenticated user. Includes `sender` relation (id, username, display_name, avatar_url) and an `unreadCount` field alongside the standard pagination envelope.

Response shape:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 42,
    "unreadCount": 5,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### `PATCH /api/v1/social/notifications/read`

Marks notifications as read. Two modes:

- **Specific IDs**: Send `{ "ids": ["uuid1", "uuid2"] }` to mark individual notifications.
- **Mark all**: Send an empty body (or omit `ids`) to mark all unread notifications as read.

Both modes scope the update to the authenticated user's notifications only.

## iOS Implementation

### Polling Service (`NotificationService.swift`)

`NotificationService` is an `@Observable` singleton injected into the SwiftUI environment. It polls the notifications endpoint every 30 seconds to keep the unread badge count current.

| Method | Behavior |
|---|---|
| `startPolling()` | Starts a background `Task` that calls `fetchUnreadCount()` in a loop with 30-second intervals. Cancels any existing poll task first. |
| `stopPolling()` | Cancels the poll task. |
| `fetchUnreadCount()` | Fetches `GET /social/notifications?limit=1` and extracts `unreadCount` from the response. Errors are silently ignored. |
| `clearBadge()` | Sets `unreadCount` to `0` immediately (used after "mark all read"). |

File: `apps/ios/Stitch/Core/Network/NotificationService.swift`

### Unread Badge Display

The unread count appears in two places:

1. **Feed tab badge** (`MainTabView.swift`): The Feed tab uses `.badge(notifications.unreadCount)` to show the system tab badge when unread notifications exist.
2. **Bell icon** (`FeedView.swift`): The navigation bar bell icon switches between `bell` and `bell.badge.fill` based on `notificationService.unreadCount > 0`, with the primary theme color applied.

### Notifications Screen (`NotificationsView.swift`)

Accessible via the bell icon `NavigationLink` in `FeedView`. Displays a list of notifications with:

- Sender avatar (using `AvatarImage`)
- Attributed text with bold sender name and action description
- Relative timestamp
- Coral unread dot for unread notifications
- Reduced opacity (0.7) for read notifications

### Mark Read

- **Individual**: Tapping an unread notification calls `viewModel.markRead(id)`, which optimistically marks it read locally, decrements the badge count, and sends `PATCH /social/notifications/read` with the single ID.
- **Mark all**: The "Mark all read" toolbar button calls `viewModel.markAllRead()`, which optimistically marks all notifications read, clears the badge via `NotificationService.shared.clearBadge()`, and sends a `PATCH` with an empty body. On failure, it reverts by reloading from the server.

File: `apps/ios/Stitch/Features/Social/NotificationsViewModel.swift`

### iOS Model

`StitchNotification` in `Models/Models.swift`:

```swift
struct StitchNotification: Codable, Identifiable {
    let id: String
    let userId: String
    let senderId: String?
    let type: String          // "follow" | "like" | "comment" | "new_post" | "pattern_sold" | "mention"
    let resourceType: String? // "user" | "post" | "activity_event" | "pattern"
    let resourceId: String?
    let message: String?
    let read: Bool
    let createdAt: Date
    let sender: PostAuthor?
}
```

## Activity Sharing Preferences

Users control which automatic activity types appear in their followers' feeds via the Activity Sharing screen (`ActivitySharingView.swift`). This is a per-user toggle for each activity type, stored as a JSON object in `users.activity_sharing`.

| Activity type key | Label | Default |
|---|---|---|
| `project_started` | Started a project | On |
| `project_completed` | Finished a project | On |
| `project_frogged` | Frogged a project | On |
| `stash_added` | Added to stash | On |
| `row_milestone` | Row milestones | On |
| `pattern_queued` | Queued a pattern | On |
| `pattern_saved` | Saved a pattern | On |
| `review_posted` | Posted a review | On |
| `session_logged` | Logged a session | On |

API: `GET /api/v1/users/me/activity-sharing` and `PATCH /api/v1/users/me/activity-sharing`. These preferences control feed visibility, not notification delivery.

File: `apps/ios/Stitch/Features/Settings/ActivitySharingView.swift`

## What Is NOT Implemented

| Feature | Description | Status |
|---|---|---|
| Push notifications (APNs) | Device token registration, server-side APNs delivery, permission prompt | Not started |
| Realtime delivery | Supabase Realtime subscription for instant notification updates (instead of 30s polling) | Not started |
| `@mention` parsing | Detecting `@username` in post/comment content and creating `mention` notifications | Not started |
| Progress milestone notifications | "You're 50% through the body section" push notifications | Not started |
| Re-engagement notifications | "You haven't knit in 5 days" push notifications | Not started |
| Social digest | Daily digest of follower activity | Not started |
| Trial/subscription reminders | Day 10/13 trial expiry push notifications | Not started |
| Notification preferences | Per-category on/off toggles for notification delivery | Not started |
| Web push | Browser notifications via service worker | Not started |
| Tap-to-navigate | Tapping a notification navigates to the relevant post/profile/pattern | Not started |
| Rich notifications | Showing project/pattern photos in iOS notification banners | Not started |

## Architecture Diagram

```
iOS App                          Next.js API                    Database
--------                         -----------                    --------

NotificationService
  polls every 30s ──────────────> GET /social/notifications ──> notifications table
  updates unreadCount <────────── { unreadCount }                  (read index)

NotificationsView
  loads full list ──────────────> GET /social/notifications ──> notifications + sender join
  tap mark read ────────────────> PATCH /notifications/read ──> UPDATE read = true
  mark all read ────────────────> PATCH /notifications/read ──> UPDATE all read = true

Social actions create notifications on the server side:
  POST /social/follow ──────────────────────────────────────> INSERT type='follow'
  POST /social/posts/[id]/like ─────────────────────────────> INSERT type='like'
  POST /social/activity/[id]/like ──────────────────────────> INSERT type='like'
  POST /social/comments ────────────────────────────────────> INSERT type='comment'
  POST /social/posts ───────────────────────────────────────> INSERT type='new_post' (fan-out)
  POST /webhooks/stripe ────────────────────────────────────> INSERT type='pattern_sold'
```

## Key Files

| File | Purpose |
|---|---|
| `packages/db/prisma/schema.prisma` | `notifications` model definition |
| `apps/web/app/api/v1/social/notifications/route.ts` | List notifications (GET) |
| `apps/web/app/api/v1/social/notifications/read/route.ts` | Mark read (PATCH) |
| `apps/web/app/api/v1/social/follow/route.ts` | Creates `follow` notification |
| `apps/web/app/api/v1/social/posts/[id]/like/route.ts` | Creates `like` notification (post) |
| `apps/web/app/api/v1/social/activity/[id]/like/route.ts` | Creates `like` notification (activity) |
| `apps/web/app/api/v1/social/comments/route.ts` | Creates `comment` notification |
| `apps/web/app/api/v1/social/posts/route.ts` | Creates `new_post` notifications (fan-out to followers) |
| `apps/web/app/api/webhooks/stripe/route.ts` | Creates `pattern_sold` notification |
| `apps/ios/Stitch/Core/Network/NotificationService.swift` | Polling service (30s interval) |
| `apps/ios/Stitch/Features/Social/NotificationsView.swift` | Notification list UI |
| `apps/ios/Stitch/Features/Social/NotificationsViewModel.swift` | ViewModel with mark-read logic |
| `apps/ios/Stitch/Features/Social/FeedView.swift` | Bell icon with badge |
| `apps/ios/Stitch/App/MainTabView.swift` | Feed tab badge |
| `apps/ios/Stitch/Features/Settings/ActivitySharingView.swift` | Activity sharing toggles |
| `apps/ios/Stitch/Models/Models.swift` | `StitchNotification` model |
