# Stitch Design System

A comprehensive design system for the Stitch knitting application, built with Tailwind CSS and React.

## 🎨 Color Palette

### Base Colors

| Color | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| **Coral (Primary)** | `#f96743` | `#f96743` | Primary actions, CTAs, branding |
| **Teal (Secondary)** | `#06c4b2` | `#1ee0cb` | Secondary actions, success states |
| **Neutral** | Warm grays | Warm grays | Text, borders, backgrounds |

### Semantic Colors

The design system uses CSS variables that automatically adapt to light/dark mode:

```css
/* Backgrounds */
background      /* Main background */
background-subtle   /* Slightly different bg */
background-muted    /* Input backgrounds */
background-emphasis /* Hover states */

/* Surfaces (Cards, Modals) */
surface         /* Card background */
surface-raised  /* Elevated cards */
surface-overlay /* Modal overlays */

/* Text/Content */
content         /* Primary text */
content-subtle  /* Secondary text */
content-muted   /* Tertiary/placeholder */
content-inverse /* Text on dark backgrounds */

/* Borders */
border          /* Default borders */
border-subtle   /* Subtle borders */
border-emphasis /* Emphasized borders */

/* Interactive */
interactive-primary       /* Primary button */
interactive-primary-hover /* Hover state */
interactive-secondary     /* Secondary button */

/* Status */
status-success  /* Success states */
status-warning  /* Warning states */
status-error    /* Error states */
status-info     /* Info states */
```

## 📝 Typography

### Font Families

- **Display**: Baloo 2 - Fun, friendly headings
- **Sans**: Nunito - Clean, readable body text
- **Mono**: JetBrains Mono - Code snippets

### Text Sizes

```jsx
// Display (Large headlines)
<Text variant="display-2xl">72px</Text>
<Text variant="display-xl">60px</Text>
<Text variant="display-lg">48px</Text>
<Text variant="display-md">36px</Text>
<Text variant="display-sm">30px</Text>
<Text variant="display-xs">24px</Text>

// Headings
<Text variant="heading-xl">24px</Text>
<Text variant="heading-lg">20px</Text>
<Text variant="heading-md">18px</Text>
<Text variant="heading-sm">16px</Text>
<Text variant="heading-xs">14px</Text>

// Body
<Text variant="body-lg">18px</Text>
<Text variant="body-md">16px</Text>
<Text variant="body-sm">14px</Text>
<Text variant="body-xs">12px</Text>

// Labels
<Text variant="label-lg">16px semibold</Text>
<Text variant="label-md">14px semibold</Text>
<Text variant="label-sm">12px semibold</Text>
<Text variant="label-xs">10px bold uppercase</Text>
```

## 🔘 Buttons

### Variants

```jsx
// Filled buttons
<Button variant="primary">Coral gradient</Button>
<Button variant="secondary">Teal gradient</Button>
<Button variant="danger">Red gradient</Button>

// Outline buttons
<Button variant="outline">Gray border</Button>
<Button variant="outline-primary">Coral border</Button>
<Button variant="outline-secondary">Teal border</Button>

// Ghost buttons (no background)
<Button variant="ghost">Transparent</Button>
<Button variant="ghost-primary">Coral text</Button>
<Button variant="ghost-secondary">Teal text</Button>

// Soft buttons (subtle background)
<Button variant="soft">Gray background</Button>
<Button variant="soft-primary">Coral tint</Button>
<Button variant="soft-secondary">Teal tint</Button>

// Link style
<Button variant="link">Underline on hover</Button>
```

### Sizes

```jsx
<Button size="xs">Height 28px</Button>
<Button size="sm">Height 36px</Button>
<Button size="md">Height 44px (default)</Button>
<Button size="lg">Height 52px</Button>
<Button size="xl">Height 56px</Button>
```

### With Icons

```jsx
<Button leftIcon={<Plus />}>Add Item</Button>
<Button rightIcon={<ArrowRight />}>Continue</Button>
<Button loading>Loading...</Button>
```

## 🃏 Cards

### Variants

```jsx
<Card variant="default">Border, no shadow</Card>
<Card variant="elevated">With shadow</Card>
<Card variant="filled">Subtle background</Card>
<Card variant="outline">Border only</Card>
<Card variant="interactive">Clickable (hover effects)</Card>
<Card variant="primary">Coral tint</Card>
<Card variant="secondary">Teal tint</Card>
<Card variant="glass">Glassmorphism</Card>
```

### Subcomponents

```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## 📝 Inputs

### Variants

```jsx
<Input variant="default" label="Email" />
<Input variant="filled" placeholder="Filled style" />
<Input variant="outline" placeholder="Outline only" />
<Input variant="ghost" placeholder="Minimal" />
<Input variant="error" error="This field is required" />
<Input variant="success" placeholder="Valid input" />
```

### With Icons & Hints

```jsx
<Input
  label="Email"
  leftIcon={<Mail />}
  placeholder="you@example.com"
  hint="We'll never share your email"
/>
```

## 🏷️ Badges

### Variants

```jsx
// Soft backgrounds
<Badge variant="default">Gray</Badge>
<Badge variant="primary">Coral</Badge>
<Badge variant="secondary">Teal</Badge>
<Badge variant="success">Green</Badge>
<Badge variant="warning">Amber</Badge>
<Badge variant="error">Red</Badge>

// Outlined
<Badge variant="outline">Gray border</Badge>
<Badge variant="outline-primary">Coral border</Badge>

// Solid
<Badge variant="solid-primary">Coral solid</Badge>
<Badge variant="solid-secondary">Teal solid</Badge>

// Status badges (with dot)
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="error" />
```

## 👤 Avatars

```jsx
// Sizes
<Avatar size="xs" name="John" />  // 24px
<Avatar size="sm" name="John" />  // 32px
<Avatar size="md" name="John" />  // 40px
<Avatar size="lg" name="John" />  // 48px
<Avatar size="xl" name="John" />  // 64px
<Avatar size="2xl" name="John" /> // 80px

// Shapes
<Avatar variant="circle" />
<Avatar variant="rounded" />
<Avatar variant="square" />

// Colors
<Avatar color="primary" />   // Coral
<Avatar color="secondary" /> // Teal
<Avatar color="random" />    // Based on name hash

// With image
<Avatar src="/path/to/image.jpg" name="John Doe" />

// Avatar group
<AvatarGroup max={4}>
  <Avatar name="Person 1" />
  <Avatar name="Person 2" />
  <Avatar name="Person 3" />
  <Avatar name="Person 4" />
  <Avatar name="Person 5" />
</AvatarGroup>
```

## 📊 Progress

### Linear Progress

```jsx
<Progress value={50} />
<Progress value={75} color="secondary" showValue />
<Progress value={90} label="Upload progress" showValue />
<Progress value={30} size="lg" color="success" />
```

### Circular Progress

```jsx
<CircularProgress value={75} showValue />
<CircularProgress value={50} size={100} strokeWidth={6} />
<CircularProgress value={100} color="success">
  <span>🎉</span>
</CircularProgress>
```

## 🌀 Spinners

```jsx
<Spinner size="xs" />
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner size="xl" color="secondary" />

// Full page loading
<LoadingOverlay text="Loading your projects..." />
```

## 🌓 Theme Toggle

```jsx
// Icon button that cycles themes
<ThemeToggle />

// With label
<ThemeToggle showLabel />

// Full selector showing all options
<ThemeSelector />
```

## 🎭 Shadows

```jsx
// Size-based shadows
shadow-xs    // Subtle
shadow-sm    // Small
shadow-md    // Medium
shadow-lg    // Large
shadow-xl    // Extra large
shadow-2xl   // Huge

// Colored shadows
shadow-primary    // Coral glow
shadow-secondary  // Teal glow
shadow-inner      // Inset shadow
```

## 🎬 Animations

```jsx
// Available animations
animate-fade-in
animate-fade-out
animate-slide-up
animate-slide-down
animate-slide-left
animate-slide-right
animate-scale-in
animate-scale-out
animate-spin-slow
animate-pulse-slow
animate-bounce-subtle
animate-wiggle
```

## 📱 Safe Areas (Mobile)

```jsx
// Padding utilities for notches and home indicators
pt-safe    // Padding top safe area
pb-safe    // Padding bottom safe area
h-screen-safe     // Full height minus safe areas
min-h-screen-safe // Min height minus safe areas
```

## 🛠️ Utility: cn()

Combines clsx and tailwind-merge for conditional classes:

```jsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'bg-coral-500'
)} />
```

## 📁 File Structure

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Text.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       ├── Avatar.tsx
│       ├── Progress.tsx
│       ├── IconButton.tsx
│       ├── Divider.tsx
│       ├── Spinner.tsx
│       ├── ThemeToggle.tsx
│       └── index.ts
├── lib/
│   └── utils.ts      # cn() utility
├── stores/
│   └── themeStore.ts # Theme state management
└── index.css         # Design tokens & base styles
```

## 🚀 Usage

```jsx
import {
  Button,
  Card,
  Text,
  Input,
  Badge,
  Avatar,
  Progress,
  ThemeToggle,
} from '@/components/ui';
```

## 🎯 Design Principles

1. **Mobile-first**: All components optimized for touch
2. **Accessible**: Proper ARIA labels, focus states, contrast
3. **Consistent**: Same visual language throughout
4. **Fun & Friendly**: Warm colors, rounded corners, playful feel
5. **Dark mode ready**: All components work in both themes


