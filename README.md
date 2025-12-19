# Stitch 🧶

A modern knitting application for tracking projects, sharing patterns, and building community.

## Architecture

```
stitch/
├── frontend/          # React PWA (Vite + TypeScript + TailwindCSS)
├── backend/           # Node.js API server (Express + TypeScript + Prisma)
├── ai-service/        # Python service for PDF processing & AI features (FastAPI)
├── database/          # PostgreSQL schema and seed data
└── shared/            # Shared TypeScript types
```

## Features

### Core Features
- **Project Tracking**: Track your knitting projects with row counts and sections
- **Smart Row Counter**: Click or voice-activated counter with undo support
- **Pattern Library**: Store and organize patterns with row-by-row instructions
- **Measurement Tracking**: Convert "knit for 2cm" to rows based on your gauge

### Row Counter Features
- 🖱️ **Click Counter**: Tap/click to advance rows
- 🎤 **Voice Commands**: Say "next", "back", "undo", "where am I"
- 📏 **Measurement Mode**: Automatic row estimation from gauge + measurement reminders
- ↩️ **Undo Support**: Full history with undo capability
- 🔄 **Real-time Sync**: Socket.io keeps multiple devices in sync

### Social Features
- Follow other knitters
- Share project updates and photos
- Comment and like posts
- Discover new patterns

### AI Features (Python Service)
- PDF pattern parsing and translation
- Smart gauge calculations
- Measurement-to-row conversion
- AI-assisted pattern builder (coming soon)

### Marketplace (Coming Soon)
- Sell your patterns
- Purchase patterns from designers
- Reviews and ratings

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript + Vite |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma |
| **AI Service** | Python + FastAPI |
| **Real-time** | Socket.io |
| **Cache** | Redis (optional) |

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn (`corepack enable && corepack prepare yarn@4.0.0 --activate`)
- Docker & Docker Compose
- Python 3.11+ (for AI service)

### 1. Install Dependencies

```bash
# From project root
yarn install
```

### 2. Start Database

```bash
yarn db:start
# Or: cd database && docker-compose up -d
```

This starts PostgreSQL and Redis, and automatically loads the schema and seed data.

### 3. Set Up Backend

```bash
cd backend
yarn install
yarn db:generate   # Generate Prisma client
yarn dev           # Start API server on port 3001
```

### 4. Set Up Frontend

```bash
cd frontend
yarn install
yarn dev           # Start app on http://localhost:5173
```

The frontend is a mobile-first PWA with:
- Voice commands for hands-free knitting
- Haptic feedback on counter changes
- Offline support via service workers
- Install to home screen capability

### 5. Run Everything Together

```bash
# From project root
yarn dev   # Starts both frontend and backend
```

### 6. Set Up AI Service (Optional)

```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Or from root:
yarn ai:dev
```

### 6. Environment Variables

**Quick Setup:**
```bash
# Copy .env.example files to .env
./setup-env.sh

# Or manually copy each file:
cp ai-service/.env.example ai-service/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then edit each `.env` file and fill in your values:
- **Required**: OpenAI API key, JWT secrets
- **Optional**: Google OAuth, Apple OAuth

See `docs/ENVIRONMENT_SETUP.md` for detailed instructions on getting API keys.

## API Overview

### Counter API (for row tracking)
```
GET  /api/counter/section/:id          # Get counter state
POST /api/counter/section/:id/increment # Next row (supports voice input)
POST /api/counter/section/:id/decrement # Previous row
POST /api/counter/section/:id/undo     # Undo last action
```

### Patterns API
```
GET  /api/patterns                      # List patterns
POST /api/patterns                      # Create pattern
GET  /api/patterns/:id/sections         # Get sections with rows
```

### Projects API
```
GET  /api/projects/me                   # My projects
POST /api/projects                      # Create (auto-copies pattern sections)
POST /api/projects/:id/gauge            # Set gauge (recalculates row estimates)
```

## Database Schema

### Core Tables (60+ tables total)

| Category | Key Tables |
|----------|------------|
| **Users** | `users`, `user_settings`, `user_stats`, `follows` |
| **Patterns** | `patterns`, `pattern_sizes`, `pattern_sections`, `pattern_rows` |
| **Projects** | `projects`, `project_sections`, `project_photos`, `project_time_sessions` |
| **Counter** | `row_counter_history`, `project_measurements` |
| **Yarn** | `yarns`, `yarn_companies`, `user_stash`, `yarn_colorways` |
| **Tools** | `user_needles`, `needle_size_chart`, `standard_measurements` |
| **Social** | `posts`, `comments`, `likes`, `groups`, `knit_alongs` |
| **Marketplace** | `pattern_listings`, `purchases`, `pattern_reviews`, `designer_profiles` |

See `/database/schema.sql` for the complete schema (74 tables).
See `/docs/FEATURES.md` for the full feature comparison with Ravelry.

## Unique Features

🧠 **AI-Powered**
- PDF pattern parsing into structured rows
- Size-filtered instructions (see only your size)
- Voice-controlled row navigation
- Smart row estimation from measurements

📊 **Comprehensive Tracking**
- Progress photos with row/percentage context
- Time tracking per session
- Yarn usage per project
- Needle inventory

🧶 **Full Ravelry Feature Parity**
- Pattern marketplace
- Yarn database + stash management
- Groups & knit-alongs
- Designer storefronts


