---
name: api-design
description: "API design standards for Next.js App Router route handlers in Stitch. Use when: (1) creating or modifying any file under apps/web/app/api/, (2) adding GET, POST, PATCH, or DELETE route handlers, (3) implementing pagination, input validation, error responses, or authorization, (4) adding Ravelry sync push logic to a route, (5) adding Pro-gating or free tier limits, (6) working with Zod schemas or response formatting."
---

# API Design Standards

Every API route in Stitch follows these patterns. Consistency across routes means less cognitive load for contributors and predictable behavior for clients (web and iOS).

---

## Route File Structure

All routes live under `apps/web/app/api/v1/{domain}/route.ts`. Nested resources use `[id]` segments.

```
apps/web/app/api/v1/
  projects/
    route.ts                    # GET (list), POST (create)
    [id]/
      route.ts                  # GET (detail), PATCH (update), DELETE
      sections/
        route.ts                # GET (list), POST (create)
        [sectionId]/
          route.ts              # PATCH, DELETE
  patterns/
    route.ts
    [id]/
      route.ts
  stash/
    route.ts
    [id]/
      route.ts
```

**Naming:** Domain names are plural (`projects`, `patterns`, `stash`). Parameter segments match the model's primary key field (`[id]`, `[sectionId]`).

---

## Handler Skeleton

Every route handler follows the same structure:

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const user = await getDbUser(clerkId)

  // 2. Pro-gate (if applicable)
  const proError = requirePro(user, 'feature name')
  if (proError) return proError

  // 3. Parse and validate input
  const body = await req.json()
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodErrors(parsed.error) } },
      { status: 400 }
    )
  }

  // 4. Business logic
  const project = await prisma.projects.create({
    data: { ...parsed.data, user_id: user.id },
  })

  // 5. Side effects (Ravelry push, activity events, notifications)
  // Fire-and-forget for non-critical side effects
  const push = await getRavelryPushClient(user.id)
  if (push) {
    pushToRavelry(() => push.client.createProject({ name: project.title }))
  }

  // 6. Return structured response
  return NextResponse.json({ success: true, data: project }, { status: 201 })
}
```

**Order matters.** Auth first, then pro-gate, then validation, then business logic, then side effects, then response. Never rearrange.

---

## Input Validation with Zod

Every route that accepts input (POST, PATCH, PUT) must define a Zod schema. Schemas live in `apps/web/lib/schemas/{domain}.ts`.

### Schema file pattern

```typescript
// apps/web/lib/schemas/projects.ts
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  craft_type: z.enum(['knitting', 'crochet']).default('knitting'),
  pattern_id: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  is_public: z.boolean().default(false),
})

export const UpdateProjectSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['active', 'completed', 'frogged', 'hibernating']).optional(),
  craft_type: z.enum(['knitting', 'crochet']).optional(),
  notes: z.string().max(5000).optional(),
  is_public: z.boolean().optional(),
  started_at: z.string().datetime().optional(),
  finished_at: z.string().datetime().optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
```

### Validation rules

| Field type | Validation |
|------------|-----------|
| String (name/title) | `.trim().min(1).max(200)` |
| String (long text) | `.max(5000)` |
| String (enum) | `.enum([...values])` |
| UUID reference | `.string().uuid()` |
| Integer | `.number().int().min(0)` |
| Boolean | `.boolean()` |
| Optional field | `.optional()` on PATCH schemas, required on POST |
| Array | `.array(itemSchema).max(50)` with reasonable bounds |
| Date | `.string().datetime()` (ISO 8601) |

### Error formatting helper

```typescript
// apps/web/lib/validation.ts
import { ZodError } from 'zod'

export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!fields[path]) fields[path] = []
    fields[path].push(issue.message)
  }
  return fields
}
```

### PATCH schemas use allowlists implicitly

With Zod, you define only the fields that can be updated. No need for manual allowlist iteration. `parsed.data` only contains valid, sanitized fields.

```typescript
const parsed = UpdateProjectSchema.safeParse(body)
if (!parsed.success) return validationError(parsed.error)
// parsed.data has ONLY valid fields, nothing extra
await prisma.projects.update({ where: { id }, data: parsed.data })
```

---

## Error Responses

### Standard error shape

Every error returns this structure:

```typescript
{
  error: {
    code: string,       // machine-readable error code
    message: string,    // human-readable description
    fields?: Record<string, string[]>  // field-level errors (validation only)
  }
}
```

### Error codes and status mapping

| Code | HTTP Status | When |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | No Clerk token or invalid session |
| `FORBIDDEN` | 403 | User does not own the resource |
| `PRO_REQUIRED` | 403 | Feature requires Pro subscription |
| `FREE_LIMIT_REACHED` | 403 | Free tier quota exceeded |
| `NOT_FOUND` | 404 | Resource does not exist or is soft-deleted |
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `CONFLICT` | 409 | Duplicate entry or concurrent operation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `EXTERNAL_SERVICE_ERROR` | 502 | Ravelry / OpenAI API failure |

### Error helper functions

```typescript
// apps/web/lib/errors.ts
import { NextResponse } from 'next/server'

export function unauthorized() {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    { status: 401 }
  )
}

export function forbidden(message = 'Not authorized') {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  )
}

export function notFound(resource = 'Resource') {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: `${resource} not found` } },
    { status: 404 }
  )
}

export function validationError(zodError: ZodError) {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodErrors(zodError) } },
    { status: 400 }
  )
}

export function conflict(message: string) {
  return NextResponse.json(
    { error: { code: 'CONFLICT', message } },
    { status: 409 }
  )
}

export function rateLimited() {
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
    { status: 429 }
  )
}
```

**Always return errors, never throw.** Next.js App Router route handlers should use `return NextResponse.json(...)`, not `throw new Error(...)`.

---

## Success Responses

### Standard success shape

```typescript
// Single resource
{ success: true, data: Resource }

// Created resource
{ success: true, data: Resource }  // status: 201

// Paginated list
{
  success: true,
  data: {
    items: Resource[],
    total: number,
    page: number,
    pageSize: number,
    hasMore: boolean
  }
}

// Empty success (delete, side-effect operations)
{ success: true }  // status: 200
```

---

## Pagination

All list endpoints use offset-based pagination with a consistent interface.

### Query parameters

| Param | Type | Default | Max | Notes |
|-------|------|---------|-----|-------|
| `page` | int | 1 | -- | Must be >= 1 |
| `pageSize` | int | 20 | 50 | Clamped to 1-50 |
| `sortBy` | string | `created_at` | -- | Must be an allowed field |
| `sortOrder` | string | `desc` | -- | `asc` or `desc` |

### Pagination helper

```typescript
// apps/web/lib/pagination.ts
import { NextRequest } from 'next/server'

export interface PaginationParams {
  page: number
  pageSize: number
  skip: number
  take: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export function parsePagination(
  req: NextRequest,
  options?: { defaultSort?: string; allowedSorts?: string[] }
): PaginationParams {
  const url = req.nextUrl
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')))
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  let sortBy = url.searchParams.get('sortBy') ?? options?.defaultSort ?? 'created_at'
  if (options?.allowedSorts && !options.allowedSorts.includes(sortBy)) {
    sortBy = options.defaultSort ?? 'created_at'
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sortBy,
    sortOrder,
  }
}

export function paginatedResponse<T>(items: T[], total: number, params: PaginationParams) {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    hasMore: params.skip + items.length < total,
  }
}
```

### Usage in route

```typescript
export async function GET(req: NextRequest) {
  // ... auth ...
  const pagination = parsePagination(req, {
    defaultSort: 'updated_at',
    allowedSorts: ['created_at', 'updated_at', 'title'],
  })

  const [items, total] = await Promise.all([
    prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null },
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.projects.count({
      where: { user_id: user.id, deleted_at: null },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: paginatedResponse(items, total, pagination),
  })
}
```

### Future: cursor-based pagination

For the social feed (where offset pagination performs poorly on large datasets), use cursor-based pagination:

```typescript
// Query param: ?cursor=2026-03-12T10:00:00Z&pageSize=20
const cursor = url.searchParams.get('cursor')

const items = await prisma.activity_events.findMany({
  where: {
    user_id: { in: followedUserIds },
    ...(cursor ? { created_at: { lt: new Date(cursor) } } : {}),
  },
  orderBy: { created_at: 'desc' },
  take: pageSize + 1,  // fetch one extra to determine hasMore
})

const hasMore = items.length > pageSize
if (hasMore) items.pop()
const nextCursor = hasMore ? items[items.length - 1].created_at.toISOString() : null

return { items, nextCursor, hasMore }
```

Use cursor pagination for: feed, notifications, activity timeline. Use offset pagination for everything else.

---

## Authorization

### Resource ownership check

Every route that accesses a specific resource must verify ownership:

```typescript
const project = await prisma.projects.findFirst({
  where: { id: params.id, user_id: user.id, deleted_at: null },
})
if (!project) return notFound('Project')
```

**Always combine `id` + `user_id` in the where clause.** Never fetch by `id` alone and then check `user_id` separately -- that leaks existence of other users' resources through timing differences.

### Public resources

Some resources are publicly readable (user profiles, public projects, public patterns). For these, use separate query logic:

```typescript
// Own resource: filter by user_id
const mine = await prisma.projects.findFirst({ where: { id, user_id: user.id, deleted_at: null } })

// Public resource: filter by is_public (no user_id constraint)
const pub = await prisma.projects.findFirst({ where: { id, is_public: true, deleted_at: null } })
```

### Pro-gating

```typescript
import { requirePro } from '@/lib/pro-gate'

// Returns a 403 NextResponse if user is not Pro, or null if they are
const proError = requirePro(user, 'PDF parsing')
if (proError) return proError
```

For free tier limits (e.g., 3 active projects):

```typescript
import { FREE_LIMITS } from '@/lib/pro-gate'

if (!user.is_pro) {
  const count = await prisma.projects.count({
    where: { user_id: user.id, status: 'active', deleted_at: null },
  })
  if (count >= FREE_LIMITS.activeProjects) {
    return NextResponse.json(
      { error: { code: 'FREE_LIMIT_REACHED', message: 'Free plan allows 3 active projects', upgrade_url: '/settings/subscription' } },
      { status: 403 }
    )
  }
}
```

---

## Soft Deletes

### Which models use soft deletes

- `projects` -- user content, may be referenced by activity events
- `patterns` -- user content, may be referenced by projects and reviews
- `posts` -- social content, may have comments and likes
- `comments` -- preserves thread structure when deleted

### Rules

1. **Always filter `deleted_at: null`** in queries for soft-deleted models. No exceptions.
2. **Soft delete sets `deleted_at: new Date()`**, never removes the row.
3. **Cascade consideration:** Soft-deleting a project does NOT soft-delete its sections. Sections are structural and follow the project's visibility.
4. **Counts exclude soft-deleted records** (for free tier limits, profile stats, etc.).
5. **Unique constraints must account for soft deletes.** If a user deletes a project with slug "my-scarf" and creates a new one with the same name, the slug must not conflict. Add `deleted_at` to unique constraints or generate a new slug.

### Soft delete helper

```typescript
// In PATCH/DELETE route:
await prisma.projects.update({
  where: { id },
  data: { deleted_at: new Date() },
})
return NextResponse.json({ success: true })
```

---

## Ravelry Sync Pattern

### When to push to Ravelry

- **CREATE:** Await the Ravelry call to capture `ravelry_id` and `ravelry_permalink`. Catch errors gracefully -- the Stitch record is still created.
- **UPDATE:** Fire-and-forget. Do not block the response on Ravelry.
- **DELETE:** Fire-and-forget. Do not block the response on Ravelry.

### Pattern

```typescript
import { getRavelryPushClient, pushToRavelry } from '@/lib/ravelry-push'

// After creating a project in Stitch:
const push = await getRavelryPushClient(user.id)
if (push && project.ravelry_permalink) {
  // UPDATE/DELETE: fire-and-forget
  pushToRavelry(() => push.client.updateProject(project.ravelry_permalink!, { status_name: 'Finished' }))
}

if (push) {
  // CREATE: await to capture IDs
  try {
    const { project: rp } = await push.client.createProject({ name: project.title })
    await prisma.projects.update({
      where: { id: project.id },
      data: { ravelry_id: String(rp.id), ravelry_permalink: rp.permalink },
    })
  } catch {
    // Ravelry unavailable -- project still exists in Stitch
  }
}
```

### Rules

1. **Never block Stitch operations on Ravelry failures.** The user's action in Stitch always succeeds.
2. **Only push if `sync_to_ravelry` is true** (checked inside `getRavelryPushClient`).
3. **Log Ravelry push errors** but do not surface them to the user.
4. **Side effects (Ravelry push, activity events, notifications) go after the primary database operation**, never before.

---

## Rate Limiting

### When to rate limit

- AI routes (expensive LLM calls): 10 requests/minute per user
- PDF parsing: 5 requests/minute per user
- Social actions (post, comment): 30 requests/minute per user
- Counter increment: 120 requests/minute per user (rapid tapping)
- Auth-required routes: 60 requests/minute per user (general)

### Implementation

Use an in-memory rate limiter for now (`Map<string, { count, resetAt }>`). Graduate to Redis (`@upstash/ratelimit`) when deploying to production with multiple serverless instances.

```typescript
// apps/web/lib/rate-limit.ts
const limiters = new Map<string, Map<string, { count: number; resetAt: number }>>()

export function rateLimit(key: string, userId: string, maxRequests: number, windowMs: number): boolean {
  if (!limiters.has(key)) limiters.set(key, new Map())
  const limiter = limiters.get(key)!
  const now = Date.now()
  const entry = limiter.get(userId)

  if (!entry || now > entry.resetAt) {
    limiter.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}
```

Usage:
```typescript
if (!rateLimit('ai-parse', user.id, 10, 60_000)) {
  return rateLimited()
}
```

---

## Response Shaping

### Include only what the client needs

Use Prisma `select` for list endpoints to reduce payload size. Use `include` for detail endpoints where the client needs nested data.

```typescript
// List: select only needed fields
const items = await prisma.projects.findMany({
  where: { user_id: user.id, deleted_at: null },
  select: {
    id: true,
    title: true,
    status: true,
    craft_type: true,
    cover_image_url: true,
    updated_at: true,
    _count: { select: { sections: true } },
  },
  ...pagination,
})

// Detail: include nested resources
const project = await prisma.projects.findFirst({
  where: { id, user_id: user.id, deleted_at: null },
  include: {
    sections: { orderBy: { sort_order: 'asc' } },
    gauge: true,
    photos: { orderBy: { sort_order: 'asc' } },
    yarns: { include: { yarn: { include: { company: true } } } },
  },
})
```

### Nested user data

When returning resources that reference a user (posts, comments, activity events), always include a minimal user object:

```typescript
include: {
  user: {
    select: { id: true, username: true, display_name: true, avatar_url: true },
  },
}
```

Never expose `clerk_id`, `email`, or `is_pro` in responses for other users.

---

## Slug Generation

Projects and patterns use slugs for URL-friendly identifiers. Slugs must be unique per user.

```typescript
import { slugify } from '@/lib/utils'

async function generateUniqueSlug(title: string, userId: string, model: 'projects' | 'patterns'): Promise<string> {
  const base = slugify(title)
  let slug = base
  let counter = 1

  while (true) {
    const existing = await prisma[model].findFirst({
      where: { user_id: userId, slug, deleted_at: null },
    })
    if (!existing) return slug
    slug = `${base}-${counter}`
    counter++
  }
}
```

Centralize this in `apps/web/lib/utils.ts`. Do not duplicate slug logic across routes.

---

## Transactions

Use Prisma transactions when multiple writes must succeed or fail together:

```typescript
// Counter increment with history
const [section] = await prisma.$transaction([
  prisma.project_sections.update({
    where: { id: sectionId },
    data: { current_row: { increment: 1 } },
  }),
  prisma.row_counter_history.create({
    data: { section_id: sectionId, action: 'increment', row_number: newRow },
  }),
])
```

**When to use transactions:**
- Counter operations (update + history)
- Creating a resource + its children (project + sections)
- Activity event creation (should be atomic with triggering action)
- Ravelry sync (upsert multiple related records)

**When NOT to use transactions:**
- Simple CRUD (single create/update/delete)
- Read-only queries
- Fire-and-forget side effects (Ravelry push, notifications)

---

## Anti-Patterns (Never Do These)

- Throwing errors instead of returning `NextResponse.json(...)` in route handlers
- Fetching by `id` alone without `user_id` in the where clause (authorization bypass)
- Using `findUnique` with only `id` then checking `user_id` after (timing leak)
- Accepting unbounded arrays or strings (always set `.max()`)
- Manual field allowlist iteration instead of Zod schemas
- Returning raw Prisma errors to the client
- Mixing `page_size` and `pageSize` naming in query params
- Hardcoding page sizes that differ across routes without reason
- Putting business logic inside the Zod schema (validation only)
- Nesting try/catch for control flow instead of using early returns
- Calling `req.json()` without wrapping in try/catch (malformed JSON crashes the handler)
- Running Ravelry push before the primary database write
- Using `deleteMany` without a `user_id` filter
