# Stitch Frontend

Mobile-first Progressive Web App (PWA) for Stitch - Your Intelligent Knitting Companion.

## Features

- 🎯 **Mobile-first design** - Touch-optimized UI with haptic feedback
- 📱 **PWA support** - Installable, works offline
- 🎙️ **Voice commands** - Hands-free row navigation
- 🔊 **Text-to-speech** - Have instructions read aloud
- 📊 **Progress tracking** - Visual counters with animations
- 🌙 **Dark theme** - Beautiful dark mode interface

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast builds
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React Query** for data fetching
- **Zustand** for state management
- **Workbox** for PWA/offline support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── counter/      # Row counter components
│   ├── layout/       # Layout components (header, nav)
│   ├── pattern/      # Pattern-related components
│   ├── project/      # Project-related components
│   └── ui/           # Generic UI components
├── hooks/            # Custom React hooks
│   ├── useSpeech.ts  # Text-to-speech
│   └── useVoiceCommands.ts  # Voice recognition
├── lib/              # Utilities and API client
├── pages/            # Page components
├── stores/           # Zustand stores
├── types/            # TypeScript types
└── assets/           # Static assets
```

## Key Features

### Row Counter

The counter is the heart of the app:

- **Tap to increment** - Big touch target for easy tapping while knitting
- **Haptic feedback** - Vibration on counter changes
- **Voice commands** - Say "next row", "undo", "where am I"
- **Progress ring** - Visual progress indicator
- **Instruction cards** - Current row instructions displayed

### Voice Commands

Supported commands:
- "Next" / "Next row" / "Done" - Increment counter
- "Back" / "Previous" - Decrement counter  
- "Undo" / "Oops" - Go back one row
- "Repeat" / "Read again" - Re-read current instruction
- "Where am I" / "What row" - Announce current row

### Offline Support

The app works offline with:
- Service worker caching
- Local storage for counter state
- Background sync when online

## Mobile Installation

### iOS (Safari)

1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

### Android (Chrome)

1. Open the app in Chrome
2. Tap the menu (⋮)
3. Tap "Install app" or "Add to Home Screen"

## Development

### Code Style

- ESLint for linting
- Prettier for formatting (via ESLint)
- TypeScript strict mode

### Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## API Integration

The frontend connects to the Node.js backend at `/api`. Configure the URL in `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

API client is in `src/lib/api.ts` with typed endpoints.

## Contributing

1. Create a feature branch
2. Make changes
3. Run linting: `npm run lint`
4. Submit PR

## License

MIT


