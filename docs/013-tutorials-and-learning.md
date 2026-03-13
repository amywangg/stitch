# Tutorials and Learning

**Status:** Partially complete

## Problem Statement

Beginner and intermediate crafters frequently encounter unfamiliar techniques while following patterns (e.g., "SSK", "magic loop", "Kitchener stitch"). Leaving the app to search YouTube or Google breaks the crafting flow and risks losing their place. The app should provide built-in, step-by-step tutorials for common techniques.

## Solution Overview

A curated library of tutorials organized by category and difficulty. Each tutorial contains ordered steps with markdown text, optional images, and optional video embeds. User progress is tracked so they can resume where they left off. Tutorials are seeded by the development team and can be expanded over time. Future integration: link relevant tutorials contextually from pattern instructions.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `GET /api/v1/tutorials` | List tutorials with optional category and craft_type filters | Not started |
| `GET /api/v1/tutorials/[slug]` | Get tutorial with all steps, plus user's progress if authenticated | Not started |
| `POST /api/v1/tutorials/[slug]/progress` | Update user's progress (last_step, completed) | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `TutorialsView.swift` | Category browser (grid of category cards) | Not started |
| `TutorialsViewModel.swift` | Load tutorials, filter by category/craft/difficulty | Not started |
| `TutorialCategoryView.swift` | List of tutorials in a category | Not started |
| `TutorialReaderView.swift` | Step-by-step reader with prev/next navigation | Not started |
| `TutorialStepView.swift` | Single step: markdown content, image, video player | Not started |
| Progress indicator | Shows completion percentage on tutorial cards | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/tutorials/page.tsx` | Tutorial library with category tabs and search | Not started |
| `(app)/tutorials/[slug]/page.tsx` | Tutorial reader with step navigation | Not started |
| `TutorialCard` component | Card with title, difficulty badge, progress bar | Not started |
| `StepRenderer` component | Renders markdown + media for a single step | Not started |

### Database

| Table | Purpose |
|---|---|
| `tutorials` | Tutorial metadata: slug, title, category, craft_type, difficulty, sort_order, is_published |
| `tutorial_steps` | Ordered steps: step_number, title, content (markdown), image_url, video_url |
| `user_tutorial_progress` | Per-user progress: completed flag, last_step number |

Categories: `cast_on`, `bind_off`, `stitches`, `techniques`, `finishing`, `crochet_basics`, `reading_patterns`.

## Implementation Checklist

- [x] Database schema (tutorials, tutorial_steps, user_tutorial_progress tables)
- [ ] Seed tutorial content (at least 3-5 tutorials per category for launch)
- [ ] API route: list tutorials with filters
- [ ] API route: get tutorial with steps and user progress
- [ ] API route: update user progress
- [ ] iOS TutorialsViewModel
- [ ] iOS TutorialsView (category grid)
- [ ] iOS TutorialCategoryView (tutorial list within category)
- [ ] iOS TutorialReaderView (step-by-step navigation)
- [ ] iOS TutorialStepView (markdown rendering, image display, video player)
- [ ] iOS progress tracking (mark steps complete, resume from last step)
- [ ] Web tutorials listing page with category tabs
- [ ] Web tutorial reader with step navigation
- [ ] Web StepRenderer for markdown and media
- [ ] Upload tutorial images and videos to Supabase Storage
- [ ] Contextual linking: surface relevant tutorials from pattern instructions
- [ ] Search within tutorials (title and step content)

## Dependencies

- Authentication (001) for tracking user progress (tutorials themselves are browsable without auth)
- Supabase Storage bucket for tutorial images and videos

## Tier Gating

Free for all users. All tutorials are accessible regardless of subscription tier. Consider gating advanced technique tutorials to Pro in the future if the content library grows significantly, but launch with everything free to maximize learning value.

## Technical Notes

- Tutorial step content is stored as markdown. Use a markdown renderer on both iOS (e.g., swift-markdown-ui) and web (e.g., react-markdown or next-mdx-remote).
- Images should be stored in a `tutorials/` bucket in Supabase Storage. Reference them by relative path in `image_url` and resolve the full URL at render time.
- Video hosting: for launch, link to external video URLs (YouTube embeds). If self-hosting later, use Supabase Storage with streaming support.
- The `is_published` flag on tutorials allows drafting content before making it visible. Unpublished tutorials should only be visible in an admin context.
- Contextual linking from patterns: when a pattern instruction references a technique (e.g., "SSK"), the app could hyperlink to the matching tutorial by slug. This requires a mapping of abbreviations to tutorial slugs, which can be a simple JSON lookup table.
- Seed data should be created as a Prisma seed script or SQL migration so every environment gets baseline tutorials.
