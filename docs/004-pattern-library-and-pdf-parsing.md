# Pattern Library and PDF Parsing

**Status:** Schema complete, AI route exists

## Problem Statement

Knitters accumulate patterns from many sources: PDFs, Ravelry, printed booklets. They need a single place to store, search, and follow patterns while knitting. The highest-value feature is AI-powered PDF parsing, which extracts structured data (sections, rows, stitch counts, gauge) from unstructured PDF pattern files so users can follow along row by row in the app.

## Solution Overview

Patterns are stored with full structured data: sections, rows with instructions, sizes, gauge info, and tags. Users can create patterns manually, import from Ravelry (see 005), or upload a PDF for AI parsing. PDF parsing uses `pdf-parse` for text extraction and GPT-4o for structuring the content. Parsed results go through a review screen where users can correct errors before saving.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/patterns` | List user's patterns (paginated, filterable) | Not started |
| `POST /api/v1/patterns` | Create pattern manually | Not started |
| `GET /api/v1/patterns/[id]` | Get pattern with sections, rows, sizes | Not started |
| `PATCH /api/v1/patterns/[id]` | Update pattern details | Not started |
| `DELETE /api/v1/patterns/[id]` | Soft delete pattern | Not started |
| `POST /api/v1/patterns/[id]/sections` | Add section to pattern | Not started |
| `PATCH /api/v1/patterns/[id]/sections/[sectionId]` | Update section | Not started |
| `POST /api/v1/pdf/parse` | Upload PDF, extract text, GPT-4o structures it | Exists (needs refinement) |
| `POST /api/v1/pdf/upload` | Upload PDF to Supabase Storage, create pdf_uploads record | Not started |
| `GET /api/v1/gauge/measurement-to-rows` | Convert target cm to estimated rows | Exists |
| `POST /api/v1/gauge/rows-to-measurement` | Convert row count to estimated cm/inches | Exists |
| `POST /api/v1/gauge/compare` | Compare pattern gauge vs user gauge | Exists |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `PatternsView` | Grid/list of saved patterns with search and filters | Not started |
| `PatternDetailView` | Full pattern info, sections, gauge, linked projects | Not started |
| `PatternUploadView` | PDF picker, upload progress, triggers AI parsing | Not started |
| `PatternReviewView` | Review and edit AI-extracted data before saving | Not started |
| `PatternReadingView` | Follow-along mode: current row highlighted, tap to advance | Not started |
| `PatternCreateView` | Manual pattern entry form | Not started |
| `PatternViewModel` | MVVM observable class for pattern operations | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/patterns/page.tsx` | Pattern library with grid view and filters | Not started |
| `(app)/patterns/[id]/page.tsx` | Pattern detail page | Not started |
| `(app)/patterns/upload/page.tsx` | PDF upload with drag-and-drop | Not started |
| `(app)/patterns/[id]/review/page.tsx` | Review AI-parsed pattern data | Not started |
| Pattern reading component | Row-by-row follow-along view | Not started |
| PDF upload component | File picker with progress indicator | Not started |

### Database

| Table | Purpose |
|---|---|
| `patterns` | Core pattern record: title, author, craft_type, difficulty, yarn_weight, deleted_at |
| `pattern_sections` | Named sections within a pattern (e.g., "Body", "Sleeves") |
| `pattern_rows` | Individual row instructions with stitch counts per section |
| `pattern_sizes` | Size variants (S, M, L, etc.) with measurements |
| `pattern_tags` | User and auto-generated tags |
| `pdf_uploads` | Tracks uploaded PDFs: file_name, file_size, storage_path, status, parsed_pattern_id |

## Implementation Checklist

- [x] Database schema for patterns, pattern_sections, pattern_rows, pattern_sizes, pattern_tags
- [x] pdf_uploads table for tracking uploads
- [x] Gauge fields on patterns (gauge_stitches_per_10cm, gauge_rows_per_10cm)
- [x] Soft delete support on patterns
- [x] POST /api/v1/pdf/parse route (pdf-parse + GPT-4o)
- [x] Gauge calculation routes (measurement-to-rows, rows-to-measurement, compare)
- [ ] Pattern CRUD API routes
- [ ] Pattern section and row CRUD API routes
- [ ] PDF upload to Supabase Storage route
- [ ] Refine GPT-4o prompt for better pattern extraction accuracy
- [ ] Handle multi-size patterns (extract instructions per size)
- [ ] Cover image extraction from PDF first page
- [ ] iOS PatternsView with grid layout and search
- [ ] iOS PatternDetailView
- [ ] iOS PatternUploadView with document picker
- [ ] iOS PatternReviewView for editing parsed data
- [ ] iOS PatternReadingView (row-by-row follow-along)
- [ ] iOS manual pattern creation
- [ ] Web pattern library page with filters
- [ ] Web pattern detail page
- [ ] Web PDF upload page with drag-and-drop
- [ ] Web pattern review page
- [ ] Pattern search by craft type, difficulty, yarn weight, tags
- [ ] Enforce free tier limits (10 patterns, 2 PDF uploads/month)

## Dependencies

- Authentication (001) for user identification
- Subscriptions (002) for Pro gating on PDF parsing and pattern limits
- Supabase Storage bucket for PDF files
- OpenAI API key for GPT-4o pattern parsing

## Tier Gating

| Feature | Free | Pro |
|---|---|---|
| Saved patterns | 10 max | Unlimited |
| PDF uploads | 2/month | Unlimited |
| AI pattern parsing | No | Yes |
| Manual pattern creation | Yes | Yes |
| Pattern reading mode | Yes | Yes |
| Gauge calculator | Yes | Yes |

## Technical Notes

- PDF parsing flow: (1) upload PDF to Supabase Storage, (2) create `pdf_uploads` record with status "processing", (3) extract text with `pdf-parse`, (4) send text to GPT-4o with structured output prompt, (5) return parsed JSON for review, (6) user confirms, (7) save as pattern with sections/rows, (8) update pdf_uploads status to "completed" with parsed_pattern_id.
- The GPT-4o prompt should request JSON output matching the pattern_sections/pattern_rows schema. Key fields to extract: section names, row-by-row instructions, stitch counts, repeat indicators, gauge, yarn weight, needle size.
- Multi-size patterns are common. The prompt should extract instructions for all sizes. Pattern rows store size-specific stitch counts in a JSON field.
- The review screen is critical for user trust. AI extraction will have errors, especially with complex lace or colorwork patterns. Users must be able to edit every field before saving.
- PDF text extraction quality varies wildly. Some PDFs use images for charts, which `pdf-parse` cannot read. Consider adding a note to users that chart-heavy patterns may need manual entry.
- Free tier PDF limit (2/month) is tracked by counting `pdf_uploads` rows for the user within the current calendar month.
- Pattern reading mode should remember the user's current position per pattern, stored locally on device and optionally synced via the project's linked section counter.
