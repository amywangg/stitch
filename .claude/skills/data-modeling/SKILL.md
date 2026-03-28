---
name: data-modeling
description: "Prisma schema conventions and database modeling standards for Stitch. Use when: (1) adding or modifying models in packages/db/prisma/schema.prisma, (2) adding fields, indexes, relations, or unique constraints, (3) deciding on ID types, timestamps, soft deletes, or cascade behavior, (4) adding Ravelry sync fields to a model, (5) running db:push, db:generate, or db:migrate, (6) discussing database design or query patterns."
---

# Data Modeling Standards

All database models in Stitch are defined in `packages/db/prisma/schema.prisma`. This is the single source of truth for the database schema. These standards ensure consistency, performance, and maintainability as the schema grows.

---

## Naming Conventions

### Models

- **Lowercase plural snake_case**: `projects`, `pattern_sections`, `user_stash`
- Multi-word models use underscores: `row_counter_history`, `activity_events`, `yarn_companies`
- Join tables combine both model names: `project_tags`, `pattern_tags`, `post_bookmarks`

### Fields

- **Lowercase snake_case**: `user_id`, `created_at`, `craft_type`, `is_public`
- Foreign keys: `{referenced_model_singular}_id` -- e.g., `user_id`, `project_id`, `pattern_id`
- Booleans: prefix with `is_` or `has_` -- e.g., `is_public`, `is_pro`, `has_imported`
- Timestamps: suffix with `_at` -- e.g., `created_at`, `synced_at`, `finished_at`
- Status fields: named `status` (never `state` or `current_status`)

### Relations

- Back-relation fields use the **plural model name**: `projects`, `comments`, `sections`
- Self-referential relations use descriptive names: `followers` / `following` (not `users1` / `users2`)
- Named relations (when a model has multiple FKs to the same target): `@relation("follower", ...)` and `@relation("following", ...)`

### Indexes

- Named with `@@index` using the field list -- Prisma auto-generates names
- Composite indexes list the most selective field first

---

## Standard Columns

Every model gets these columns unless there is a specific reason not to:

### Required on all models

```prisma
id         String   @id @default(uuid())
created_at DateTime @default(now())
```

### Required on mutable models

Models whose rows are updated after creation also get:

```prisma
updated_at DateTime @default(now()) @updatedAt
```

**CRITICAL:** Always include `@default(now())` alongside `@updatedAt`. Without `@default(now())`, adding `updated_at` to a table that already has rows will fail because Prisma cannot backfill a required column with no default. The `@default(now())` handles both existing rows and new rows, while `@updatedAt` ensures the field auto-updates on every subsequent write.

**Immutable models** (join tables, history/log entries, events) skip `updated_at`:
- `project_tags`, `pattern_tags`, `post_bookmarks` (join tables)
- `row_counter_history` (append-only log)
- `activity_events` (immutable timeline)
- `crafting_sessions` (logged, not edited)
- `likes`, `follows` (toggle on/off by create/delete, never update)

### When to add `deleted_at`

```prisma
deleted_at DateTime?
```

Add soft deletes to models that:
1. **Are user-created content** that may be referenced elsewhere (projects, patterns, posts, comments)
2. **Need recoverability** -- the user might want to undo
3. **Are referenced by activity events** -- hard-deleting would orphan feed items

Do NOT add soft deletes to:
- Structural/child data (sections, rows, photos) -- these follow their parent
- Join tables (tags, bookmarks) -- recreate instead of undelete
- System records (subscriptions, connections) -- managed by webhooks
- Log entries (counter history, crafting sessions) -- append-only

### Current soft-delete models

`projects`, `patterns`, `posts`, `comments`, `pattern_queue`

**Rule of thumb:** If a user can "remove" something from a list (queue, library, stash) and might want to undo it, or if the record is referenced by activity events, add `deleted_at`. When in doubt for user-facing content, add it — it's cheap and prevents data loss.

---

## ID Strategy

All primary keys use UUID v4:

```prisma
id String @id @default(uuid())
```

**Why UUID over autoincrement:**
- Safe to expose in URLs (no sequential guessing)
- Client can generate IDs optimistically
- No conflicts across environments (dev/staging/prod)
- Works with distributed systems and Ravelry sync

**Exception:** `saved_patterns.ravelry_id` uses `Int` because Ravelry's API returns integer IDs. Store these as-is for direct API compatibility.

---

## Field Types

| Concept | Prisma Type | Notes |
|---------|-------------|-------|
| Primary key | `String @id @default(uuid())` | Always |
| Foreign key | `String` | Matches referenced model's ID type |
| Short text (title, name) | `String` | Validated to max 200 chars at API layer |
| Long text (notes, content) | `String` | Validated to max 5000 chars at API layer |
| Rich text / markdown | `String` | Same as long text, rendered client-side |
| Boolean flag | `Boolean @default(false)` | Always provide a default |
| Integer count | `Int @default(0)` | Counters, sort orders, quantities |
| Decimal measurement | `Float` | Gauge, measurements (stored in cm) |
| Timestamp | `DateTime @default(now())` | Always UTC |
| Date (no time) | `DateTime @db.Date` | Crafting session dates, heatmap |
| Enum-like status | `String` | With `@default("value")`, validated at API |
| Flexible metadata | `Json?` | Only for truly variable-shape data |
| URL / path | `String?` | Image URLs, file paths |

### When to use `Json` fields

Use `Json` only when the shape genuinely varies per row:
- `activity_events.metadata` -- different payload per event type (milestone value, rating, duration)
- `ravelry_connections.import_stats` -- batch import counts

Never use `Json` for data that has a consistent shape. Use proper columns instead. Querying inside JSON is slow and unindexed.

---

## Enums

Stitch uses **string fields with documented values** rather than Prisma `enum` blocks. This is intentional:

- Adding a new enum value in Prisma requires a migration. Adding a string value requires no schema change.
- API validation with Zod catches invalid values at the boundary.
- Client code uses TypeScript union types for type safety.

### Documenting enum values

Add a comment above the field listing valid values:

```prisma
// "active" | "completed" | "frogged" | "hibernating"
status      String   @default("active")
```

### Common enum sets

**Project status:** `active`, `completed`, `frogged`, `hibernating`
**Craft type:** `knitting`, `crochet`
**Stash status:** `in_stash`, `used_up`, `gifted`, `for_sale`
**Needle type:** `straight`, `circular`, `dpn`, `crochet_hook`
**Yarn weight:** `lace`, `fingering`, `sport`, `dk`, `worsted`, `aran`, `bulky`, `super_bulky`
**Activity type:** `project_started`, `project_completed`, `project_frogged`, `pattern_saved`, `pattern_queued`, `review_posted`, `stash_added`, `row_milestone`, `session_logged`
**Notification type:** `follow`, `like`, `comment`, `mention`
**Import status:** `idle`, `importing`, `done`, `error`
**PDF status:** `pending`, `parsed`, `failed`
**Subscription plan:** `free`, `pro`
**Subscription status:** `active`, `expired`, `cancelled`

---

## Index Strategy

### Always index

1. **EVERY foreign key column** — no exceptions. Even if the FK is only used in JOINs today, it will likely appear in WHERE clauses as features grow. Missing FK indexes cause full table scans that are invisible until the table is large enough to hurt.
2. **Timestamp fields** used for sorting or range queries: `created_at` on feed-visible models
3. **Status fields** used for filtering: `deleted_at` (soft delete queries)
4. **Unique lookup fields**: `clerk_id`, `username`, `email`, `slug`

**Audit lesson:** The codebase audit found 5 missing FK indexes (`company_id` on yarns, `yarn_id` and `stash_item_id` on project_yarns, `user_id` on likes and comments, `post_id` and `user_id` on post_bookmarks). When adding a relation, always add `@@index([fk_field])` in the same edit.

### Composite indexes

Create composite indexes when queries consistently filter on multiple columns:

```prisma
// Feed queries: "all events for these users, newest first"
@@index([user_id, created_at])

// Quota checks: "how many PDFs has this user uploaded this month"
@@index([user_id, created_at])

// Heatmap: "sessions for this user on a date range"
@@index([user_id, date])

// Slug uniqueness within a user
@@unique([user_id, slug])

// Ravelry dedup
@@unique([user_id, ravelry_id])
```

### Index ordering

In composite indexes, place the **most selective (highest cardinality) column first**:
- `[user_id, created_at]` -- user_id narrows to one user, then created_at sorts within
- `[user_id, status]` -- not `[status, user_id]` because status has only 4 values

### Do not index

- Boolean fields with low selectivity (`is_public` with 90% false -- scan is fine)
- Fields only used in JOINs where the FK is already indexed
- JSON fields (Prisma does not support JSON path indexes)
- Columns only used in SELECT, not WHERE/ORDER BY

---

## Relationship Patterns

### One-to-one

Use `@unique` on the foreign key:

```prisma
model subscriptions {
  id      String @id @default(uuid())
  user_id String @unique
  user    users  @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

### One-to-many

Standard foreign key with back-relation:

```prisma
model projects {
  id       String             @id @default(uuid())
  user_id  String
  user     users              @relation(fields: [user_id], references: [id], onDelete: Cascade)
  sections project_sections[]

  @@index([user_id])
}

model project_sections {
  id         String   @id @default(uuid())
  project_id String
  project    projects @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id])
}
```

### Many-to-many (join table)

Use a composite primary key:

```prisma
model project_tags {
  project_id String
  tag_id     String
  project    projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
  tag        tags     @relation(fields: [tag_id], references: [id], onDelete: Cascade)

  @@id([project_id, tag_id])
}
```

### Polymorphic (one of N parents)

When a model can belong to different parent types (comments on posts OR activity events):

```prisma
model comments {
  id                String           @id @default(uuid())
  user_id           String

  // Exactly one of these must be non-null (enforced at API layer)
  post_id           String?
  activity_event_id String?

  post              posts?           @relation(fields: [post_id], references: [id], onDelete: Cascade)
  activity_event    activity_events? @relation(fields: [activity_event_id], references: [id], onDelete: Cascade)

  @@index([post_id])
  @@index([activity_event_id])
}
```

**Validation rule:** The API must ensure exactly one parent FK is set. Prisma does not support cross-column check constraints. Validate in the Zod schema:

```typescript
const CreateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  post_id: z.string().uuid().optional(),
  activity_event_id: z.string().uuid().optional(),
}).refine(
  (data) => Boolean(data.post_id) !== Boolean(data.activity_event_id),
  { message: 'Exactly one of post_id or activity_event_id must be provided' }
)
```

### Self-referential (follows)

```prisma
model follows {
  id           String @id @default(uuid())
  follower_id  String
  following_id String
  follower     users  @relation("follower", fields: [follower_id], references: [id], onDelete: Cascade)
  following    users  @relation("following", fields: [following_id], references: [id], onDelete: Cascade)

  @@unique([follower_id, following_id])
  @@index([follower_id])
  @@index([following_id])
}
```

---

## Cascade Delete Behavior

| Scenario | Behavior |
|----------|----------|
| User deleted | Cascade all owned data (projects, patterns, posts, stash, etc.) |
| Project soft-deleted | Sections, photos, yarns, gauge remain (hidden with parent) |
| Project hard-deleted | Cascade sections, photos, yarns, gauge, counter history |
| Pattern soft-deleted | Sections, rows, sizes remain (hidden with parent) |
| Post soft-deleted | Comments and likes remain (UI hides them with parent) |
| Pattern deleted from project | `SetNull` on `projects.pattern_id` (project survives) |
| Project removed from post | `SetNull` on `posts.project_id` (post survives) |

Use `onDelete: Cascade` for parent-child ownership. Use `onDelete: SetNull` for optional references where the child should survive.

---

## Ravelry Sync Fields

Models that sync with Ravelry include these fields:

```prisma
ravelry_id        String?   // Ravelry's internal ID (store as String for consistency)
ravelry_permalink String?   // URL-friendly slug on Ravelry (projects only)
```

### Which models have Ravelry fields

| Model | Fields | Unique constraint |
|-------|--------|-------------------|
| `projects` | `ravelry_id`, `ravelry_permalink` | `@@unique([user_id, ravelry_id])` |
| `patterns` | `ravelry_id` | `@@unique([user_id, ravelry_id])` |
| `user_stash` | `ravelry_id` | `@@unique([user_id, ravelry_id])` |
| `user_needles` | `ravelry_id` | `@@unique([user_id, ravelry_id])` |
| `pattern_queue` | `ravelry_queue_id` | `@@unique([user_id, ravelry_queue_id])` |
| `yarns` | `ravelry_id` | `@unique` (global catalog) |
| `saved_patterns` | `ravelry_id` (Int) | `@@unique([user_id, ravelry_id])` |

### Sync tracking on `ravelry_connections`

```prisma
synced_at          DateTime?  // last full sync
stash_synced_at    DateTime?  // per-type incremental timestamps
projects_synced_at DateTime?
queue_synced_at    DateTime?
needles_synced_at  DateTime?
import_status      String     @default("idle")  // "idle" | "importing" | "done" | "error"
import_stats       Json?      // { projects: 12, patterns: 45, ... }
import_error       String?
sync_to_ravelry    Boolean    @default(false)    // user-controlled write-back toggle
```

### Rules for Ravelry fields

1. `ravelry_id` is always **optional** (`String?`) -- not all records come from Ravelry
2. The `@@unique([user_id, ravelry_id])` constraint prevents duplicate imports
3. During sync, use `upsert` with the unique constraint to avoid duplicates
4. `ravelry_permalink` is only used for projects (Ravelry URLs use permalinks, not IDs)
5. `saved_patterns.ravelry_id` is `Int` (matches Ravelry's integer API), all others are `String`

---

## Adding a New Model Checklist

When adding a new table to `schema.prisma`:

1. **Name:** lowercase plural snake_case
2. **ID:** `id String @id @default(uuid())`
3. **Timestamps:** `created_at DateTime @default(now())` always; add `updated_at DateTime @default(now()) @updatedAt` if mutable
4. **Soft delete:** Add `deleted_at DateTime?` if the model is user-created content that may be referenced elsewhere
5. **Foreign keys:** `{model}_id String` with `@relation` and `onDelete` behavior
6. **Indexes:** `@@index` on every FK used in WHERE clauses; composite indexes for common query patterns
7. **Unique constraints:** `@@unique` for business-rule uniqueness (one review per user per pattern, unique slug per user, etc.)
8. **Defaults:** Provide `@default` for every field that has a sensible default
9. **Back-relations:** Add the reverse relation array on the parent model
10. **Ravelry fields:** Add `ravelry_id String?` and appropriate unique constraint if the model syncs with Ravelry

### After schema changes

```bash
# Validate the schema compiles
cd packages/db && npx prisma validate

# Push to local dev database
pnpm db:push

# Regenerate the Prisma client
pnpm db:generate
```

Always run all three in order. `db:push` without `db:generate` means the client types are stale.

---

## Migration Strategy

### Development (local)

Use `pnpm db:push` for rapid iteration. This directly syncs the schema to the database without creating migration files. Acceptable for:
- Adding new models
- Adding new fields with defaults
- Adding indexes

**Caution:** `db:push` may warn about data loss for destructive changes (removing columns, changing types). On a fresh local DB, accept the warning. On a DB with data you care about, use migrations instead.

### Production

Use `pnpm db:migrate` which reads migration files from `packages/db/prisma/migrations/`. Create migrations with:

```bash
cd packages/db
npx prisma migrate dev --name descriptive_name
```

This generates a SQL migration file and applies it. Commit the migration file to git.

**Migration naming:** `add_user_measurements`, `add_activity_events_project_index`, `rename_stash_status`. Descriptive, lowercase, underscored.

---

## Query Performance Guidelines

### Use `select` for list endpoints

Don't fetch full objects when listing. Select only the fields the client needs:

```prisma
// Good: select only needed fields
prisma.projects.findMany({
  select: { id: true, title: true, status: true, cover_image_url: true, updated_at: true },
})

// Avoid: fetching everything including notes, all relations
prisma.projects.findMany({
  include: { sections: true, gauge: true, photos: true, yarns: true },
})
```

### Use `_count` for aggregates

Instead of fetching related records to count them:

```prisma
// Good
prisma.projects.findMany({
  select: {
    id: true,
    title: true,
    _count: { select: { sections: true, photos: true } },
  },
})

// Avoid
const project = await prisma.projects.findFirst({ include: { sections: true } })
const sectionCount = project.sections.length  // fetched all sections just to count
```

### Parallel queries with `Promise.all`

When fetching items and their total count for pagination:

```typescript
const [items, total] = await Promise.all([
  prisma.projects.findMany({ where, skip, take, orderBy }),
  prisma.projects.count({ where }),
])
```

### Batch operations in sync

When importing from Ravelry, use `createMany` for bulk inserts and batch concurrent detail fetches:

```typescript
// Bulk insert (skip duplicates)
await prisma.user_stash.createMany({
  data: stashItems,
  skipDuplicates: true,
})
```

---

## Anti-Patterns (Never Do These)

### Schema design
- Using `autoincrement()` for IDs (sequential, guessable, environment-dependent)
- Storing enum values not documented in schema comments
- Adding a JSON field when the shape is consistent (use proper columns)
- Using camelCase for field names (breaks convention, confuses Prisma client mapping)
- Circular cascade deletes (A cascades to B, B cascades to A)
- Missing `onDelete` behavior on relations (defaults to `Restrict`, which blocks deletes)
- Adding `updated_at` to immutable/append-only models (misleading)
- Storing derived data (counts, aggregates) as columns instead of computing them — **exception**: `sales_count` and `rating`/`rating_count` on `patterns` are denormalized for sort/display performance. Update them via aggregate queries after mutations.

### Marketplace and payment models
- **Purchase tables use `@@unique([buyer_id, resource_id])`** — one purchase per user per resource. Use upsert for idempotency.
- **Store price at time of purchase** — never reference current price from the parent. Prices change; the purchase record is a snapshot.
- **Stripe IDs go in dedicated columns** with `@unique` — `stripe_session_id`, `stripe_connect_id`, `stripe_payment_intent`. Index these for webhook lookups.
- **Status columns on payment records** — use string enums: `"pending" | "completed" | "refunded"`. Always filter on status in queries (a pending purchase is NOT an active purchase).
- **Access logging models are append-only** — `pdf_access_logs` has `created_at` but no `updated_at` (never edited).

### Indexes and constraints
- **Forgetting `@@index` on ANY foreign key** — every FK gets an index, no exceptions. Add it in the same edit as the relation.
- Adding a relation without checking if the FK column has an `@@index`

### Timestamps
- **Using `@updatedAt` without `@default(now())`** — this will fail `db:push` on tables with existing rows because Prisma cannot backfill a required column without a default. Always write `updated_at DateTime @default(now()) @updatedAt`.
- **Forgetting `updated_at` on mutable models** — if the model can be edited after creation, it needs `updated_at`. The audit found `user_needles`, `notifications`, and `pdf_uploads` were all missing it.

### Queries and workflow
- Using `findFirst` without a `user_id` filter (authorization bypass risk)
- Creating a migration for every small dev change (use `db:push` locally)
- Skipping `db:generate` after `db:push` (stale client types)
