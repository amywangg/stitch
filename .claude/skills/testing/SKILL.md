---
name: testing
description: "Testing strategy for Stitch across Next.js API routes, Prisma, and SwiftUI iOS. Use when: (1) writing or modifying any test file (*.test.ts, *Tests.swift), (2) setting up Vitest, test fixtures, or test helpers, (3) adding test coverage for a new route or ViewModel, (4) discussing what to test or how to mock Clerk/Prisma/external APIs, (5) configuring CI/CD test pipelines in GitHub Actions."
---

# Testing Standards

Stitch uses Vitest for web/API tests and XCTest for iOS. Tests run against a real PostgreSQL database, not mocks. This guide covers what to test, how to test it, and what to skip.

---

## Philosophy

**Test behavior, not implementation.** Assert on HTTP responses and state changes, not on which Prisma method was called. If you refactor a query but the response is identical, tests should not break.

**Real database, not mocks.** Mocking Prisma is an anti-pattern for integration tests. You end up testing your mocks, not your queries. All API route tests hit a real Postgres instance.

**Mock only external boundaries.** Mock Clerk (auth), OpenAI (AI), and Ravelry (external API). Never mock Prisma, your own lib functions, or Next.js internals.

**Test the diamond, not the pyramid.** Most tests should be integration tests (route handler + database). A few unit tests for pure logic (gauge math, slug generation). Almost no E2E/UI tests until the product stabilizes.

---

## Test Runner: Vitest

### Why Vitest over Jest

- Native ESM support (no transform issues with Next.js App Router)
- `vite-tsconfig-paths` resolves `@/` path aliases automatically
- Faster startup, compatible with Jest API
- First-class TypeScript without `ts-jest`

### Setup

Install in `apps/web/`:

```bash
pnpm add -D vitest vite-tsconfig-paths
```

```typescript
// apps/web/vitest.config.mts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts'],
    testTimeout: 10_000,
    hookTimeout: 30_000,
  },
})
```

Add scripts to `apps/web/package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Add to `turbo.json`:

```json
{
  "test": {
    "dependsOn": ["^build"]
  }
}
```

---

## Global Test Setup

```typescript
// apps/web/tests/setup.ts
import { vi, beforeEach, afterAll } from 'vitest'
import { prisma } from '@stitch/db'

// Mock Clerk auth globally
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'clerk_test_user' }),
}))

// Mock getDbUser to return a test user
vi.mock('@/lib/auth', () => ({
  getDbUser: vi.fn().mockResolvedValue({
    id: 'uuid-test-user',
    clerk_id: 'clerk_test_user',
    username: 'testknitter',
    email: 'test@stitch.app',
    is_pro: false,
    created_at: new Date(),
    updated_at: new Date(),
  }),
}))

// Ensure test user exists in DB before tests
beforeEach(async () => {
  await prisma.users.upsert({
    where: { id: 'uuid-test-user' },
    update: {},
    create: {
      id: 'uuid-test-user',
      clerk_id: 'clerk_test_user',
      username: 'testknitter',
      email: 'test@stitch.app',
    },
  })
})

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect()
})
```

---

## Test Database

### Local development

Use a separate database on your local Supabase instance:

```bash
# Create test database (run once)
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "CREATE DATABASE stitch_test;"
```

Set in `apps/web/.env.test`:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/stitch_test
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/stitch_test
```

Before running tests, sync the schema:

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/stitch_test" \
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/stitch_test" \
npx prisma db push --schema=packages/db/prisma/schema.prisma
```

### Test isolation

Each test file cleans up its own data. Use a `cleanup` helper that deletes in reverse FK order:

```typescript
// apps/web/tests/helpers/db.ts
import { prisma } from '@stitch/db'

export async function cleanupTestData(userId: string) {
  // Delete in reverse dependency order
  await prisma.likes.deleteMany({ where: { user_id: userId } })
  await prisma.comments.deleteMany({ where: { user_id: userId } })
  await prisma.row_counter_history.deleteMany({
    where: { section: { project: { user_id: userId } } },
  })
  await prisma.project_sections.deleteMany({
    where: { project: { user_id: userId } },
  })
  await prisma.project_gauge.deleteMany({
    where: { project: { user_id: userId } },
  })
  await prisma.projects.deleteMany({ where: { user_id: userId } })
  await prisma.patterns.deleteMany({ where: { user_id: userId } })
  await prisma.posts.deleteMany({ where: { user_id: userId } })
  await prisma.user_stash.deleteMany({ where: { user_id: userId } })
  await prisma.pattern_queue.deleteMany({ where: { user_id: userId } })
}
```

Use in test files:

```typescript
import { cleanupTestData } from '../helpers/db'

afterEach(async () => {
  await cleanupTestData('uuid-test-user')
})
```

### Scaling up: transaction rollback

When the test suite grows past ~50 tests and cleanup becomes slow, switch to transaction-based isolation using `vitest-environment-prisma-postgres`. This wraps each test in a transaction that rolls back automatically -- fast and perfectly isolated.

---

## Fixtures and Factories

### Factory functions

Create reusable factories that generate test data with sensible defaults and unique IDs:

```typescript
// apps/web/tests/fixtures/projects.ts
import { randomUUID } from 'crypto'

export function makeProject(overrides: Partial<{
  id: string
  title: string
  user_id: string
  status: string
  craft_type: string
  deleted_at: Date | null
}> = {}) {
  return {
    id: randomUUID(),
    title: 'Test Scarf',
    user_id: 'uuid-test-user',
    status: 'active',
    craft_type: 'knitting',
    slug: `test-scarf-${randomUUID().slice(0, 8)}`,
    deleted_at: null,
    ...overrides,
  }
}
```

```typescript
// apps/web/tests/fixtures/users.ts
import { randomUUID } from 'crypto'

export const freeUser = {
  id: 'uuid-free-user',
  clerk_id: 'clerk_free_123',
  username: 'freeknitter',
  email: 'free@test.com',
  is_pro: false,
}

export const proUser = {
  id: 'uuid-pro-user',
  clerk_id: 'clerk_pro_123',
  username: 'proknitter',
  email: 'pro@test.com',
  is_pro: true,
}

export function makeUser(overrides = {}) {
  const id = randomUUID()
  return {
    id,
    clerk_id: `clerk_${id.slice(0, 8)}`,
    username: `user_${id.slice(0, 8)}`,
    email: `${id.slice(0, 8)}@test.com`,
    is_pro: false,
    ...overrides,
  }
}
```

### Request helpers

```typescript
// apps/web/tests/helpers/request.ts
import { NextRequest } from 'next/server'

export function createRequest(
  path: string,
  options?: {
    method?: string
    body?: Record<string, unknown>
    searchParams?: Record<string, string>
  }
) {
  const url = new URL(path, 'http://localhost:3000')
  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  return new NextRequest(url, {
    method: options?.method ?? 'GET',
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options?.body ? { 'Content-Type': 'application/json' } : {},
  })
}
```

---

## Testing API Routes

### Direct handler invocation

App Router route handlers are functions that accept `NextRequest` and return `NextResponse`. Call them directly:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/v1/projects/route'
import { prisma } from '@stitch/db'
import { createRequest } from '../helpers/request'
import { cleanupTestData } from '../helpers/db'
import { makeProject } from '../fixtures/projects'

afterEach(async () => {
  await cleanupTestData('uuid-test-user')
})

describe('GET /api/v1/projects', () => {
  it('returns paginated projects for authenticated user', async () => {
    // Seed
    await prisma.projects.createMany({
      data: [
        makeProject({ title: 'Scarf' }),
        makeProject({ title: 'Hat' }),
      ],
    })

    const req = createRequest('/api/v1/projects')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.items).toHaveLength(2)
    expect(body.data.total).toBe(2)
    expect(body.data.hasMore).toBe(false)
  })

  it('excludes soft-deleted projects', async () => {
    await prisma.projects.create({
      data: makeProject({ deleted_at: new Date() }),
    })

    const req = createRequest('/api/v1/projects')
    const res = await GET(req)
    const body = await res.json()

    expect(body.data.items).toHaveLength(0)
  })

  it('paginates correctly', async () => {
    await prisma.projects.createMany({
      data: Array.from({ length: 25 }, (_, i) =>
        makeProject({ title: `Project ${i}` })
      ),
    })

    const req = createRequest('/api/v1/projects', {
      searchParams: { page: '2', pageSize: '10' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(body.data.items).toHaveLength(10)
    expect(body.data.page).toBe(2)
    expect(body.data.hasMore).toBe(true)
  })
})

describe('POST /api/v1/projects', () => {
  it('creates a project', async () => {
    const req = createRequest('/api/v1/projects', {
      method: 'POST',
      body: { title: 'New Sweater', craft_type: 'knitting' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.title).toBe('New Sweater')

    // Verify in database
    const project = await prisma.projects.findFirst({
      where: { title: 'New Sweater', user_id: 'uuid-test-user' },
    })
    expect(project).not.toBeNull()
  })

  it('rejects missing title', async () => {
    const req = createRequest('/api/v1/projects', {
      method: 'POST',
      body: { craft_type: 'knitting' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
```

### Testing auth and pro-gating

```typescript
import { auth } from '@clerk/nextjs/server'
import { getDbUser } from '@/lib/auth'

describe('auth', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as any)

    const req = createRequest('/api/v1/projects')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })
})

describe('pro-gating', () => {
  it('rejects free users from pro features', async () => {
    vi.mocked(getDbUser).mockResolvedValueOnce({
      ...freeUser,
      created_at: new Date(),
      updated_at: new Date(),
    } as any)

    const req = createRequest('/api/v1/pdf/parse', {
      method: 'POST',
      body: {},
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('PRO_REQUIRED')
  })

  it('allows pro users', async () => {
    vi.mocked(getDbUser).mockResolvedValueOnce({
      ...proUser,
      created_at: new Date(),
      updated_at: new Date(),
    } as any)

    // ... test proceeds normally
  })
})
```

### Testing free tier limits

```typescript
it('enforces 3 active project limit for free users', async () => {
  // Create 3 projects (at limit)
  await prisma.projects.createMany({
    data: [
      makeProject({ title: 'One' }),
      makeProject({ title: 'Two' }),
      makeProject({ title: 'Three' }),
    ],
  })

  const req = createRequest('/api/v1/projects', {
    method: 'POST',
    body: { title: 'Four' },
  })
  const res = await POST(req)

  expect(res.status).toBe(403)
  const body = await res.json()
  expect(body.error.code).toBe('FREE_LIMIT_REACHED')
})
```

### Testing dynamic route params

For routes with `[id]` params, pass them via the second argument:

```typescript
import { GET, PATCH, DELETE } from '@/app/api/v1/projects/[id]/route'

// App Router passes params as the second argument
const params = { id: project.id }

const req = createRequest(`/api/v1/projects/${project.id}`)
const res = await GET(req, { params })
```

---

## What to Test (Priority Order)

### High priority -- test these for every route

1. **Happy path:** Create/read/update/delete with valid input returns correct response and mutates DB
2. **Auth rejection:** Unauthenticated request returns 401
3. **Ownership enforcement:** Accessing another user's resource returns 404 (not 403, to avoid leaking existence)
4. **Input validation:** Missing required fields, invalid types, and out-of-bounds values return 400
5. **Soft delete filtering:** Soft-deleted records never appear in list or detail responses
6. **Pro-gating:** Free users get 403 on Pro features; Pro users succeed

### Medium priority -- test for complex routes

7. **Pagination:** Correct page size, page number, hasMore flag, total count
8. **Free tier limits:** Correct enforcement at the boundary (3 projects, 10 patterns, 2 PDFs/month)
9. **Counter operations:** Increment, decrement (clamp to 0), undo, auto-complete at target
10. **Slug deduplication:** Creating two items with the same title generates unique slugs

### Low priority -- test only if the logic is tricky

11. **Sort order:** Items returned in correct order
12. **Filter combinations:** Status + craft_type + search query
13. **Ravelry push side effects:** Verify the push client was called (mock `getRavelryPushClient`)

---

## What NOT to Test

**Skip these -- low value, high maintenance:**

1. **Prisma client behavior:** Do not test that `findMany` returns records. Prisma is well-tested. Test your filters, pagination, and authorization around it.

2. **Clerk internals:** Do not test JWT validation or session management. Mock `auth()` and move on.

3. **Next.js routing:** Do not test that requests reach the correct route handler. That is Vercel's job.

4. **Trivial passthrough CRUD:** A route that does `prisma.findMany({ where: { user_id } })` and wraps it in `{ success: true, data }` needs one happy-path test, not ten edge cases.

5. **Implementation details:** Do not assert that `prisma.projects.update` was called with specific args. Assert on the response and the database state.

6. **Third-party webhook payload structure:** Test your handler with a fixture payload, but do not test that Clerk/RevenueCat sends the right shape.

7. **Static UI rendering:** Do not test that a heading says "My Projects". Test interactive behavior and state changes.

8. **Ravelry API integration:** Mock the Ravelry client in tests. Integration with Ravelry's actual API is verified manually.

---

## Unit Tests for Pure Logic

Some lib functions have no side effects and benefit from unit tests:

```typescript
// apps/web/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { slugify } from './utils'

describe('slugify', () => {
  it('converts title to URL-safe slug', () => {
    expect(slugify('My Cozy Sweater')).toBe('my-cozy-sweater')
  })

  it('handles special characters', () => {
    expect(slugify("Grandma's #1 Hat!")).toBe('grandmas-1-hat')
  })

  it('trims and collapses whitespace', () => {
    expect(slugify('  lots   of   spaces  ')).toBe('lots-of-spaces')
  })
})
```

Good candidates for unit tests:
- `slugify()` -- string transformation
- `formatZodErrors()` -- error formatting
- Gauge math functions (measurement-to-rows, rows-to-measurement)
- Pagination helpers (`parsePagination`, `paginatedResponse`)
- Encryption/decryption round-trip (encrypt then decrypt = original)

---

## iOS Testing

### ViewModel unit tests (highest value)

Test business logic in ViewModels by injecting a mock API client:

```swift
// Define protocol for dependency injection
protocol APIClientProtocol {
    func get<T: Decodable>(_ path: String) async throws -> T
    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T
    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T
    func delete<T: Decodable>(_ path: String) async throws -> T
}

// Real client conforms
extension APIClient: APIClientProtocol {}

// Mock client for tests
class MockAPIClient: APIClientProtocol {
    var mockResponses: [String: Any] = [:]
    var shouldFail = false
    var lastPath: String?
    var callCount = 0

    func get<T: Decodable>(_ path: String) async throws -> T {
        callCount += 1
        lastPath = path
        if shouldFail { throw URLError(.badServerResponse) }
        guard let response = mockResponses[path] as? T else {
            throw URLError(.cannotParseResponse)
        }
        return response
    }

    // ... post, patch, delete similarly
}
```

```swift
// StitchTests/ViewModels/ProjectViewModelTests.swift
@testable import Stitch
import XCTest

final class ProjectViewModelTests: XCTestCase {
    var sut: ProjectViewModel!
    var mockAPI: MockAPIClient!

    override func setUp() {
        mockAPI = MockAPIClient()
        sut = ProjectViewModel(apiClient: mockAPI)
    }

    func testLoadProjectsSuccess() async {
        let response = APIResponse(
            success: true,
            data: PaginatedData(items: [testProject], total: 1, page: 1, pageSize: 20, hasMore: false)
        )
        mockAPI.mockResponses["/projects"] = response

        await sut.load()

        XCTAssertEqual(sut.projects.count, 1)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.error)
    }

    func testLoadProjectsSetsErrorOnFailure() async {
        mockAPI.shouldFail = true

        await sut.load()

        XCTAssertNotNil(sut.error)
        XCTAssertTrue(sut.projects.isEmpty)
    }

    func testIncrementCounterUpdatesRow() async {
        sut.currentRow = 5
        mockAPI.mockResponses["/counter/section-1/increment"] = APIResponse(
            success: true,
            data: CounterResult(currentRow: 6)
        )

        await sut.incrementRow(sectionId: "section-1")

        XCTAssertEqual(sut.currentRow, 6)
    }
}
```

### What to test in iOS

1. **ViewModel state transitions:** `isLoading`, `error`, data population after API calls
2. **Optimistic updates:** Counter increment updates UI immediately, reverts on failure
3. **Input validation:** ViewModel-level validation before API calls
4. **Computed properties:** Filtered/sorted lists, formatted display values

### What to skip in iOS

1. **XCUITest:** Slow, brittle, expensive. Skip until UI stabilizes post-MVP.
2. **Snapshot tests:** Only useful after the design is finalized. Add later with `swift-snapshot-testing`.
3. **View rendering:** Do not use ViewInspector to assert on SwiftUI's internal view tree. Test ViewModels instead.
4. **APIClient networking:** Do not test URLSession itself. Mock the client boundary.
5. **Clerk/RevenueCat SDK behavior:** Mock these managers in ViewModel tests.

### Test file organization (iOS)

```
apps/ios/
  StitchTests/
    ViewModels/
      ProjectViewModelTests.swift
      CounterViewModelTests.swift
      StashViewModelTests.swift
      QueueViewModelTests.swift
    Mocks/
      MockAPIClient.swift
      MockSubscriptionManager.swift
    Fixtures/
      TestData.swift
    Helpers/
      XCTestCase+Async.swift
```

Add a test target in `project.yml`:

```yaml
StitchTests:
  type: bundle.unit-test
  platform: iOS
  sources:
    - path: StitchTests
  dependencies:
    - target: Stitch
  settings:
    base:
      PRODUCT_BUNDLE_IDENTIFIER: com.stitchmarker.app.tests
```

---

## File Organization (Web)

```
apps/web/
  vitest.config.mts
  tests/
    setup.ts                              # Global mocks, DB bootstrap
    helpers/
      db.ts                               # cleanupTestData()
      request.ts                          # createRequest()
    fixtures/
      users.ts                            # freeUser, proUser, makeUser()
      projects.ts                         # makeProject()
      patterns.ts                         # makePattern()
      stash.ts                            # makeStashItem()
  app/
    api/v1/
      projects/
        route.ts
        route.test.ts                     # Co-located with route
        [id]/
          route.ts
          route.test.ts
      patterns/
        route.ts
        route.test.ts
  lib/
    utils.ts
    utils.test.ts                         # Co-located unit test
    schemas/
      projects.ts
      projects.test.ts                    # Schema validation tests
```

**Co-locate tests** with source files. Shared helpers and fixtures go in `tests/`.

---

## CI: GitHub Actions

```yaml
name: Test
on: [push, pull_request]

jobs:
  test-web:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: stitch_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Push schema to test DB
        run: pnpm db:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stitch_test
          DIRECT_URL: postgresql://postgres:postgres@localhost:5432/stitch_test

      - name: Run tests
        run: pnpm turbo test --filter=@stitch/web
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stitch_test
          DIRECT_URL: postgresql://postgres:postgres@localhost:5432/stitch_test
          CLERK_SECRET_KEY: sk_test_fake
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_fake

  test-ios:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Generate Xcode project
        run: cd apps/ios && xcodegen generate
      - name: Run tests
        run: |
          xcodebuild test \
            -project apps/ios/Stitch.xcodeproj \
            -scheme Stitch \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            -resultBundlePath TestResults \
            -quiet
```

**Key CI decisions:**
- Real Postgres container via `services` -- no Supabase overhead in CI
- `prisma db push` syncs schema without migration files
- Dummy Clerk env vars (tests mock auth, but Next.js needs the vars to import without crashing)
- iOS tests on `macos-14` runner
- Cache pnpm store for speed

---

## When to Write Tests

- **Before merging a feature branch:** At minimum, happy-path + auth + validation tests for every new route
- **After fixing a bug:** Write a test that reproduces the bug first, then fix it (prevents regression)
- **For Pro-gating changes:** Always test that free users are blocked and Pro users are allowed
- **For counter operations:** These have complex state (increment, decrement, undo, auto-complete) -- test each path

**Do not write tests for:**
- Prototype code that will change next week
- One-off scripts or migrations
- Configuration files
- Seed data

---

## Anti-Patterns (Never Do These)

- Mocking Prisma client (test against real DB instead)
- Testing framework internals (Next.js routing, Clerk JWT validation)
- Using `sleep()` or `setTimeout()` in tests (use async/await properly)
- Sharing mutable state between tests (each test seeds its own data)
- Testing private functions (test through the public API)
- Writing tests that depend on execution order
- Snapshot-testing API responses (brittle, breaks on any field addition)
- Using `any` to silence TypeScript in test files (defeats the purpose)
- Running the entire test suite on every file save (use `vitest --watch` with file filtering)
- Writing more test code than production code for simple CRUD routes
