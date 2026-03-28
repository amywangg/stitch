---
name: backlog
description: "Process BACKLOG.md items automatically. Use when: the user says /backlog, or asks to work through backlog items, clear the backlog, or process pending tasks."
user_invocable: true
---

# Backlog Processor

Automatically work through items in `BACKLOG.md`, implementing each one using the project's established patterns and skills.

---

## Process

### 1. Read and triage

Read `BACKLOG.md`. For each item, classify:

- **bugfix** — fix the reported issue, verify the fix
- **feature** — implement the feature end-to-end (API + iOS + web as needed)
- **refactor** — restructure code without changing behavior

### 2. Prioritize

Work items in this order:
1. Bugfixes (broken functionality first)
2. Features that touch existing views (lower risk, faster to ship)
3. Features that require new views/routes
4. Refactors

### 3. For each item

1. **Read the relevant code** — understand the current state before changing anything
2. **Load the right skills** — check which skills apply:
   - iOS UI changes → load `/ui-ux` patterns, use shared components
   - API changes → follow `withAuth`, Zod, `parsePagination` patterns from `/api-design`
   - DB changes → follow `/data-modeling` conventions, run `db:push` + `db:generate`
   - New Swift files → run `xcodegen generate` after
3. **Implement the fix/feature** — follow CLAUDE.md rules:
   - Reuse shared components (ErrorAlertModifier, LoadableContent, AvatarImage, etc.)
   - Optimistic updates + reload after mutation
   - CancellationError handling in ViewModels
   - Zod validation on all API inputs
   - `withAuth()` on all authenticated routes
4. **Verify** — check TypeScript compiles (`npx tsc --noEmit`), check brace balance for Swift
5. **Remove from BACKLOG.md** — delete the completed item
6. **Document if major** — if the item is a significant new feature (not a bugfix or tweak), update or create the relevant `docs/` file

### 4. Batch for efficiency

- Items that touch the same file can be done together
- Run xcodegen once after all Swift file additions, not after each one
- Run TypeScript check once after all API changes

### 5. Report

After completing all items, summarize what was done in a concise list.

---

## What NOT to do

- Don't skip items without explanation — if an item can't be done (missing context, blocked by another change), say why
- Don't half-implement — each item should be fully working when removed from the backlog
- Don't add new backlog items while processing — focus on clearing what's there
- Don't make unrelated changes while fixing a backlog item — scope to exactly what was requested
- Don't document bugfixes in `docs/` — only major features need documentation

---

## Parallelization

Use background agents for independent items:
- API-only changes can run in parallel with iOS-only changes
- Multiple bugfixes in different files can be parallelized
- But items that touch the same file must be sequential
