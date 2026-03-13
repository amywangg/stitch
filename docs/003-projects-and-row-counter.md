# Projects and Row Counter

**Status:** Schema complete, API scaffolded

## Problem Statement

The row counter is the core daily-use feature of Stitch. Knitters and crocheters need to track their progress across multiple projects, each with multiple sections (e.g., front panel, back panel, sleeves). The counter must be fast, satisfying to use (haptics, large tap targets), and optionally sync across devices in real time for Pro users.

## Solution Overview

Projects contain one or more sections, each with its own row counter. Every counter change is logged to `row_counter_history` for undo support and analytics. Supabase Realtime broadcasts counter updates so Pro users see changes instantly on all devices. The counter UI prioritizes speed and tactile feedback over visual complexity.

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/projects` | List user's projects (paginated, filter by status) | Not started |
| `POST /api/v1/projects` | Create a new project | Not started |
| `GET /api/v1/projects/[id]` | Get project with sections, gauge, photos | Not started |
| `PATCH /api/v1/projects/[id]` | Update project details | Not started |
| `DELETE /api/v1/projects/[id]` | Soft delete (set deleted_at) | Not started |
| `POST /api/v1/projects/[id]/sections` | Add a section to a project | Not started |
| `PATCH /api/v1/projects/[id]/sections/[sectionId]` | Update section (name, target rows) | Not started |
| `DELETE /api/v1/projects/[id]/sections/[sectionId]` | Remove a section | Not started |
| `POST /api/v1/counter/[sectionId]/increment` | Increment counter, log history, trigger Realtime | Not started |
| `POST /api/v1/counter/[sectionId]/decrement` | Decrement counter, log history | Not started |
| `POST /api/v1/counter/[sectionId]/reset` | Reset to 0 or specified value | Not started |
| `POST /api/v1/projects/[id]/photos` | Upload photo to Supabase Storage | Not started |
| `DELETE /api/v1/projects/[id]/photos/[photoId]` | Remove a photo | Not started |
| `POST /api/v1/projects/[id]/gauge` | Save gauge measurement | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `ProjectsView` | List of projects with status filter tabs | Not started |
| `ProjectDetailView` | Project info, sections, photos, gauge, progress | Not started |
| `ProjectCreateView` | Form: title, craft type, pattern link, yarn, notes | Not started |
| `ProjectEditView` | Edit project details | Not started |
| `CounterView` | Large tap target counter with haptics, section switcher | Not started |
| `SectionManagementView` | Add, reorder, delete sections within a project | Not started |
| `GaugeInputView` | Input stitches/rows per 10cm, needle size | Not started |
| `PhotoGalleryView` | View and manage project photos | Not started |
| `ProjectViewModel` | MVVM observable class for project CRUD | Not started |
| `CounterViewModel` | MVVM observable class for counter operations | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/projects/page.tsx` | Projects list with filters | Not started |
| `(app)/projects/new/page.tsx` | Create project form | Not started |
| `(app)/projects/[id]/page.tsx` | Project detail view | Not started |
| `(app)/projects/[id]/edit/page.tsx` | Edit project | Not started |
| Counter component | Increment/decrement with keyboard shortcuts | Not started |
| `useCounterRealtime` hook | Supabase Realtime subscription for counter sync | Not started |
| Section manager component | Add, reorder, delete sections | Not started |
| Photo upload component | Drag-and-drop photo upload | Not started |

### Database

| Table | Purpose |
|---|---|
| `projects` | Core project record: title, status, craft_type, notes, deleted_at |
| `project_sections` | Sections within a project: name, current_row, target_rows, sort_order |
| `row_counter_history` | Audit log: action (increment/decrement/reset/set), previous_value, new_value |
| `project_gauge` | Gauge measurements: stitches_per_10cm, rows_per_10cm, needle_size |
| `project_photos` | Photo URLs in Supabase Storage |
| `project_yarns` | Yarn assignments per project |
| `project_tags` | User-defined tags |

## Implementation Checklist

- [x] Database schema for all project-related tables
- [x] Soft delete support (deleted_at column)
- [x] Ravelry sync fields on projects (ravelry_id, ravelry_permalink)
- [x] Row counter history schema with action types
- [x] Project statuses defined: active, completed, frogged, hibernating
- [x] Craft types defined: knitting, crochet
- [ ] Project CRUD API routes
- [ ] Section CRUD API routes
- [ ] Counter increment/decrement/reset API routes
- [ ] Counter history logging on every change
- [ ] Photo upload API route + Supabase Storage integration
- [ ] Gauge save/update API route
- [ ] iOS ProjectsView with status filter tabs
- [ ] iOS ProjectDetailView with sections and progress
- [ ] iOS ProjectCreateView form
- [ ] iOS CounterView with haptic feedback
- [ ] iOS CounterView large tap targets (full-width increment, smaller decrement)
- [ ] iOS section management (add, reorder via drag, delete with confirmation)
- [ ] iOS gauge input UI
- [ ] iOS photo gallery with camera and library picker
- [ ] Web projects list page
- [ ] Web project detail page
- [ ] Web project create/edit pages
- [ ] Web counter component with keyboard shortcuts (up arrow, down arrow, r for reset)
- [ ] Web Supabase Realtime subscription for counter sync
- [ ] iOS RealtimeManager real Supabase SDK integration for counter sync
- [ ] Enforce free tier limit (max 3 active projects)

## Dependencies

- Authentication (001) for user identification
- Subscriptions (002) for Pro gating on project limits and realtime
- Supabase Storage bucket for project photos
- Supabase Realtime enabled on project_sections table

## Tier Gating

| Feature | Free | Pro |
|---|---|---|
| Active projects | 3 max | Unlimited |
| Row counter | Yes | Yes |
| Sections per project | Unlimited | Unlimited |
| Cross-device realtime sync | No | Yes |
| Photo uploads | Yes | Yes |

## Technical Notes

- Counter operations must be fast. The increment endpoint should write to the database and return immediately. Supabase Realtime handles broadcasting the change to other devices.
- Row counter history enables undo: the most recent history entry contains `previous_value`, which can be restored.
- The counter UI on iOS should use `UIImpactFeedbackGenerator` with `.medium` style on increment and `.light` on decrement.
- Soft deletes: all project queries must include `where: { deleted_at: null }`. The DELETE endpoint sets `deleted_at = new Date()`, it does not remove the row.
- Project status transitions: active can go to completed, frogged, or hibernating. Completed and frogged are terminal. Hibernating can return to active.
- Section `sort_order` is an integer. When reordering, update all affected sections in a transaction.
- Free tier enforcement: check `await prisma.projects.count({ where: { user_id, status: 'active', deleted_at: null } })` before allowing new project creation.
