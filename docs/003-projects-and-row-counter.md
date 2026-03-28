# Projects and Row Counter

**Status:** Implemented

## Problem Statement

The row counter is the core daily-use feature of Stitch. Knitters and crocheters need to track their progress across multiple projects, each with multiple sections (e.g., front panel, back panel, sleeves). The counter must be fast, satisfying to use (haptics, large tap targets), and optionally sync across devices in real time for Pro users.

## Solution Overview

Projects contain one or more sections, each with its own row counter. Every counter change is logged to `row_counter_history` for undo support and analytics. Supabase Realtime broadcasts counter updates so Pro users see changes instantly on all devices. The counter UI prioritizes speed and tactile feedback over visual complexity. Projects with AI-parsed PDFs get step-by-step instruction tracking; projects without parsed instructions get a simpler counter with an optional manual progress slider.

---

## 1. Project Creation Flows

Three ways to create a project, all accessible from `ProjectsView` via `ProjectHeaderBar`:

### Manual creation (from pattern picker)

`ProjectsView` opens `PatternPickerSheet`, which lets the user select an existing saved pattern. Calls `viewModel.createFromPattern(patternId:)` which hits `POST /api/v1/projects/create-from-pattern`. Navigates to `ProjectDetailView` on success.

### From PDF upload

`ProjectsView` opens `PDFParseFlowView` as a sheet. The user uploads a PDF, optionally triggers AI parsing, and a project is created with the parsed pattern attached. On completion, navigates to `ProjectDetailView`.

### From Ravelry sync

Pull-to-refresh on `ProjectsView` calls `viewModel.syncRavelry()` then `viewModel.loadGrouped()`. The Ravelry sync imports projects from the user's Ravelry account into Stitch. Projects imported from Ravelry carry `ravelry_id` and `ravelry_permalink` fields. A `RavelryOnboardingSheet` prompts first-time users to connect.

**Files:**
- `apps/ios/Stitch/Features/Projects/ProjectsView.swift`
- `apps/ios/Stitch/Features/Projects/ProjectsViewModel.swift`
- `apps/web/app/api/v1/projects/route.ts` (POST)
- `apps/web/app/api/v1/projects/create-from-pattern/route.ts`

---

## 2. Row Counter Layouts

`CounterView` (`apps/ios/Stitch/Features/Counter/CounterView.swift`) is the main counter screen. It accepts a `sectionId`, optional `allSections` array for section switching, optional `projectId`, and optional `pdfUploadId`.

On load, `CounterViewModel` first tries `GET /counter/{sectionId}/instruction`. If the section has parsed pattern rows, the instruction layout is used. If not, it falls back to `GET /counter/{sectionId}` for the basic layout.

### Basic layout (no instructions)

Shown when `viewModel.totalSteps == 0`. Displays:

- **AI parse banner** -- if a PDF is attached but no instructions exist, shows a banner prompting AI parsing (Pro-gated via `SubscriptionManager`).
- **Row count display** -- three variants:
  - With target rows: `ProgressRingView` wrapping a large row number, plus "of N rows" subtitle.
  - Without target rows: giant 96pt bold rounded row number in coral.
  - Section completed: checkmark icon + "Section complete" message + `CounterSectionCompleteFooter`.
- **Stats card** -- progress percentage, rows/hr, remaining rows (see section 12).
- **Counter controls** -- `CounterControls` component at bottom.

### Instruction layout

Shown when `viewModel.totalSteps > 0`. Rendered by `CounterInstructionLayout` (`apps/ios/Stitch/Features/Counter/CounterInstructionLayout.swift`). Displays:

- **Completed banner** -- green "Section complete" when done.
- **Step progress strip** -- horizontal bar of segments (one per step), color-coded by completion and row type. Flanked by back/forward chevron buttons for manual step navigation (`goBackStep()`, `advanceStep()`). Shows "Step N of M" below.
- **Scrollable instruction area:**
  - Previous instruction context peek (dimmed, 2-line limit).
  - **Instruction card** -- row type badge (color-coded: setup=blue, work_rows=primary, repeat=purple, work_to_measurement=orange, finishing=green), instruction text with glossary-linked terms (`GlossaryLinkedText`), stitch count, target measurement for `work_to_measurement` steps, and a "Done with this step" button for open-ended steps.
  - **Glossary terms section** -- extracted knitting abbreviations from the instruction text, shown as chips via `FlowLayout`.
  - Next instruction context peek.
  - Position label and stats row (overall %, rows/hr).
- **Counter display** -- compact `ProgressRingView` (80px, 6pt stroke) or plain number when no target.
- **Counter controls** -- `CounterControls` at bottom.
- **Section progress bar** -- 3px full-width bar at very bottom showing overall section completion.

**Files:**
- `apps/ios/Stitch/Features/Counter/CounterView.swift`
- `apps/ios/Stitch/Features/Counter/CounterInstructionLayout.swift`
- `apps/ios/Stitch/Features/Counter/CounterViewModel.swift`

---

## 3. Visual Counter Features

### ProgressRingView

`apps/ios/Stitch/Components/ProgressRingView.swift`

Generic circular progress ring with configurable color, track color, line width, size, and a center content slot (`@ViewBuilder`). Uses `Circle().trim(from:to:)` with a round line cap, rotated -90 degrees. Animated with `.easeInOut(duration: 0.3)`. Defaults: 200px size, 8pt stroke, coral color, gray 20% track.

Used in both basic layout (200px, 8pt stroke, large row number center) and instruction layout (80px, 6pt stroke, compact row number).

### Haptic feedback

`apps/ios/Stitch/Features/Counter/CounterControls.swift`

`HapticScaleButtonStyle` -- custom `ButtonStyle` that scales to 0.93 on press and fires `UIImpactFeedbackGenerator`. The increment button uses `.medium` feedback; the decrement button uses `.light` feedback. Both buttons animate with `.easeInOut(duration: 0.1)`.

The increment button is full-width with coral background and white plus icon. The decrement button is fixed 72x72pt with coral 12% background and coral minus icon. Both have 16pt corner radius.

### Milestone celebrations

`apps/ios/Stitch/Components/MilestoneCelebration.swift`

Triggered when `currentRow` hits a milestone: 50, 100, 250, 500, or 1000. `CounterViewModel.increment()` checks `isMilestoneRow(currentRow)` and sets `milestoneToShow`. The overlay is rendered in `CounterView`'s `ZStack` with `.allowsHitTesting(false)` so it doesn't block interaction.

Celebration displays:
- Semi-transparent black backdrop.
- 24 confetti particles in brand colors (coral, teal, yellow, purple, orange, pink), radiating outward with varying sizes (4-10pt) and distances (80-200pt).
- Star badge with "Row N!" title and contextual message ("Great start" at 50, "Triple digits" at 100, "Impressive progress" at 250, "Halfway to a thousand" at 500, "Legendary" at 1000).
- Heavy haptic on appear via `UIImpactFeedbackGenerator(style: .heavy)`.
- Spring animation in, auto-dismiss after 1.5 seconds with fade-out.

The parent `CounterView` also dismisses `milestoneToShow` after 2.0 seconds as a safety net.

---

## 4. Voice Counter

### VoiceCounterManager

`apps/ios/Stitch/Core/Voice/VoiceCounterManager.swift`

`@Observable` class using `SFSpeechRecognizer` for on-device speech recognition (`requiresOnDeviceRecognition = true`). Requests both speech recognition and microphone permissions. Audio session configured as `.playAndRecord` with `.measurement` mode and `.defaultToSpeaker` + `.allowBluetooth` options.

Uses continuous listening: when a recognition task completes or errors, it automatically restarts after 0.5 seconds if `isListening` is still true. Partial results are enabled. A 1-second cooldown prevents duplicate command fires from partial results. Also deduplicates the same command within 2 seconds.

Text-to-speech via `AVSpeechSynthesizer` for status queries.

### Voice commands

All commands are defined in `VoiceCommand` enum (CaseIterable):

| Command | Trigger phrases | Action |
|---|---|---|
| `increment` | "plus one", "increase", "next", "knit" | Count +1 |
| `decrement` | "minus one", "decrease", "back", "decrease row" | Count -1 |
| `undo` | "undo", "oops" | Undo last action |
| `advanceStep` | "next step", "advance" | Advance to next step |
| `queryStatus` | "what row", "where am I" | Speaks current row/step aloud |
| `startSession` | "start session", "start timer" | Start timed session |
| `pauseSession` | "pause session", "pause timer" | Pause session |
| `stopSession` | "stop session", "end session", "stop timer" | End session |
| `castOn` | "cast on", "cast on mode" | Enter cast-on mode |

Parsing priority: cast-on > session controls > advance step > increment > decrement > undo > query status. This avoids "next" matching increment when the user says "next step".

### Voice UI in CounterView

- Mic toggle in toolbar -- pulsing coral mic icon when active, secondary when off.
- Help button (question mark circle) appears when listening -- opens `VoiceCommandHelpView` popover listing all commands with trigger phrases.
- Voice feedback toast -- capsule overlay at top of screen showing the action taken ("+1", "-1", "Undone", "Next step", status text, etc.), auto-dismisses after 1.5 seconds.
- Voice stops on `onDisappear` and when app goes to background. Auto-resumes when returning to foreground if it was active.

**Files:**
- `apps/ios/Stitch/Core/Voice/VoiceCounterManager.swift`
- `apps/ios/Stitch/Features/Counter/VoiceCommandHelpView.swift`

---

## 5. Cast-On Mode

`apps/ios/Stitch/Features/Counter/CastOnModeView.swift`

Full-screen cover presented from `CounterView` when the `castOn` voice command fires or user activates it. Designed for counting cast-on stitches hands-free.

Features:
- Giant 120pt bold rounded counter display with spring animation on numeric transitions.
- "stitches cast on" subtitle.
- Entire background is tappable to increment.
- Circular plus (80pt, coral) and minus (64pt, coral 12%) buttons.
- Mic toggle in header -- wires voice commands to local increment/decrement/undo/queryStatus only (other commands are ignored).
- Light haptic on every increment.
- Voice feedback toast for count changes and status queries.
- Hint text: "Tap anywhere, press +, or say 'plus one'".
- On dismiss, voice command handler is re-wired back to `CounterView`'s handler via `.task`.

---

## 6. Row Counters vs Parsed Sections on Project Detail

`apps/ios/Stitch/Features/Projects/ProjectDetailView.swift` and `apps/ios/Stitch/Features/Projects/ProjectProgressSection.swift`

The project detail view splits sections into two categories:

### Parsed sections (from AI parse)

Sections where `patternSection?.rows?.isEmpty == false`. Shown in `ProjectSectionsBlock`. Each section row displays:
- Section name, current row (with target if set), current step of total steps.
- `ProjectSectionProgressDonut` -- 32px circular progress indicator. Shows green checkmark when complete, percentage when in progress, empty when not started. For multi-step sections, progress accounts for completed steps plus fractional progress within the current step.
- Tapping navigates to `CounterView` with `CounterInstructionLayout`.

The active (first incomplete) section is highlighted with coral background and border.

### Row counters (user-created)

Sections where `patternSection?.rows?.isEmpty != false`. Shown in `ProjectRowCountersBlock`. Includes an add button ("+") in the header. Each counter row displays:
- Counter name, current row (with target if set).
- Progress indicator: green checkmark if complete, donut with percentage if target set, or plain row number if no target.
- Context menu with delete option.
- Tapping navigates to `CounterView` with basic layout.

Empty state shows an "Add a row counter" prompt card.

Adding a counter opens an alert with name and optional target rows fields, then calls `viewModel.addCounter(name:targetRows:projectId:)` which hits `POST /projects/{projectId}/sections`.

### AI parse prompt

When a PDF is attached but no parsed sections exist, an "AI parse pattern" banner appears below the sections. Pro-gated -- free users see a "Pro" badge and get a paywall sheet.

**Files:**
- `apps/ios/Stitch/Features/Projects/ProjectProgressSection.swift` (all progress components)
- `apps/ios/Stitch/Features/Projects/ProjectDetailView.swift`

---

## 7. Manual Progress Slider

`ProjectManualProgressSlider` in `apps/ios/Stitch/Features/Projects/ProjectProgressSection.swift`

Shown on projects without parsed sections (or with no sections at all). Custom drag-gesture slider with:
- Capsule track (gray background, coral fill).
- Snaps to 5% increments.
- Debounced save -- waits 300ms after drag ends before calling `viewModel.saveProgress(pct:projectId:)` which hits `PATCH /projects/{projectId}` with `progress_pct`.
- Animated fill and numeric text transition.
- "Release to save" hint while dragging.
- Optimistic update -- sets `project?.progressPct` immediately.

### Master progress card (parsed projects)

`ProjectMasterProgressCard` -- shown instead of the slider when sections have parsed rows. Displays:
- Overall percentage (bold title2 in coral).
- "N of M sections complete" label.
- Segmented progress bar -- each section gets a proportionally-weighted segment based on target rows, filled according to completion. Multi-step sections calculate progress as `(completedSteps + withinStepFraction) / totalSteps`.
- Active section label.

---

## 8. Project Photos

### Photo carousel

`ProjectPhotoCarousel` in `apps/ios/Stitch/Features/Projects/ProjectInfoSection.swift`

Paged `TabView` at top of project detail, 300pt tall. Shows user-uploaded photos first; falls back to pattern cover image if no photos. Page indicators shown when multiple photos. Tapping a photo opens `FullScreenImageViewer` as a full-screen cover.

### Upload

Photos picker via SwiftUI `.photosPicker` modifier on `ProjectDetailView`. Selected image data sent to `viewModel.uploadPhoto(imageData:projectId:)` which calls `APIClient.shared.upload("/projects/{projectId}/photos", ...)`. Reloads project on success.

### Delete

`viewModel.deletePhoto(photoId:projectId:)` with optimistic removal from `project?.photos` array. Falls back to full reload on error.

### Add from toolbar

"Add photo" option in the project detail toolbar menu.

---

## 9. Counter in PDF Viewer

`CounterView` toolbar includes a doc.text button when a PDF is attached (`pdfUploadId != nil || viewModel.pdfUploadId != nil`). Tapping opens `PDFViewerView` in a sheet, allowing the user to reference the pattern PDF side-by-side with the counter.

---

## 10. Session Logging

### Live sessions (from counter)

`CraftingSessionManager` (`apps/ios/Stitch/Core/Sessions/CraftingSessionManager.swift`) is a singleton `@Observable`. The session bar in `CounterView` shows:
- **No active session:** "Start timed session" button.
- **Active session:** Red live indicator dot, elapsed time (mm:ss via 1-second timer), "End session" button.

Session lifecycle:
1. `startSession(projectId:)` -- `POST /sessions` with project_id. Stores session ID in `UserDefaults` for crash recovery.
2. Keeps screen awake (`UIApplication.shared.isIdleTimerDisabled = true`).
3. Auto-pauses when app goes to background, auto-resumes on foreground.
4. `endSession()` -- `POST /sessions/{id}/end`. Shows summary toast if session was meaningful (>1 min or >0 rows).
5. `cleanupAbandonedSession()` for crash recovery.

### Manual session logging

`ManualSessionSheet` (`apps/ios/Stitch/Features/Sessions/ManualSessionSheet.swift`). Accessible from project detail toolbar ("Log session"). Form includes:
- Date picker (up to today).
- Duration picker (5-240 min in 5-min increments).
- Notes text field.
- Photo picker with preview and remove button.
- "Share as post" toggle -- when enabled, creates a social post (`POST /social/posts`) with session content and optionally uploads the photo to the post (`POST /social/posts/photo`).

The photo is uploaded to the project's photos as well via `POST /projects/{projectId}/photos`.

### Session display on project detail

`ProjectSessionsBlock` renders the 5 most recent sessions on the project detail page. Loaded via `viewModel.loadSessions(projectId:)` which hits `GET /sessions?project_id={id}&page_size=5`.

---

## 11. Ravelry Push-Back on Project CRUD

All project write operations push changes back to Ravelry when the user has a connected Ravelry account:

| Operation | API Route | Ravelry Push |
|---|---|---|
| Create project | `POST /projects` | `ravelryCreateProject()` (fire-and-forget, logged on error) |
| Create from pattern | `POST /projects/create-from-pattern` | `ravelryCreateProject()` |
| Update project | `PATCH /projects/[id]` | `ravelryUpdateProject()` |
| Delete project | `DELETE /projects/[id]` | `ravelryDeleteProject()` |

All Ravelry push calls are `.catch()` -- failures are logged but never block the primary operation. Push functions are imported from `apps/web/lib/ravelry-push.ts`.

Note: Per project architecture rules, Ravelry sync (import) is read-only. Push-back on explicit user CRUD is the only write path to Ravelry.

---

## 12. Stats Card

Shown in both basic and instruction layouts when stats are available and the section is not completed.

### Basic layout stats card

Horizontal row of stat items in a rounded card:
- **Progress** -- `Int(progress * 100)%`, shown when target rows exist.
- **Rows/hr** -- calculated by `CounterViewModel.rowsPerHour`. Requires at least 1 minute of session time and at least 1 row worked. Formula: `(currentRow - sessionRowsAtStart) / (elapsed / 3600)`.
- **Remaining** -- `max(target - currentRow, 0)`, shown when target rows exist.

### Instruction layout stats row

Horizontal row (no card background):
- **Overall %** from `sectionProgress.overallPct`.
- **Rows/hr** same calculation as above.

### Spoken status

`CounterViewModel.spokenStatus` for voice queries: "Row N" + optional "of M" + optional "Step X of Y". Spoken aloud via `AVSpeechSynthesizer`.

---

## Key Components

### Backend (Next.js API)

| Route | Purpose | Status |
|---|---|---|
| `GET /api/v1/projects` | List user's projects (paginated, filter by status) | Implemented |
| `GET /api/v1/projects/grouped` | List projects grouped by status (in-progress, queue, completed) | Implemented |
| `POST /api/v1/projects` | Create a new project | Implemented |
| `POST /api/v1/projects/create-from-pattern` | Create project linked to a pattern | Implemented |
| `GET /api/v1/projects/[id]` | Get project with sections, gauge, photos, yarns, needles | Implemented |
| `PATCH /api/v1/projects/[id]` | Update project details (title, status, dates, notes, progress_pct) | Implemented |
| `DELETE /api/v1/projects/[id]` | Soft delete (set deleted_at) | Implemented |
| `POST /api/v1/projects/[id]/sections` | Add a section to a project | Implemented |
| `PATCH /api/v1/projects/[id]/sections/[sectionId]` | Update section | Implemented |
| `DELETE /api/v1/projects/[id]/sections/[sectionId]` | Remove a section | Implemented |
| `POST /api/v1/counter/[sectionId]/increment` | Increment counter, log history, return instruction context | Implemented |
| `POST /api/v1/counter/[sectionId]/decrement` | Decrement counter, log history | Implemented |
| `POST /api/v1/counter/[sectionId]/undo` | Undo last counter action | Implemented |
| `POST /api/v1/counter/[sectionId]/advance-step` | Advance or go back a step (direction param) | Implemented |
| `GET /api/v1/counter/[sectionId]` | Get basic counter state (currentRow, targetRows) | Implemented |
| `GET /api/v1/counter/[sectionId]/instruction` | Get full instruction detail with context | Implemented |
| `POST /api/v1/counter/[sectionId]/override` | Override counter to specific value | Implemented |
| `POST /api/v1/counter/[sectionId]/notes` | Save section notes | Implemented |
| `POST /api/v1/projects/[id]/gauge` | Save gauge measurement | Implemented |
| `POST /api/v1/projects/[id]/photos` | Upload photo | Implemented |
| `DELETE /api/v1/projects/[id]/photos` | Remove photo | Implemented |
| `POST /api/v1/projects/[id]/yarns` | Add yarn (from stash or manual) | Implemented |
| `DELETE /api/v1/projects/[id]/yarns/[yarnId]` | Remove yarn | Implemented |
| `POST /api/v1/projects/[id]/needles` | Add needle (from collection or manual) | Implemented |
| `DELETE /api/v1/projects/[id]/needles/[needleId]` | Remove needle | Implemented |
| `POST /api/v1/sessions` | Start or log a crafting session | Implemented |
| `POST /api/v1/sessions/[id]/pause` | Pause/resume session | Implemented |
| `POST /api/v1/sessions/[id]/end` | End session, return summary | Implemented |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `ProjectsView` | Project list with status groups, sort, grid/list layout | Implemented |
| `ProjectDetailView` | Full project detail with photos, sections, counters, yarns, needles | Implemented |
| `ProjectEditSheet` | Edit project title, status, craft type, dates, notes | Implemented |
| `CounterView` | Counter with session bar, basic/instruction layout, voice, milestones | Implemented |
| `CounterViewModel` | Counter state, increment/decrement/undo/advance, rows/hr, milestones | Implemented |
| `CounterControls` | +/- buttons with haptic scale animation | Implemented |
| `CounterInstructionLayout` | Step-by-step instruction display with navigation | Implemented |
| `CastOnModeView` | Full-screen cast-on counting (voice + tap) | Implemented |
| `VoiceCounterManager` | On-device speech recognition with command parsing | Implemented |
| `VoiceCommandHelpView` | Popover listing all voice commands | Implemented |
| `ProgressRingView` | Configurable circular progress ring | Implemented |
| `MilestoneCelebration` | Confetti overlay at row milestones | Implemented |
| `ProjectPhotoCarousel` | Paged photo viewer with full-screen zoom | Implemented |
| `ProjectMasterProgressCard` | Segmented progress for parsed projects | Implemented |
| `ProjectManualProgressSlider` | Drag slider for non-parsed project progress | Implemented |
| `ProjectSectionsBlock` | Parsed sections list with progress donuts | Implemented |
| `ProjectRowCountersBlock` | User-created counters with add/delete | Implemented |
| `ProjectContinueKnittingButton` | Bottom "Continue knitting" CTA | Implemented |
| `ManualSessionSheet` | Log session with photo + share as post | Implemented |
| `CraftingSessionManager` | Singleton for live session start/pause/end | Implemented |

### Database

| Table | Purpose |
|---|---|
| `projects` | Core project record: title, status, craft_type, notes, progress_pct, deleted_at |
| `project_sections` | Sections: name, current_row, target_rows, current_step, sort_order, completed |
| `row_counter_history` | Audit log: action, previous_value, new_value |
| `project_gauge` | Gauge: stitches_per_10cm, rows_per_10cm, needle_size |
| `project_photos` | Photo URLs in Supabase Storage |
| `project_yarns` | Yarn assignments (from stash or manual) |
| `project_needles` | Needle assignments (from collection or manual) |
| `project_tags` | User-defined tags |
| `crafting_sessions` | Session records: start_time, end_time, duration, source, notes |

---

## Tier Gating

| Feature | Free | Plus | Pro |
|---|---|---|---|
| Active projects | 3 max | Unlimited | Unlimited |
| Row counter | Yes | Yes | Yes |
| Sections per project | Unlimited | Unlimited | Unlimited |
| Cross-device realtime sync | No | Yes | Yes |
| Photo uploads | Yes | Yes | Yes |
| AI pattern parsing | 2/month | 5/month | Unlimited |
| Voice counter | Yes | Yes | Yes |

---

## Technical Notes

- Counter operations use optimistic updates: UI increments immediately, reverts on API failure.
- `CounterViewModel` tries the instruction endpoint first, falls back to basic counter on failure (graceful degradation).
- Milestones are checked client-side and cleared after 2 seconds. The celebration overlay uses `.allowsHitTesting(false)` so it never blocks counter interaction.
- Voice recognition is on-device only (`requiresOnDeviceRecognition = true`) for privacy. Audio session uses `.playAndRecord` to allow simultaneous TTS output.
- The 1-second voice command cooldown plus 2-second same-command deduplication prevents rapid-fire from partial speech results.
- `CraftingSessionManager` persists active session ID in `UserDefaults` for crash recovery. On app launch, abandoned sessions are cleaned up.
- Screen stays awake (`isIdleTimerDisabled = true`) during active sessions and voice listening.
- Voice listening auto-pauses on background and auto-resumes on foreground.
- Soft deletes: all project queries include `deleted_at: null`.
- Project statuses: active, completed, frogged, hibernating. Completed and frogged are terminal. Hibernating can return to active.
- Free tier enforcement: server checks active project count before allowing new creation.
- Ravelry push-back is fire-and-forget -- never blocks the primary DB write.
