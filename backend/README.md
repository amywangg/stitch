# Stitch Backend

Node.js + Express + TypeScript API server for the Stitch knitting application.

## Features

- **Authentication**: JWT-based auth with refresh tokens
- **User Management**: Profiles, settings, followers
- **Patterns**: CRUD, sections, rows, sizes
- **Projects**: Track knitting projects with progress
- **Row Counter**: Real-time counter with voice support
- **Social**: Posts, comments, likes, follows
- **Real-time**: Socket.io for notifications and counter sync

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```
DATABASE_URL="postgresql://stitch:stitch_dev_password@localhost:5432/stitch"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
CORS_ORIGIN="http://localhost:5173"
PORT=3001
NODE_ENV=development
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to Database

```bash
npm run db:push
```

Or run migrations:

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3001`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:username` - Get user profile
- `PATCH /api/users/profile` - Update profile
- `PATCH /api/users/settings` - Update settings
- `GET /api/users/:username/projects` - User's projects
- `GET /api/users/:username/patterns` - User's patterns

### Patterns
- `GET /api/patterns` - List patterns
- `GET /api/patterns/:id` - Get pattern
- `POST /api/patterns` - Create pattern
- `PATCH /api/patterns/:id` - Update pattern
- `DELETE /api/patterns/:id` - Delete pattern
- `GET /api/patterns/:id/sections` - Get sections with rows
- `POST /api/patterns/:id/favorite` - Toggle favorite

### Projects
- `GET /api/projects/me` - My projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/gauge` - Set gauge

### Counter
- `GET /api/counter/section/:sectionId` - Get counter state
- `POST /api/counter/section/:sectionId/increment` - Next row
- `POST /api/counter/section/:sectionId/decrement` - Previous row
- `POST /api/counter/section/:sectionId/set` - Set to row
- `POST /api/counter/section/:sectionId/reset` - Reset counter
- `POST /api/counter/section/:sectionId/undo` - Undo last action
- `GET /api/counter/section/:sectionId/history` - Counter history

### Social
- `GET /api/social/feed` - Home feed
- `GET /api/social/discover` - Discover/explore
- `POST /api/social/posts` - Create post
- `POST /api/social/posts/:id/like` - Like post
- `POST /api/social/comments` - Add comment
- `POST /api/social/follow/:userId` - Follow user
- `GET /api/social/notifications` - Get notifications

## Socket.io Events

### Client -> Server
- `join:user` - Join user room for notifications
- `join:project` - Join project room for counter sync
- `counter:update` - Broadcast counter update

### Server -> Client
- `counter:updated` - Counter was updated
- `notification:new` - New notification

## Database

Uses Prisma ORM with PostgreSQL. See `prisma/schema.prisma` for the full schema.

### Commands
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio


