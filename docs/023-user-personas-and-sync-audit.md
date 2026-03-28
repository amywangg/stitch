# User Personas, Ravelry Sync Audit, and Experience Gaps

**Status:** Audit complete. Seed data created. Implementation gaps identified.

---

## 1. Ravelry Sync Capabilities

### What works today

| Data | Ravelry → Stitch | Stitch → Ravelry | Notes |
|------|:-:|:-:|-------|
| **Projects** | Full | Partial | Status, notes, size, dates pushed. Row counter progress NOT pushed. |
| **Queue** | Full | Create + Delete | Reordering and notes updates NOT pushed. |
| **Stash** | Full | Full | Create, update, delete all work. Status field not pushed. |
| **Needles** | Full | None | Read-only. Ravelry API likely doesn't support needle writes. |
| **Patterns** | Library only | None | Search is proxied live. No publishing to Ravelry. |
| **Profile** | Backfill only | None | Bio, location, avatar pulled once if Stitch fields are null. |
| **Friends** | Auto-follow | None | Matched users auto-followed during full sync. |

### Critical sync gaps to fix

| Gap | Impact | Fix |
|-----|--------|-----|
| **Row counter doesn't push project completion** | User completes a project via counter → Ravelry still shows "In Progress" | When all sections are complete, auto-set project status to "completed" and push to Ravelry |
| **Avatar not synced on re-sync** | User changes Ravelry profile photo, Stitch keeps old one | Always update avatar from Ravelry on full sync (not just backfill) |
| **Queue notes updates not pushed** | User adds notes to a queued pattern → not reflected on Ravelry | Push notes on `PATCH /queue/[id]` |
| **No incremental sync** | Every sync re-fetches everything (slow for large collections) | Use per-type `*_synced_at` timestamps to only fetch items updated since last sync |
| **No push failure feedback** | Ravelry push errors are silently swallowed | Log failures, show subtle indicator in iOS if recent push failed |

### What CANNOT be synced (API limitations)

- Needle additions (Ravelry API doesn't support writes)
- User profile edits (Ravelry doesn't expose)
- Follow/unfollow (not available in Ravelry OAuth 1.0a)
- Pattern publishing (Ravelry patterns are submitted through their web UI)
- Stash item photos (Ravelry stash photos use their own upload system)

---

## 2. User Personas

### Persona Matrix

| Persona | Tier | Ravelry | Description |
|---------|------|---------|-------------|
| **Sarah** | Pro | Yes | Power knitter, heavy Ravelry user, wants sync + AI tools |
| **Maya** | Plus | Yes | Intermediate knitter, syncs stash from Ravelry, wants unlimited projects |
| **Lily** | Free | Yes | New to knitting, just connected Ravelry, exploring the app |
| **Jordan** | Pro | No | Experienced crocheter, doesn't use Ravelry, builds patterns in-app |
| **Alex** | Plus | No | Casual knitter, wants project tracking + cross-device sync |
| **Riley** | Free | No | Complete beginner, just downloaded the app, learning to knit |

---

### Sarah — Pro + Ravelry

**Who:** 42, knits daily, 200+ projects on Ravelry, active in groups and forums, designs her own patterns.

**What she needs from Stitch:**
- Seamless Ravelry sync — all her projects, stash, queue, needles imported
- Changes made in Stitch pushed back to Ravelry automatically
- AI tools for PDF parsing (she has 50+ purchased PDF patterns)
- AI yarn substitution when a pattern calls for a discontinued yarn
- Row counter that syncs across her phone and iPad
- Pattern builder for her own designs → sell on marketplace
- Size recommendation using her saved measurements

**Value proposition:** Stitch is the mobile companion Ravelry never built. She manages her knitting life on Stitch during sessions, and Ravelry stays in sync automatically. The AI tools save her hours of manual gauge math and yarn research.

**Experience gaps to fix:**
- [ ] Row counter completion should auto-push project status to Ravelry
- [ ] Avatar should always sync from Ravelry (not just backfill)
- [ ] Incremental sync for her 200+ project library (full sync is too slow)
- [ ] Marketplace earnings dashboard (she wants to sell patterns)
- [ ] Bulk PDF import (she has dozens of PDFs to parse)

---

### Maya — Plus + Ravelry

**Who:** 29, knits 2-3 projects at a time, browses Ravelry for patterns, moderate stash.

**What she needs from Stitch:**
- Ravelry import to bring over her stash and queue
- Unlimited active projects (she always has 3+ WIPs)
- Cross-device sync (starts on phone, continues on tablet)
- PDF upload and manual metadata entry (doesn't need AI parsing)
- Social feed to share progress photos

**Value proposition:** Stitch gives her unlimited project tracking with cross-device sync at $1.99/mo — cheaper than most knitting apps. Her Ravelry data comes along for free.

**Experience gaps to fix:**
- [ ] PDF upload flow should be smooth without Pro (no AI parsing, but easy metadata entry)
- [ ] Stash picker should show Ravelry-imported yarns prominently
- [ ] Queue sync should be fast and reliable (she manages her queue actively)

---

### Lily — Free + Ravelry

**Who:** 22, just learned to knit, created a Ravelry account because someone told her to, doesn't have much there yet.

**What she needs from Stitch:**
- Easy project creation (her first scarf, her first hat)
- Row counter that just works
- Pattern browsing (Ravelry search, community patterns)
- Learning resources (tutorials, glossary)
- Ravelry import to pull in the 2 patterns she saved

**Value proposition:** Stitch is friendlier than Ravelry for a beginner. The tutorials, glossary, and row counter make it the app she opens every time she picks up needles. When she gets more serious, she'll upgrade.

**Experience gaps to fix:**
- [ ] Onboarding should guide her to connect Ravelry early (even if she has little data)
- [ ] Free tier should feel generous (3 projects is fine for a beginner)
- [ ] Glossary links in pattern instructions should work everywhere
- [ ] Learning section should be prominent (not buried in a tab)

---

### Jordan — Pro + No Ravelry

**Who:** 35, experienced crocheter, never used Ravelry, designs original patterns, sells at craft fairs.

**What she needs from Stitch:**
- Pattern builder for creating her designs from scratch
- PDF generation for her patterns (to share/sell)
- AI pattern builder (describe what she wants → get a starting template)
- Marketplace to sell patterns digitally
- Full stash management without any Ravelry dependency
- Needle/hook collection tracking

**Value proposition:** Stitch is the first app that lets her build, manage, and sell patterns without needing Ravelry. The AI tools and marketplace are why she pays for Pro.

**Experience gaps to fix:**
- [ ] Pattern builder must work fully without Ravelry (no broken "sync to Ravelry" prompts)
- [ ] Stash management needs yarn search/catalog that works without Ravelry import
- [ ] Marketplace seller flow should be self-contained (Stripe Connect onboarding → list → sell)
- [ ] Manual yarn entry should be as easy as the Ravelry-sourced flow
- [ ] Community patterns should include Stitch-native patterns (not just Ravelry proxied search)

---

### Alex — Plus + No Ravelry

**Who:** 31, knits occasionally, 1-2 projects going, wants to track progress and sync between devices.

**What he needs from Stitch:**
- Simple project tracking (title, photo, row counter)
- Cross-device sync (phone + iPad)
- PDF upload for patterns he buys online
- Basic stash tracking (what yarn he has and how much)

**Value proposition:** $1.99/mo for unlimited projects + cross-device sync. Simple, focused, no Ravelry complexity.

**Experience gaps to fix:**
- [ ] App should work perfectly with zero Ravelry mentions (no "Connect Ravelry" CTAs everywhere)
- [ ] Yarn search should work via the built-in catalog (Ravelry yarn search works without a Ravelry account)
- [ ] Pattern discovery should include community + marketplace (not just "Search Ravelry")
- [ ] Onboarding should skip Ravelry step cleanly if user says "I don't use Ravelry"

---

### Riley — Free + No Ravelry

**Who:** 19, saw knitting on TikTok, downloaded Stitch to try it, has no yarn and no patterns yet.

**What she needs from Stitch:**
- Tutorials that teach her from zero (cast on, knit stitch, purl stitch)
- Simple first project suggestion ("Start with a scarf!")
- Row counter that's obvious and satisfying to tap
- Browse free community patterns for beginners
- Glossary for terms she doesn't know (K2tog, SSK, YO)

**Value proposition:** Stitch is the "learn to knit" app that grows with her. She doesn't need Ravelry or Pro features yet. When she gets hooked, she'll upgrade.

**Experience gaps to fix:**
- [ ] First-launch experience should not assume ANY prior knitting knowledge
- [ ] "Start your first project" should be a guided flow, not a blank form
- [ ] Free community patterns should be browsable without auth friction
- [ ] Tutorials should be the first thing she sees, not project tracking
- [ ] Empty states should educate, not just say "No X yet"

---

## 3. Experience Gap Audit (by feature)

### Features that work for ALL users (no gaps)

- Row counter (core loop, unlimited, all tiers)
- Gauge calculator (deterministic, free)
- Stash/needle inventory (unlimited, free)
- Social feed browsing + posting (free)
- Pattern detail view + sections display
- Reviews and ratings

### Features that need work for NON-Ravelry users

| Feature | Current state | Gap | Fix |
|---------|--------------|-----|-----|
| Yarn search | Proxies Ravelry API (works without account) | Works but feels "Ravelry-dependent" | Add local yarn catalog search as primary, Ravelry as secondary |
| Pattern discovery | Discover tab defaults to "Ravelry" segment | Non-Ravelry users see Ravelry as primary | Default to "Community" or "Marketplace" for non-connected users |
| Stash import | Only from Ravelry | No bulk import option | Add CSV import or manual bulk entry |
| Needle import | Only from Ravelry | No import option | Already has manual entry (NeedlePickerSheet) |
| Pattern queue | Fully works without Ravelry | No gap | — |
| Projects | Fully works without Ravelry | No gap | — |

### Features that need work for RAVELRY users

| Feature | Current state | Gap | Fix |
|---------|--------------|-----|-----|
| Project completion | Counter doesn't push status | Ravelry shows "In Progress" forever | Push status on section/project completion |
| Profile photo | Backfill only (first sync) | Avatar goes stale | Always update from Ravelry |
| Queue reorder | Pull only | Reordering in Stitch not reflected | Push sort_order changes |
| Incremental sync | Full re-fetch every time | Slow for large collections | Use per-type timestamps |
| Sync feedback | Fire-and-forget, no error UI | User doesn't know if sync failed | Show sync status indicator |

### Features that need work for FREE tier

| Feature | Current state | Gap | Fix |
|---------|--------------|-----|-----|
| PDF upload | Available | No AI parsing (correct gate) | Make manual metadata entry smooth with pickers |
| Projects limit (3) | Enforced | Beginner hits it quickly | Good — drives upgrade. Make upgrade prompt friendly. |
| Pattern limit (15) | Enforced | Could feel restrictive early | Consider raising to 20 |
| Tutorials | Exist but not prominent | New users don't find them | Feature tutorials in onboarding + empty states |

---

## 4. Discover Tab Default Logic

The Discover tab currently defaults to "Ravelry" for all users. This should be smart:

```
if user has Ravelry connected:
    default to "Ravelry" (they expect it)
else if marketplace has patterns:
    default to "Marketplace"
else:
    default to "Community"
```

This ensures non-Ravelry users see Stitch-native content first.

---

## 5. Seed Users

Six test users seeded in the database via the script below. Each represents one persona.

| Username | Email | Tier | Ravelry | Persona |
|----------|-------|------|---------|---------|
| `sarah_knits` | sarah@test.stitch.app | Pro | Connected | Power knitter, heavy sync |
| `maya_crafts` | maya@test.stitch.app | Plus | Connected | Moderate user, stash sync |
| `lily_learns` | lily@test.stitch.app | Free | Connected | Beginner, just connected |
| `jordan_hooks` | jordan@test.stitch.app | Pro | Not connected | Crocheter, pattern designer |
| `alex_knits` | alex@test.stitch.app | Plus | Not connected | Casual, wants sync |
| `riley_new` | riley@test.stitch.app | Free | Not connected | Complete beginner |

Each user has sample projects, stash items, and patterns appropriate for their persona.
