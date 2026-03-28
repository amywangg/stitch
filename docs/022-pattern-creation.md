# Pattern Creation

**Status:** Core creation flows implemented. Video tutorials pending.

---

## Overview

Stitch supports two ways to create original patterns that can be shared or sold on the marketplace:

1. **Built in-app (Type 1)** — sections, rows, and instructions created via the pattern builder UI. PDF auto-generated on demand.
2. **Uploaded PDF (Type 2)** — creator uploads their own PDF. Can be AI-parsed (Pro) or manually annotated with metadata (all tiers).

Both types can be listed on the marketplace, shared with the community, and used with the row counter.

---

## Type 1: In-App Pattern Builder

### Flow

1. User taps "Build a pattern" from the patterns menu
2. Fills in metadata: title, craft type, project type (pill picker), yarn weight, needle size, gauge, description
3. Taps "Create pattern" → pattern is saved as a draft
4. Adds cover photo (PhotosPicker → upload to Supabase)
5. Adds yarns (manual entry or from stash via StashPickerSheet)
6. Adds needles (manual entry or from collection via NeedlePickerSheet)
7. Adds sections (e.g., "Brim", "Body", "Crown")
8. Within each section, adds step-by-step instructions with:
   - Instruction text
   - Step type (setup, work rows, repeat, work to measurement, finishing)
   - Row count / repeat count
   - Stitch count after step
   - Optional notes
9. Pattern is complete — "View PDF" generates and displays inline, "Download PDF" exports as shareable file

### PDF Generation

Built patterns generate PDFs on demand via `POST /pdf/generate`. The PDF includes all metadata, sections, and row-by-row instructions formatted for printing.

### Key Files

- `apps/ios/Stitch/Features/Patterns/PatternBuilderView.swift` — main builder view + ViewModel
- `apps/ios/Stitch/Features/Patterns/AIPatternBuilder/` — AI-assisted pattern builder (config-driven questionnaire → GPT-4o generates instructions)

---

## Type 2: Uploaded PDF

### Flow

1. User taps "Upload PDF" from the patterns menu
2. Selects a PDF file from their device
3. PDF is uploaded to Supabase Storage (private bucket), `pdf_uploads` record created
4. **If Pro**: option to AI-parse → GPT-4o extracts structured sections/rows → user reviews and corrects
5. **All tiers**: manually fill in metadata (title, description, designer, craft type, gauge, yarn weight, difficulty, etc.)
6. Pattern is saved with the uploaded PDF attached
7. "View PDF" opens the uploaded file directly

### No Conversion Needed

Type 2 patterns already have a PDF — no generation or conversion step. The uploaded PDF is the pattern.

### AI Parsing (Pro)

`POST /pdf/parse` extracts text via `pdf-parse`, sends to GPT-4o for structuring. Returns sections with row-by-row instructions. Metered: 2/month (free), 5/month (Plus), unlimited (Pro).

---

## Video Tutorials on Pattern Steps

Creators can attach video tutorials to individual pattern sections or steps, helping buyers understand techniques like cable crossings, short rows, or complex stitch patterns.

### Two video sources

| Source | Storage | Limits |
|---|---|---|
| **Upload** | Supabase Storage (`patterns` bucket, `{user_id}/videos/` path) | Max 60 seconds, max 50MB, MP4/MOV only |
| **YouTube link** | Stored as URL (no file storage) | Must be a valid YouTube or YouTube Shorts URL |

### Where videos attach

Videos can be attached at two levels:

1. **Section level** — a video for the whole section (e.g., "How to work the lace panel")
2. **Row/step level** — a video for a specific instruction step (e.g., "How to do a cable 6 front")

### Schema additions needed

```prisma
model pattern_videos {
  id              String   @id @default(uuid())
  pattern_id      String
  section_id      String?  // null = pattern-level video
  row_id          String?  // null = section-level video
  type            String   // "upload" | "youtube"
  // For uploads:
  storage_path    String?  // Supabase Storage path
  file_size       Int?     // bytes
  duration_secs   Int?     // video duration
  thumbnail_url   String?  // auto-generated or extracted frame
  // For YouTube:
  youtube_url     String?  // full YouTube URL
  youtube_id      String?  // extracted video ID for embed
  // Metadata:
  title           String?  // optional descriptive title
  sort_order      Int      @default(0)
  created_at      DateTime @default(now())

  pattern patterns          @relation(fields: [pattern_id], references: [id], onDelete: Cascade)
  section pattern_sections? @relation(fields: [section_id], references: [id], onDelete: Cascade)

  @@index([pattern_id])
  @@index([section_id])
  @@index([row_id])
}
```

### Tier limits

| Tier | Uploaded videos per pattern | YouTube links per pattern |
|---|---|---|
| Free | 0 | 3 |
| Plus | 3 | 10 |
| Pro | 10 | Unlimited |

Uploaded videos are more expensive (storage + bandwidth), so they're more restricted. YouTube links are free to store, so more generous limits.

### API routes needed

| Route | Method | Purpose |
|---|---|---|
| `GET /patterns/[id]/videos` | GET | List videos for a pattern |
| `POST /patterns/[id]/videos` | POST | Add a video (upload or YouTube link) |
| `DELETE /patterns/[id]/videos/[videoId]` | DELETE | Remove a video |
| `POST /patterns/[id]/videos/upload` | POST | Upload video file (multipart) |

### Upload flow

1. Creator opens a section or step in the pattern builder
2. Taps "Add video" → menu: "Record/upload video" or "Paste YouTube link"
3. **Upload path**: PhotosPicker/camera → compress to 720p if needed → upload to Supabase → create `pattern_videos` record
4. **YouTube path**: paste URL → extract video ID → validate via YouTube oEmbed → create `pattern_videos` record with `youtube_url` and `youtube_id`

### Playback

- **Uploaded videos**: stream from Supabase signed URL (short expiry, same pattern as PDF protection)
- **YouTube**: embed using `WKWebView` with YouTube's iframe embed URL (`youtube.com/embed/{id}`)
- Videos appear inline within the section/step view, with a play button overlay on the thumbnail
- In the counter view, the current step's video (if any) is accessible via a "Watch video" button

### iOS components needed

- `VideoAttachmentButton` — "Add video" menu (upload or YouTube)
- `VideoThumbnail` — displays video thumbnail with play button overlay
- `VideoPlayerSheet` — plays uploaded video (AVPlayer) or YouTube embed (WKWebView)
- Integration into `PatternBuilderView` step editor and `CounterView`

### Marketplace considerations

- Videos attached to marketplace patterns are only accessible to buyers (same gating as sections/instructions)
- Uploaded videos are NOT watermarked (too expensive computationally). They rely on access control only.
- YouTube links are accessible to anyone with the URL, so creators should be aware that YouTube videos are not protected by the paywall — only uploaded videos are fully gated

---

## Marketplace Listing

Both Type 1 and Type 2 patterns can be listed for sale. See [021-pattern-marketplace.md](./021-pattern-marketplace.md) for full marketplace documentation.

### Listing requirements

- Must be original work (`source_free = true`, no `ravelry_id`)
- Must have a cover photo and description
- Creator must have completed Stripe Connect onboarding
- Price between $1.00 and $100.00 USD (or free)
- Type 1: must have at least one section with rows
- Type 2: must have the uploaded PDF attached

### What buyers see before purchase

- Title, description, cover photo, metadata (gauge, sizes, difficulty, yarn weight)
- Rating and reviews
- Video thumbnails (but can't play until purchased)

### What buyers see after purchase

- Full sections and row-by-row instructions
- Watermarked PDF (Type 1: auto-generated, Type 2: uploaded original)
- All attached videos (uploaded + YouTube)

---

## Reviews

All patterns (free, community, marketplace) support reviews. See [008-pattern-reviews-and-ratings.md](./008-pattern-reviews-and-ratings.md) for the original spec.

### Implementation status

- `pattern_reviews` model: exists in schema
- `GET/POST/PATCH/DELETE /patterns/[id]/reviews`: implemented
- iOS `PatternReviewsSection`: implemented, embedded in PatternDetailView and MarketplacePatternDetailView
- `WriteReviewSheet`: implemented with star picker, difficulty rating, would-make-again, text
- Aggregate `rating` and `rating_count` on patterns: auto-updated on every review change

---

## What's Built vs Pending

### Built

- [x] In-app pattern builder (metadata, sections, rows, steps)
- [x] Cover photo upload
- [x] Yarn management (manual + from stash)
- [x] Needle management (manual + from collection)
- [x] PDF upload for all tiers
- [x] AI parsing (Pro)
- [x] PDF generation for built patterns
- [x] Auto "View PDF" / "Download PDF" for Type 1
- [x] Direct "View PDF" for Type 2
- [x] AI pattern builder (config-driven questionnaire)
- [x] Reviews (API + iOS UI)
- [x] Sell flow (SellPatternSheet + Stripe Connect onboarding)
- [x] Marketplace browse + detail + purchase flow

### Pending

- [ ] Video tutorials on pattern steps (schema, API, iOS UI)
- [ ] Video upload to Supabase Storage
- [ ] YouTube link embedding
- [ ] Video playback in counter view
- [ ] Creator earnings dashboard (iOS view — API exists)
- [ ] Purchased patterns list (iOS view — API exists)
