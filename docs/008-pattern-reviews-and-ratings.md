# Pattern Reviews and Ratings

**Status:** Schema complete, no UI or API

## Problem Statement

Crafters rely heavily on community feedback when choosing patterns. Without reviews, users cannot see whether a pattern's instructions are clear, how the sizing runs, or whether the finished piece matches expectations. Reviews also give pattern designers valuable feedback.

## Solution Overview

Letterboxd-style reviews tied to project completion. When a user marks a project as completed, they are prompted to review the linked pattern. Reviews include a 1-5 star rating (half increments), a separate difficulty rating, written text, and a "would make again" flag. One review per user per pattern. Aggregate ratings display on pattern cards and detail pages.

## Key Components

### Backend (Next.js API)

- `POST /api/v1/patterns/:patternId/reviews` - create a review (one per user per pattern, enforced by unique constraint). Optionally links to a project. Creates a `review_posted` activity event. **Not started.**
- `PATCH /api/v1/patterns/:patternId/reviews/:id` - update own review. **Not started.**
- `DELETE /api/v1/patterns/:patternId/reviews/:id` - delete own review and associated activity event. **Not started.**
- `GET /api/v1/patterns/:patternId/reviews` - paginated reviews for a pattern, sorted by newest first. Includes reviewer avatar, display name, and linked project title. **Not started.**
- `GET /api/v1/patterns/:patternId/ratings` - aggregate stats: average rating, average difficulty, total review count, rating distribution (count per star), would-make-again percentage. **Not started.**

### iOS (SwiftUI)

- `ReviewFormView` - star rating picker (tappable half-stars), difficulty rating, text field, would-make-again toggle, optional project selector. Presented as a sheet after project completion or from pattern detail. **Not started.**
- `ReviewListView` - scrollable list of reviews on pattern detail page. Shows avatar, name, stars, difficulty badge, review text, "would make again" indicator. **Not started.**
- `RatingsSummaryCard` - aggregate display: large average star rating, difficulty badge, review count, rating distribution bar chart, would-make-again percentage. **Not started.**
- `StarRatingView` - reusable half-star rating display (read-only and interactive variants). **Not started.**
- `ReviewViewModel` - handles create/edit/delete and fetches reviews + aggregates. **Not started.**
- Post-completion review prompt in project detail when status changes to "completed". **Not started.**

### Web (Next.js)

- `components/features/reviews/ReviewForm.tsx` - star picker, difficulty, text, would-make-again. **Not started.**
- `components/features/reviews/ReviewList.tsx` - review cards with pagination. **Not started.**
- `components/features/reviews/RatingsSummary.tsx` - aggregate stats with bar chart. **Not started.**
- `components/features/reviews/StarRating.tsx` - reusable star display (read-only and interactive). **Not started.**
- Integration into `(app)/patterns/[slug]/page.tsx` - reviews tab or section on pattern detail. **Not started.**
- Integration into `(app)/projects/[slug]/page.tsx` - review prompt on completion. **Not started.**

### Database

- `pattern_reviews` - user_id, pattern_id, project_id (optional), rating (Float 1-5), difficulty_rating (Float 1-5, optional), content (text, optional), would_make_again (Boolean, optional).
- Unique constraint on `[user_id, pattern_id]` ensures one review per user per pattern.
- Indexed on `pattern_id` for fetching reviews by pattern.
- Indexed on `user_id` for fetching a user's reviews.

## Implementation Checklist

- [x] Database schema for pattern_reviews
- [x] Unique constraint on [user_id, pattern_id]
- [x] Float rating field supporting half-star increments
- [x] Optional project_id link
- [x] Indexes on pattern_id and user_id
- [ ] Create review API route with unique constraint handling
- [ ] Update review API route (own reviews only)
- [ ] Delete review API route (own reviews only)
- [ ] List reviews API route with pagination and user info
- [ ] Aggregate ratings API route (average, distribution, would-make-again %)
- [ ] Activity event creation (review_posted) on review submit
- [ ] iOS ReviewFormView with half-star picker
- [ ] iOS ReviewListView on pattern detail
- [ ] iOS RatingsSummaryCard with distribution chart
- [ ] iOS StarRatingView (reusable, read-only + interactive)
- [ ] iOS post-completion review prompt
- [ ] Web ReviewForm component
- [ ] Web ReviewList component
- [ ] Web RatingsSummary component
- [ ] Web StarRating component
- [ ] Web pattern detail integration
- [ ] Web project completion review prompt
- [ ] Aggregate rating display on pattern cards (list views)

## Dependencies

- Auth (Clerk) - required for user identity
- Patterns - must exist for reviews to reference
- Projects - optional link, used for post-completion prompt
- Activity events (006) - review_posted event feeds into social feed

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| Write reviews | Yes | Yes |
| Read reviews | Yes | Yes |
| View aggregate ratings | Yes | Yes |

This feature is free for all users. No tier gating.

## Technical Notes

- Ratings use Float to support half-star increments (1.0, 1.5, 2.0, ..., 5.0). Validate at the API layer that values are multiples of 0.5 within the 1-5 range.
- Aggregate ratings should be computed on-read using Prisma's `aggregate` (average, count). If performance becomes an issue, denormalize into a `pattern_rating_cache` table updated on review create/update/delete.
- The post-completion review prompt should appear when `projects.status` changes to "completed" and the project has a `pattern_id` and the user has not yet reviewed that pattern. Check the unique constraint before showing the prompt.
- When creating a review, also create an `activity_events` row with type "review_posted" and metadata `{ rating: 4.5 }`. Do both in a Prisma transaction.
- The rating distribution for the summary card is an array of 5 counts (one per star). Use Prisma `groupBy` on `FLOOR(rating)` or compute client-side from the full review list if the count is small.
- The difficulty_rating is separate from the main rating. It answers "how hard was this pattern" rather than "how good was this pattern." Display it as a badge (e.g., "Difficulty: 3.5/5") rather than stars to avoid confusion.
