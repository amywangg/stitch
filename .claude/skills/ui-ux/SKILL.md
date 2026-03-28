---
name: ui-ux
description: "Stitch UI/UX design system with Letterboxd/Goodreads-inspired design language. Use when: (1) creating or modifying any SwiftUI view, React component, or page layout, (2) adding cards, lists, feeds, buttons, inputs, empty states, or loading states, (3) choosing colors, spacing, typography, border radius, or shadows, (4) building navigation, tab bars, or screen layouts, (5) writing UI copy, button labels, error messages, or toast text, (6) implementing dark mode, animations, or responsive design."
---

# Stitch UI/UX Design System

When building any UI for Stitch, follow this guide exactly. Stitch is a Letterboxd/Goodreads-style companion app for knitters and crocheters. The design language is warm, editorial, and content-forward -- not clinical or corporate. Every screen should feel like browsing a beautiful catalog of handmade things.

---

## Design Philosophy

**Content is the hero.** Photos of yarn, projects, and patterns should dominate. UI chrome should recede. Think Letterboxd film posters, Goodreads book covers, Pinterest pins -- the craft is the visual center.

**Warmth over sterility.** Rounded corners, soft shadows, warm neutrals. Never stark white on black. The palette is cozy -- like a yarn shop, not a SaaS dashboard.

**Progressive disclosure.** Show the essential action first. Details expand on tap/click. Avoid walls of form fields or settings. One primary action per screen.

**Quiet confidence.** No exclamation marks in UI copy. No "Awesome!" or "Yay!" confirmations. Calm, understated, trust the user to know what they did. Toasts disappear on their own. Errors are helpful, not alarming.

---

## Visual Identity

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Coral 500 | `#FF6B6B` | Primary actions, CTAs, active states, brand accent |
| Teal 500 | `#4ECDC4` | Secondary accent, success states, linked/synced indicators |
| Background | `hsl(0 0% 100%)` / `hsl(222 47% 8%)` | Page background (light/dark) |
| Surface | `hsl(0 0% 98%)` / `hsl(222 47% 11%)` | Cards, elevated containers |
| Background Muted | `hsl(240 5% 96%)` / `hsl(222 39% 14%)` | Subtle section backgrounds, input fields |
| Content Default | `hsl(222 47% 11%)` / `hsl(210 40% 98%)` | Primary text |
| Content Secondary | `hsl(215 16% 47%)` / `hsl(215 20% 65%)` | Secondary text, timestamps, metadata |
| Content Tertiary | `hsl(215 14% 65%)` / `hsl(215 14% 45%)` | Placeholder text, disabled states |
| Border Default | `hsl(220 13% 91%)` / `hsl(215 28% 18%)` | Card borders, dividers |
| Border Emphasis | `hsl(215 25% 75%)` / `hsl(215 25% 28%)` | Focus rings, hover borders |

Use semantic tokens (`bg-background`, `text-content-default`, `border-border-default`) everywhere. Never hardcode hex values except for Coral and Teal brand colors.

### Dark Mode

Always design for both modes simultaneously. Dark mode is not an afterthought -- it is the primary mode for many users. Use the semantic tokens above, which swap automatically. Dark mode should feel rich and warm (deep blue-grays), not pure black.

### Typography

**System fonts only.** No custom typefaces. Let each platform use its native font stack for maximum readability and performance.

| Element | Web (Tailwind) | iOS (SwiftUI) |
|---------|---------------|---------------|
| Page title | `text-2xl font-bold` | `.font(.title).fontWeight(.bold)` |
| Section heading | `text-lg font-semibold` | `.font(.title3).fontWeight(.semibold)` |
| Card title | `text-base font-semibold` | `.font(.headline)` |
| Body text | `text-sm font-normal` | `.font(.body)` |
| Caption / metadata | `text-xs text-content-secondary` | `.font(.caption).foregroundStyle(.secondary)` |
| Counter display | `text-6xl font-bold tabular-nums` | `.font(.system(size: 96, weight: .bold, design: .rounded))` |

### Iconography

- **iOS**: SF Symbols exclusively. Use `.font(.body)` weight to match adjacent text.
- **Web**: Lucide React. 20px default size (`size={20}`). Stroke width 1.5.
- Never mix icon libraries on the same platform.
- Prefer outlined icons. Use filled variants only for active/selected states (e.g., heart outline vs filled heart for likes).

### Spacing and Sizing

Base unit: 4px (Tailwind default). Standard increments: 4, 8, 12, 16, 24, 32, 48.

| Context | Value |
|---------|-------|
| Page padding | `p-4` (16px) on mobile, `p-6` (24px) on desktop |
| Card padding | `p-4` (16px) |
| Section gap | `space-y-6` (24px) |
| Component internal gap | `gap-3` (12px) |
| Icon + label gap | `gap-2` (8px) |
| Tight grouping (tags, chips) | `gap-1.5` (6px) |

### Border Radius

| Element | Value |
|---------|-------|
| Buttons | `rounded-xl` (12px) |
| Cards | `rounded-2xl` (16px) |
| Input fields | `rounded-xl` (12px) |
| Chips / tags | `rounded-full` |
| Avatars | `rounded-full` |
| Images (project/pattern covers) | `rounded-xl` (12px) |
| Bottom sheets (iOS) | 20px top corners |

### Shadows

Minimal. Shadows suggest elevation, not decoration.

| Element | Web | iOS |
|---------|-----|-----|
| Card (resting) | `shadow-sm` | `.shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)` |
| Card (hover/pressed) | `shadow-md` | `.shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)` |
| Modal / sheet | `shadow-xl` | System default |
| Floating action | `shadow-lg` | `.shadow(color: .black.opacity(0.12), radius: 12, x: 0, y: 6)` |

---

## Component Patterns

### Cards

Cards are the primary content container. Every project, pattern, stash item, review, and feed item is a card.

**Structure:**
```
[Cover image / thumbnail]         -- optional, aspect-ratio constrained
[Title]                           -- font-semibold, single line, truncated
[Subtitle / designer / yarn]      -- text-content-secondary, single line
[Metadata row: tags, status, date] -- chips + caption text
[Action row: like, comment, menu]  -- icon buttons, right-aligned or spread
```

**Letterboxd-style pattern cards:**
- Portrait aspect ratio (2:3) for pattern cover images, like film posters
- Title overlaid on bottom gradient if image exists, or below image
- Star rating displayed as filled/empty stars (Coral color)
- "Logged" / "Reviewed" / "In Queue" status badges

**Goodreads-style project cards:**
- Progress bar (Coral fill on muted track) showing rows completed / target
- Status pill: "In Progress" (Teal), "Finished" (Coral), "Frogged" (Content Secondary), "Hibernating" (Background Muted)
- Small yarn color swatch circles if yarn is linked

### Lists

Use cards in lists, never bare table rows. On mobile, full-width cards with `space-y-3` between them. On desktop/tablet, 2-column grid (`grid-cols-2 gap-4`) for browsing views, single column for detail-heavy lists.

### Feed Items (Social)

Two types interleaved chronologically:

**Activity event (auto-generated):**
```
[Avatar] [Username] [verb phrase: "started knitting", "finished", "hit row 100 on"]
[Linked project/pattern card -- compact inline preview]
[Timestamp] [Like button] [Comment button]
```

**Post (user-written, Pro only):**
```
[Avatar] [Username] [Timestamp]
[Text content]
[Photo grid -- 1 photo full width, 2-4 photos in grid]
[Linked project card -- optional]
[Reaction bar] [Comment count]
```

### Reactions

Letterboxd-style emoji reactions, not just a like button:
- Heart (default like), Fire, Yarn ball, Clap, Heart-eyes
- Show as small emoji pills below content with count
- Tapping opens a reaction picker (horizontal strip, not a full menu)

### Navigation

**iOS:** Tab bar with 5 tabs (Projects, Queue, Stash, Patterns, Settings). Use SF Symbol icons. Active tab: Coral fill. Inactive: Content Secondary.

**Web:**
- Desktop: Top navigation bar. Logo left, nav links center, user menu right.
- Mobile: Bottom tab bar matching iOS layout.
- Active state: `bg-coral-500 text-white` pill on active nav item.

### Buttons

| Type | Style |
|------|-------|
| Primary | `bg-coral-500 text-white hover:bg-coral-600` -- main CTA per screen |
| Secondary | `bg-surface border border-border-default text-content-default hover:border-border-emphasis` |
| Tertiary / ghost | `text-content-secondary hover:text-content-default hover:bg-background-muted` |
| Destructive | `bg-red-500 text-white` -- only for irreversible actions, always behind confirmation |
| Icon button | Ghost style, `rounded-full`, 44px min tap target on mobile |

One primary button per screen. If there are two equal actions, both are secondary.

### Inputs

**Minimize typing. Maximize pickers.** Wherever possible, use pickers, segmented controls, pill selectors, sliders, toggles, and steppers instead of text fields. Users should tap to select, not type to fill. Text fields are reserved for truly freeform content (titles, descriptions, notes).

| Input type | Use when | Component |
|-----------|----------|-----------|
| Pill picker (horizontal scroll) | 5-20 predefined options | `metadataPill()` pattern |
| Segmented control | 2-4 mutually exclusive options | `Picker(.segmented)` |
| Menu picker | 4-10 options, less visual space | `Picker(.menu)` |
| Slider | Numeric range (e.g., price $1-$100) | `Slider` with labels |
| Stepper | Small integer values (strand count, quantity) | `Stepper` |
| Toggle | Boolean on/off | `Toggle` |
| Date picker | Dates | `DatePicker` |
| Text field | Freeform text (names, titles, notes only) | Standard text field |

Styling:
- `bg-background-muted border border-border-default rounded-xl px-4 py-3`
- Focus: `ring-2 ring-coral-500/30 border-coral-500`
- Labels above inputs, not floating or inside
- Validation errors below input in `text-red-500 text-xs`, appear on blur not on every keystroke

### Empty States

Every list/collection needs an empty state. Pattern:
```
[Illustration or large SF Symbol in Content Tertiary]
[Heading: what this section is for]
[Subtext: how to get started]
[CTA button if applicable]
```

Keep copy short and actionable. "No projects yet" + "Start your first project" button. No paragraphs of explanation.

### Loading States

- Skeleton screens for content (shimmer animation on `bg-background-muted` blocks shaped like the real content)
- Spinner (`animate-spin` on Lucide Loader2 / SF Symbol `progress.indicator`) only for actions, never for page loads
- Never show a blank screen while loading

### Toasts and Feedback

- Success: brief text toast, auto-dismiss 3 seconds, no icon needed
- Error: toast with `bg-red-50 text-red-700 border-red-200` (light) or `bg-red-950 text-red-200` (dark), stays until dismissed
- Destructive confirmations: bottom sheet / alert dialog, never inline

---

## Screen Layout Patterns

### Browse / Discovery (Patterns, Feed, Stash)

```
[Search bar / filter chips]           -- sticky top
[Grid or list of cards]               -- infinite scroll, no pagination controls
[Floating action button if needed]    -- bottom-right, Coral, shadow-lg
```

### Detail View (Pattern, Project, Post)

```
[Hero image -- full width, 16:9 or cover aspect]
[Title + metadata section]
[Tab bar or segmented control for sections: Overview | Reviews | Notes]
[Section content]
[Sticky bottom bar with primary action: "Start project" / "Add to queue"]
```

### Profile (Own + Others)

Letterboxd-style:
```
[Banner / avatar area]
[Username + bio + stats row: X projects, Y patterns, Z followers]
[Follow button if viewing another user]
[Tab bar: Activity | Projects | Reviews | Stash]
[Tab content -- card lists]
```

### Heatmap (Crafting Activity)

GitHub contributions style:
```
[Year selector]
[Grid of squares -- 52 columns x 7 rows]
[Color scale: background-muted (0) -> teal-100 -> teal-300 -> teal-500 -> teal-700]
[Legend: "Less" [scale squares] "More"]
[Below: session log list for selected day]
```

Use Teal for the heatmap scale (green-adjacent, nature-inspired, distinct from Coral actions).

---

## Interaction Patterns

### Pull to Refresh

iOS: native `.refreshable {}`. Web: not needed (stale-while-revalidate pattern via SWR or React Query).

### Swipe Actions

iOS only. Right-to-left swipe for destructive (delete, remove). Left-to-right for primary (mark complete, archive). Use system colors for swipe actions.

### Optimistic Updates

All like, follow, bookmark, and counter actions update the UI immediately before the server responds. Revert silently on failure with a subtle error toast.

### Infinite Scroll

All list views use cursor-based pagination. Load next page when the user scrolls to the last 3 items. Show a small spinner at the bottom while loading. Never show "Load More" buttons.

### Haptic Feedback (iOS)

- Light impact: like, bookmark, follow
- Medium impact: counter increment
- Success notification: project completed, reached milestone

---

## Accessibility

- All interactive elements have minimum 44x44pt tap targets (iOS) / 44x44px click targets (web)
- Color is never the only indicator -- always pair with icon, label, or pattern
- All images have alt text (web) or accessibility labels (iOS)
- Focus order follows visual order
- Buttons and links have descriptive labels, not just "Click here"
- Respect reduced motion preferences: `@media (prefers-reduced-motion: reduce)` / `UIAccessibility.isReduceMotionEnabled`

---

## Animation

Keep animations subtle and purposeful. This is a content app, not a portfolio piece.

| Action | Animation |
|--------|-----------|
| Card appear (scroll) | Fade in, 200ms ease-out. No slide. |
| Like / react | Scale bounce 1.0 -> 1.2 -> 1.0, 300ms spring |
| Sheet present (iOS) | System default detent animation |
| Page transition (web) | None. Instant navigation. |
| Counter increment | Number scale pulse, 150ms |
| Skeleton shimmer | Horizontal gradient sweep, 1.5s loop |
| Progress bar fill | Width transition, 400ms ease-in-out |

No parallax. No page transition animations on web. No bouncing loaders. No confetti.

---

## Content and Copy Guidelines

- **Tone:** Friendly but not bubbly. Knowledgeable but not condescending. Like a helpful friend at a yarn shop.
- **Sentence case** for all UI text (buttons, headings, labels). Never Title Case except for proper nouns and the app name "Stitch".
- **No jargon** in primary UI. Knitting terms are fine in pattern/project context but navigation and settings use plain language.
- **Verb-first buttons:** "Start project", "Add to stash", "Save pattern". Not "Project creation" or "New".
- **Timestamps:** Relative for recent ("2h ago", "Yesterday"), absolute for older ("Mar 5, 2026"). Never show seconds.
- **Numbers:** Use compact notation for large counts ("1.2k" not "1,200") in feeds and profiles.
- **Error messages:** Say what happened and what to do. "Could not save. Check your connection and try again." Not "Error 500" or "Something went wrong!"

---

## Platform-Specific Notes

### iOS

- Use native SwiftUI components where they exist (List, NavigationStack, TabView, Sheet). Do not recreate platform conventions.
- Large title navigation bars for top-level tabs. Inline titles for detail views.
- System materials and blurs (`.ultraThinMaterial`) for overlays and toolbars.
- Respect Dynamic Type -- never hardcode font sizes. Use semantic styles (`.body`, `.headline`, `.caption`).
- Support both portrait and landscape on iPad. Portrait-only on iPhone.

### Web

- Mobile-first responsive. Design for 375px width first, then scale up.
- Use Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px).
- `framer-motion` for micro-interactions only. No route transitions.
- Images: Next.js `<Image>` with `sizes` prop and blur placeholders.
- Semantic HTML: `<main>`, `<nav>`, `<article>`, `<section>`, `<button>` (never `<div onClick>`).

---

## Component Reuse (CRITICAL)

**Never write UI patterns from scratch that already exist as shared components.** Check the component library before building anything.

### iOS Shared Components (must use)

| Need | Use | NOT |
|------|-----|-----|
| Error alert on a view | `.errorAlert(error: $viewModel.error)` | Manual `.alert("Error", isPresented: ...)` blocks |
| Loading/empty/content states | `LoadableContent(isLoading:isEmpty:content:empty:)` | Manual `if isLoading / if isEmpty / else` chains |
| Circular user avatar | `AvatarImage(url: user.avatarUrl, size: 36)` | Inline `AsyncImage` + `clipShape(Circle())` |
| Remote image with rounded corners | `RemoteImage(url: item.photoUrl, cornerRadius: 12)` | Inline `AsyncImage` + `clipShape(RoundedRectangle(...))` |
| Tab/segment picker | `SegmentTabPicker(selection: $tab)` | Inline HStack with buttons and underlines |
| Primary/secondary buttons | `StitchButton(title:style:action:)` | Inline button styling |
| Upgrade prompts | `ProGateBanner` | Custom paywall presentation |

### Web Shared Components (must use)

| Need | Use | NOT |
|------|-----|-----|
| Card container | `<Card>` or `<Card hover>` | Inline `rounded-xl bg-surface border border-border-default` |
| CSS merging | `cn(base, conditional)` from `@/lib/utils` | String concatenation of Tailwind classes |

### When to Extract a New Component

Extract when a pattern appears in **2+ places**. Create in:
- iOS: `Components/` directory (accessible to all features)
- Web: `components/ui/` (design system primitives) or `components/features/` (domain-specific)

### View File Size Limits

- **iOS views**: Keep under 300 lines. If a view exceeds this, extract sub-views into separate files in the same feature directory. The parent view should be a thin coordinator composing child components.
- **Web components**: Keep under 400 lines. Extract sections into sibling component files.
- **Web pages**: Keep under 200 lines. Pages should compose feature components, not contain layout logic.

---

## Anti-Patterns (Never Do These)

- **Duplicating shared component patterns** — writing inline error alerts, loading states, avatar images, or tab pickers instead of using the shared components listed above
- **Creating files over 500 lines** — split into sub-components immediately
- Modals for content that could be a page (use modals only for confirmations and quick pickers)
- Dropdown menus with more than 7 items (use a searchable list or bottom sheet instead)
- Disabled buttons without explanation (hide the action or show why it is unavailable)
- **Using text fields where pickers would work** — if there's a known set of options (needle sizes, yarn weights, materials, needle types), use a Picker, pill selector, or segmented control. Text fields are only for truly freeform content (titles, descriptions, notes).
- Placeholder text as the only label for an input
- Full-page loading spinners
- "Are you sure?" confirmations for reversible actions
- Auto-playing video or audio
- Tooltips on mobile (they require hover)
- Horizontal scrolling for primary content (only for secondary elements like a tag strip or image carousel)
- Skeleton screens that do not match the real layout dimensions
- Text over images without a gradient or scrim for contrast