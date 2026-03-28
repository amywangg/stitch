# Pattern Library and PDF Parsing

**Status:** Complete

## Problem Statement

Knitters accumulate patterns from many sources: PDFs, Ravelry, printed booklets. They need a single place to store, search, and follow patterns while knitting. The highest-value feature is AI-powered PDF parsing, which extracts structured data (sections, rows, stitch counts, gauge) from unstructured PDF pattern files so users can follow along row by row in the app.

## Solution Overview

Patterns are stored with full structured data: sections, rows with instructions, sizes, gauge info, and tags. Users can create patterns manually via the pattern builder, import from Ravelry, or upload a PDF for AI parsing. PDF parsing uses `pdf-parse` for text extraction and GPT-4o for structuring the content.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/patterns` | List user's patterns (paginated, folder-filterable) | Complete |
| `POST /api/v1/patterns` | Create pattern manually | Complete |
| `GET /api/v1/patterns/[id]` | Get pattern with sections, rows, sizes, photos, yarns | Complete |
| `PATCH /api/v1/patterns/[id]` | Update pattern details, move to folder | Complete |
| `DELETE /api/v1/patterns/[id]` | Soft delete pattern | Complete |
| `GET/POST /api/v1/patterns/folders` | List and create pattern folders | Complete |
| `PATCH/DELETE /api/v1/patterns/folders/[id]` | Rename, delete folders | Complete |
| `POST /api/v1/pdf/parse` | Upload PDF → extract text → GPT-4o structures it. Pro-gated. | Complete |
| `POST /api/v1/pdf/upload` | Upload PDF to Supabase Storage | Complete |
| `GET /api/v1/pdf/[id]` | Get signed URL for PDF download | Complete |
| `GET/PUT /api/v1/pdf/[id]/annotations` | Load/save PDF annotations per user | Complete |
| `POST /api/v1/patterns/enrich` | Enrich pattern metadata from Ravelry | Complete |
| `POST /api/v1/patterns/[id]/apply-size` | Apply size to pattern sections | Complete |
| `GET /api/v1/ravelry/search` | Proxy search to Ravelry with filters | Complete |
| `GET /api/v1/ravelry/patterns/[id]` | Get Ravelry pattern detail | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `PatternsView` | Tab view: My Patterns, Discover, Learn. Folder navigation, sort/layout options | Complete |
| `PatternDetailView` | Full pattern view with sections, sizes, cover carousel, metadata | Complete |
| `PatternBuilderView` | In-app pattern creation with section/row editor | Complete |
| `AIPatternBuilderView` | AI-powered pattern generation (Pro-gated) | Complete |
| `PDFParseFlowView` | Upload PDF → AI parse → Ravelry match → size selection → project creation. Pro-gated. | Complete |
| `PDFMarkupView` | Annotatable PDF viewer with highlight, pen, text note, eraser tools | Complete |
| `PDFMarkupToolbar` | Bottom toolbar for annotation tools with color/width picker | Complete |
| `PDFAnnotationManager` | Annotation state with undo/redo, auto-save, sync to document | Complete |
| `PatternDiscoverView` | Ravelry search with curated browse sections (Most Popular, Top Rated, Recently Added) | Complete |
| `StartPatternFlowView` | Start project from pattern with size selection. AI parse button Pro-gated. | Complete |

### PDF Markup / Annotation

All tiers including free can annotate PDFs:

- **Highlight** — tap or drag to create yellow highlight rectangles
- **Pen** — freehand drawing with 4 colors (red/blue/green/black) and 3 widths
- **Text note** — tap to place, enter text via alert
- **Eraser** — tap annotation to remove
- **Undo/redo** — standard stack, per-session
- **Auto-save** — every 30 seconds + on dismiss
- **Storage** — one JSON record per user per PDF in `pdf_annotations` table
- **Floating counter** — row counter pill in top-right of PDF viewer (increment, decrement, reset)

### Pattern Discovery

The Discover tab shows curated browse sections before search:

- **Most Popular** — horizontal card carousel, sorted by Ravelry popularity
- **Top Rated** — sorted by rating
- **Recently Added** — sorted by date

Each card shows pattern photo (150x200 portrait), name, designer, star rating, "Free" badge. Search with filters: craft, weight, category, difficulty, designer, photos-only.

## AI Parse Flow

1. User selects PDF (via file picker)
2. Pro gate check — non-Pro users see StitchPaywallView
3. PDF uploaded to Supabase Storage
4. `POST /pdf/parse` sends PDF to GPT-4o → returns structured pattern
5. Ravelry match screen (optional) — suggests matching Ravelry patterns
6. Size selection screen (if multiple sizes)
7. Project creation from parsed pattern

## Tier Gating

| Feature | Free | Plus | Pro |
|---|---|---|---|
| PDF storage/upload | Unlimited | Unlimited | Unlimited |
| PDF annotation/markup | Yes | Yes | Yes |
| AI PDF parsing | 2/month | 5/month | Unlimited |
| AI pattern builder | No | No | Yes |
| Pattern browsing/saving | 15 saved | Unlimited | Unlimited |

## Technical Notes

- PDF annotations use PDFKit native annotations with a transparent touch overlay for gesture handling
- Annotation data stored as JSON array in `pdf_annotations.annotation_data`
- `TouchInterceptOverlay` passes touches through to PDFView when no tool is active
- Pattern folders support nesting (parent_id) with drag-to-move context menu
- PDF counter in viewer is local state only — not persisted
