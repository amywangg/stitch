# Monetization, Free Tier Design, and Growth Strategy

**Status:** Research complete, not yet implemented

---

## 1. Market Context

The global knitting/crochet market is USD 10.1B (2025), projected to reach $17.85B by 2034 (6.53% CAGR). Ravelry alone gets ~180M pageviews/month from a 98% female audience with an average age of 58 and household income of $72K-$91.5K. The growth segment is 18-34 year olds who are app-native, subscription-comfortable, and live on Instagram/TikTok.

**Key competitive insight:** Ravelry is free. It has never charged users a subscription. It monetizes through ads (self-served, zero commission to networks), pattern sales commission (3.5% after $30/mo), and Amazon affiliate links. Any competitor charging a subscription must offer clear value beyond what Ravelry provides for free.

---

## 2. Pricing Strategy

### Current: $4.99/mo Pro Tier

This sits in the right range. RevenueCat's 2026 data (115K+ apps, $16B tracked revenue) shows:

- Apps priced $4.99-$9.99/mo convert at 2.8% median (vs 1.4% for cheaper apps — lower price signals lower value)
- Hobby apps should target 3-5% conversion as a realistic goal; top performers hit 8-10%
- The $4.99/mo price is 4-6x more expensive than pure-tool competitors (KnitCompanion at ~$10/year, Row Counter at ~$10/year), so the AI features and social features must clearly justify the gap

### Recommended: Add Annual + Lifetime Options

| Plan | Price | Discount | Why |
|------|-------|----------|-----|
| Monthly | $4.99/mo | — | Low commitment entry |
| Annual | $39.99/year | 33% off monthly | Industry standard; $120-140/year is the balk threshold, we're well under |
| Lifetime | $99.99 | ~20 months | The knitting demographic (older, less subscription-fatigued) responds well to one-time purchases. Stash2Go offers this successfully |

### Plus Tier ($1.99/mo)

RevenueCat found that **38% of churned subscribers said they would NOT have canceled if a lower-priced tier existed**. The Plus tier captures price-sensitive users who want unlimited projects, patterns, and sync but don't need AI. It also creates a natural step-up path: Free → Plus → Pro.

| Feature | Free | Plus ($1.99/mo) | Pro ($4.99/mo) |
|---------|------|-----------------|----------------|
| Row counter | Unlimited | Unlimited | Unlimited |
| Active projects | 3 | Unlimited | Unlimited |
| Saved patterns | 15 | Unlimited | Unlimited |
| Cross-device sync | — | Yes | Yes |
| Social feed + posting | Yes | Yes | Yes |
| PDF parsing (AI) | 2/month | 5/month | Unlimited |
| AI tools (other 8) | — | — | All |
| Ravelry auto-sync | — | — | Yes |

This captures the "I just want unlimited projects and sync" user without giving away AI margin.

---

## 3. Free Tier Design

### Psychology That Drives Conversion

| Trigger | How it works | Stitch application |
|---------|-------------|-------------------|
| **Endowment effect** | People value what they already possess 2x more than identical things they don't own | Let users build a rich stash, needle collection, and project history on the free tier. The more data they invest, the harder it is to leave |
| **Loss aversion** | Losing something feels 2x worse than gaining something equivalent | 14-day reverse trial — users experience Pro, then lose it. 17% of subscribers convert specifically because a trial is expiring |
| **Content desire** | 26% of all conversions are driven by wanting full content access | Mix Pro-only content into free browsing (AI suggestions shown but gated, social posts visible but can't create) |
| **Social proof** | Seeing what Pro users can do creates aspiration | Show Pro badges on social posts, richer project cards, AI-generated insights visible to all |

### What Must Be Free (the daily-use core loop)

These features drive DAU. Gating them kills retention before conversion can happen:

- **Row counter** — unlimited, no limits, ever. This is the "open the app every time you pick up needles" feature
- **Active project tracking** — 3 projects (most knitters have 2-4 WIPs; the limit bites at exactly the right moment)
- **Pattern library browsing** — read access to saved patterns. Consider raising limit from 10 to 15-20 to let users invest more data before hitting the wall
- **Stash/needle inventory** — let users catalog everything. This is pure data investment with zero marginal cost to us
- **Social feed + posting** — browse and share freely. Community participation drives daily visits, organic growth, and word-of-mouth
- **Gauge calculator** — deterministic math, no AI cost, builds trust in the app's knitting knowledge

### What Should Be Pro-Gated

These either cost us money (AI/API calls) or represent clear premium value:

- **AI tools (Pro only)** — yarn substitution, size recommendation, time estimation, stash planner, yarn equivalence, gauge conversion. These are the differentiator from Ravelry and justify the price gap vs cheaper competitors
- **PDF parsing (all tiers, metered)** — available to everyone because the row counter, glossary linking, and AI tools all depend on structured patterns. Without parsing, the app's core value is inaccessible. Metered at 2/month (free), 5/month (Plus), unlimited (Pro)
- **Cross-device realtime sync (Plus+)** — infrastructure cost, clear upgrade moment ("I want to count rows on my phone AND iPad")
- **Social posting** — free for all users. Community participation drives retention and organic growth
- **Unlimited projects/patterns (Plus+)** — the free limit should feel generous enough to prove value but bite when the user is hooked
- **Ravelry auto re-sync (Pro only)** — first import free to hook them, ongoing sync is Pro
- **Row instruction explainer** — exception: keep this free (GPT-4o-mini is cheap, it builds trust in the AI, and it's a gateway drug to the Pro AI tools)

### Recommended Free Tier Limits (Revised)

| Feature | Current | Recommended | Rationale |
|---------|---------|-------------|-----------|
| Active projects | 3 | 3 | Bites at the right moment |
| Saved patterns | 10 | 15 | More data investment before the wall; endowment effect |
| PDF uploads | 2/month | 2/month | Good metered gate — users experience it, then need more |
| Stash items | Unlimited | Unlimited | Zero cost, maximum data lock-in |
| Needles | Unlimited | Unlimited | Same |
| Row counter | Unlimited | Unlimited | Core loop, never gate |
| Social feed + posting | Full access | Full access | Drives daily visits + organic growth |
| Ravelry import | First only | First only | Hook, then gate re-sync |

---

## 4. Reverse Trial Strategy

A reverse trial gives full Pro access for a limited period, then drops to free (not a hard wall). Research shows this converts 2-3x better than pure freemium (7-21% vs 3-5%).

### How to Implement

1. **New user signs up** → gets 14 days of full Pro access
2. **During trial:** all AI tools, unlimited projects, social posting, cross-device sync
3. **Onboarding guides them to use Pro features:** import a PDF pattern, try the yarn substitution tool, post a project photo
4. **Day 10:** gentle reminder — "Your Pro trial ends in 4 days. Here's what you've used: [3 AI analyses, 5 projects, 2 social posts]"
5. **Day 14:** drops to free tier. **Critical: never delete user data created during trial.** All projects, patterns, stash entries remain. They just can't create beyond the free limits or use AI tools.
6. **Post-trial:** contextual upgrade prompts at natural friction points ("You've used 3 of 3 free projects — upgrade to add more")

### Why 14 Days

- Knitting is slow — users need time to start a project, use the counter, try AI features
- 7 days is too short for a hobby app (works for productivity tools where daily use is immediate)
- 14 days gives users time to: import stash from Ravelry, start 1-2 projects, try PDF parsing, experience the row counter across multiple sessions, and build enough data to feel the loss

---

## 5. Onboarding Flow

63% of users consider onboarding a key factor in their decision to subscribe. The goal: **activation moment in the first session.**

### Recommended First-Session Flow

1. **Welcome** — "What do you love to make?" (knitting/crochet/both) + experience level (beginner/intermediate/advanced)
2. **Quick win** — "Let's set up your first project." Guide them to create a project with a title and yarn
3. **Core loop** — show the row counter, have them tap it once. They've now used the #1 daily feature
4. **Data investment** — "Want to import your Ravelry stash?" (if they use Ravelry) or "Add your first yarn to your stash" (if not)
5. **Pro taste** — show one AI feature in action (e.g., auto-suggest patterns for their stash yarn) with a "Pro trial" badge
6. **Done** — they have a project, a row count, and stash data. They're invested.

### Rules
- Never show a paywall before the activation moment
- No tutorial screens — learn by doing
- 2-3 personalization questions max
- First session ends with something the user made (a project card, a row count, a saved pattern)

---

## 6. Retention Strategy

### Benchmarks

| Timeframe | Average (all apps) | Hobby apps | Target for Stitch |
|-----------|-------------------|------------|-------------------|
| Day 1 | 25-30% | 20-25% | 30%+ |
| Day 7 | 10-15% | 8-12% | 15%+ |
| Day 30 | 5-7% | 3-8% | 10%+ |

### How to Beat Benchmarks

The key insight: **tie the app to the real-life activity.** Users open Ravelry when they sit down to knit. If Stitch becomes the app you open every time you pick up needles (row counter) and every time you browse patterns (library/social), retention will exceed hobby-app norms.

1. **Row counter as daily hook** — the single most important retention feature. Every knitting session = an app open
2. **Social feed as browse hook** — browsing what others are making drives return visits even when not knitting
3. **Progress visualization** — crafting heatmap (GitHub-style), project completion percentages, time estimates. People love seeing their progress quantified
4. **Smart notifications** (not spammy):
   - "You're 80% through the body section" (progress milestone)
   - "You haven't knit in 5 days — your Honey Cowl is waiting" (re-engagement, only after extended absence)
   - "3 new projects from people you follow" (social, daily digest)
5. **Seasonal/contextual relevance** — "Fall is coming — here are sweater patterns that match your stash" (ties AI tools to natural knitting cycles)

### AI Features and Retention

RevenueCat's 2026 data reveals a critical tension:

- AI apps earn **41% more revenue per customer**
- AI apps convert trials to paid **52% better**
- **BUT** AI apps churn **30% faster** on annual subscriptions

AI features are strong conversion drivers but poor retention drivers on their own. They work best bundled with sticky non-AI features (row counter, sync, social) rather than as the sole value proposition.

---

## 7. Social Media Advertising Strategy

### Platform Priority

| Platform | Priority | Budget % | Why |
|----------|----------|----------|-----|
| Instagram | Primary | 35% | Visual platform, strong maker community, best CPI-to-intent ratio |
| TikTok | Secondary | 20% | Cheapest reach, growing #knittok community, younger audience |
| Micro-influencers | High | 25% | Best ROI in craft niches, authentic advocacy |
| Pinterest | Medium | 10% | Evergreen discovery, 600M MAU, high purchase intent (88% buy from Pinterest) |
| Ravelry ads | Niche | 5% | Direct access to exact target audience, very low cost |
| X/Twitter | Low | 5% | High CPA ($21.55 median), small but vocal community |

### Cost Benchmarks

| Platform | CPI (iOS) | CPM | CPC |
|----------|-----------|-----|-----|
| Instagram | $2-5 | $5-15 | $0.40-0.70 |
| TikTok | $1.50-4 | ~$9.16 | ~$1.00 |
| Pinterest | $2-5 | $5-12 | $0.50-1.50 |
| Apple Search Ads | $1-3 | N/A | N/A |
| X/Twitter | $8-22 | Higher | Higher |

General mobile CPI benchmark: $4.70 iOS. Niche targeting increases CPI but delivers higher LTV users.

### Instagram Strategy

**Formats:**
- **Reels** (36% more reach than carousels): show the app in action — row counting, PDF import, stash management. "POV: you finally have an app that gets knitting"
- **Stories** (78% more clicks than feed ads): swipe-up to App Store, urgency-driven ("Your yarn stash deserves better")
- **Carousels** (2.14x engagement vs single images): 5-slide feature walkthrough

**Targeting:**
- Interest: Knitting, Crochet, Yarn, Ravelry, Fiber Arts, Handmade
- Lookalike: upload existing user emails for 1% lookalike audience
- Saves and shares drive reach more than likes — design creative people want to bookmark

### TikTok Strategy

**Community:** #knittok and #crochettok are thriving. Crochet content has 163M+ posts. The craft TikTok audience skews 25-34.

**Creative rules:**
- Hook in 1-3 seconds: "Things I wish I knew before my first sweater" / "This app just replaced my notebook"
- UGC-style massively outperforms polished creative — film on a phone, show real knitting setups
- Show the app being used mid-project, not just screenshots
- 15-30 second videos demonstrating real use

### Pinterest Strategy

- Create pins for every feature linking to App Store
- SEO-friendly descriptions ("best knitting row counter app", "organize knitting projects")
- Pins are evergreen — they drive traffic for months/years unlike social posts
- 88% of Pinterest users have purchased something they discovered on the platform

### Ravelry Ads

Ravelry offers self-served banner ads (Featured Pattern, Featured Product) with a highly targeted audience at very low cost. This is the single most efficient channel for reaching knitters specifically — worth testing even at small budgets.

---

## 8. Influencer Marketing

### Why It Matters Most for This App

The craft community trusts recommendations from real makers. The most successful craft apps (Ribblr — 280K downloads, 450/day) grow through community-driven loops, not heavy paid acquisition. Each designer/influencer promotes to their audience.

### Pricing by Tier

| Tier | Followers | Instagram Post | TikTok Video | Approach |
|------|-----------|---------------|--------------|----------|
| Nano | 1K-10K | $50-150 | $25-75 | Often accept free Pro subscription |
| Micro | 10K-50K | $150-500 | $100-300 | Best ROI for niche apps |
| Mid | 50K-100K | $500-3,000 | $300-1,000 | Strong credibility |
| Macro | 100K-500K | $3,000-10,000 | $1,000-5,000 | Broad reach |

### Recommended Approach

1. **Start with micro-influencers (10K-50K).** Best engagement-to-cost ratio in craft niches
2. **Offer free lifetime Pro** as part of every deal — they need to actually use the app
3. **Affiliate model:** per-install bounty or revenue share (6-10% commission is standard in yarn industry)
4. **Target knitting/crochet podcast hosts** — the craft podcasting community (often YouTube) is tight-knit and influential. A single mention can drive hundreds of downloads
5. **Find influencers who already complain about existing apps** — they'll be the most authentic advocates

### Where to Find Them

- Modash and Favikon maintain ranked lists of top knitting influencers
- Search #knittok, #crochettok, #knittersofinstagram
- Ravelry forums for designers with large followings
- Craft Industry Alliance (professional network)

---

## 9. Messaging That Works

### Emotional Triggers (Research-Backed)

- 90% of crafters report crafting improves their mood
- 57% of 18-24 year olds cite creative outlet as top motivation
- 54% cite stress relief
- 47% cite feeling productive

### Copy Frameworks

| Angle | Example |
|-------|---------|
| Pain point | "Never lose your place in a pattern again" |
| Elevate the craft | "Your knitting deserves better than a tally on scrap paper" |
| Community | "Join thousands of knitters who've ditched the notebook" |
| Calm/zen tone | "A quieter way to track your projects" |
| Feature-specific | "Import any PDF pattern. Count rows with a tap. See your stash at a glance." |
| Identity | "Built for knitters, by knitters" |

### What to Avoid

- Overly clinical/tech language — say "pick up where you left off, on any device" not "sync your data across devices"
- Exclamation marks and hype — this audience prefers calm, warm, editorial tone
- Generic app marketing — the craft community detects inauthenticity instantly
- Showing only beginner projects — include complex colorwork, cables, lace to signal credibility

---

## 10. Starter Budget Allocation

For an early-stage app with $2,000-5,000/month:

| Channel | % | Monthly ($3K) | Focus |
|---------|---|---------------|-------|
| Instagram (Reels + Stories) | 35% | $1,050 | App install campaigns, feature demos |
| Micro-influencers | 25% | $750 | 2-3 micro-influencers/month |
| TikTok | 20% | $600 | Reach + awareness, younger crafters |
| Pinterest | 10% | $300 | Evergreen pins, app install pins |
| Ravelry ads | 5% | $150 | Banner ads on the platform users already live on |
| X/Twitter | 5% | $150 | Organic + small keyword test |

Scale whichever channel shows the best CPI-to-LTV ratio after 30-60 days.

---

## 11. Key Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| D1/D7/D30 retention | 30%/15%/10% | Above hobby-app benchmarks |
| Free-to-paid conversion | 3-5% (year 1), 5-8% (year 2) | Realistic for freemium hobby app |
| Trial-to-paid (reverse trial) | 15-20% | Reverse trials convert 2-3x better |
| DAU/MAU ratio | 20%+ | Measures stickiness |
| Time to first Pro feature use | < 3 days | During reverse trial |
| ARPPU (monthly) | $4.99-5.50 | Including annual/lifetime amortized |
| Payback period | < 60 days | CPI recovered from subscription revenue |
| Churn (monthly) | < 8% | AI-heavy apps average higher; sticky features offset |

---

## 12. Pattern Marketplace

**Status:** API routes and infrastructure implemented. Web pages and iOS views pending.

### Revenue Model

Creators sell their original patterns through Stitch. Payments are processed via **Stripe Connect (Express accounts)** on web. iOS users are linked to the web checkout page via Apple's External Purchase Link entitlement — no IAP needed.

| | Amount |
|---|---|
| **Platform fee** | 12% per sale |
| **Stripe fee** | ~2.9% + $0.30 (standard) |
| **Creator receives** | ~85% of sale price |
| **Price range** | $1.00 - $100.00 USD |

For comparison: Ravelry charges 3.5% after the first $30/month in sales (effectively 0% for small sellers). Etsy charges 6.5% transaction + 3% payment processing. Our 12% is higher than Ravelry but competitive with Etsy, and justified by the PDF protection, in-app delivery, and built-in audience.

### How It Works

1. **Creator onboarding** — Creator connects Stripe via Express account (hosted onboarding, ~2 min). Stripe handles identity verification, tax forms, and payout management.
2. **Listing** — Creator sets `price_cents` and `is_marketplace: true` on their pattern. Must be original work (not Ravelry-sourced, not from a paid PDF), with a cover photo and description.
3. **Discovery** — Marketplace browse page with search, filter by craft/category/weight/price, sort by newest/popular/price.
4. **Purchase** — Buyer clicks "Buy for $X.XX" → Stripe Checkout Session → payment split automatically via `application_fee_amount` (12% to platform, 88% to creator's Connect account).
5. **Fulfillment** — `checkout.session.completed` webhook marks purchase as completed, increments `sales_count`, notifies seller.
6. **Access** — Buyer can view the full pattern (including row-by-row instructions) and download a watermarked PDF.

### PDF Protection (Critical for Creator Trust)

Creators will not list patterns if they fear piracy. Five technical layers protect their work:

| Layer | What it does |
|-------|-------------|
| **Auth + ownership check** | Every PDF request verifies the user owns or has purchased the pattern |
| **Per-buyer watermarking** | Every PDF page is stamped with the buyer's username, transaction ID, and purchase date. If it leaks, it's traceable |
| **No raw URLs** | PDF bytes are streamed through our API. No permanent download links, no direct Supabase Storage URLs |
| **Rate limiting** | Max 20 PDF views per hour per user. Prevents bulk scraping |
| **Access logging** | Every view is logged with user ID, IP address, user agent, and timestamp. Anomalous patterns trigger alerts |

Additionally: if watermarking fails for any reason, the server **fails closed** — the PDF is not served without a watermark. The original uploaded PDF is never served directly to buyers.

### Legal Framework

Three agreements govern the marketplace:

**Buyer agreement** (accepted at checkout):
- Personal, non-transferable, non-exclusive license
- No redistribution, resale, or upload to other platforms
- Watermark removal is a violation
- Violation = account termination + legal action

**Creator agreement** (accepted when listing):
- Confirms original work, no copyright infringement
- Grants platform distribution rights
- Acknowledges 12% platform fee + Stripe processing
- Patterns must be complete (no drafts or placeholders)

**DMCA policy:**
- Standard notice-and-takedown process
- Counter-notification supported
- Three valid takedowns = permanent marketplace ban

### Content Gating

| User relationship | What they see |
|---|---|
| **Anyone** | Title, description, cover photo, metadata (gauge, sizes, difficulty, yarn weight), reviews |
| **Buyer (paid)** | All of the above + row-by-row instructions + watermarked PDF |
| **Creator (owner)** | Full access + unwatermarked PDF + sales stats |

Free marketplace patterns (price_cents = null) are accessible to all authenticated users, similar to community patterns.

### Tier Interaction

The marketplace is available to **all tiers** (Free, Plus, Pro). There is no subscription requirement to buy or sell patterns. This maximizes the buyer pool and avoids fragmenting the marketplace.

However, AI tools for working with purchased patterns (yarn substitution, size recommendation, etc.) remain Pro-gated. This creates a natural upsell: "You bought a sweater pattern — upgrade to Pro to get AI size recommendations for your measurements."

### iOS Flow

iOS cannot process payments directly (Apple's rules). Instead:

1. User browses marketplace patterns in-app
2. For paid patterns, taps "Purchase on stitch.app" → opens `SFSafariViewController` to web checkout
3. After completing payment, returns to app
4. App re-checks ownership via `GET /marketplace/{id}/ownership`
5. Pattern instructions and watermarked PDF are now accessible in-app

Apple's **External Purchase Link entitlement** (post-2024) allows linking to web checkout for digital content purchased outside the app. No 30% Apple commission.

### Creator Earnings Dashboard

Creators can view their earnings via `GET /marketplace/earnings`:
- Total sales count and revenue
- This month's earnings
- Number of patterns listed
- Recent 20 sales with buyer username, pattern title, and amount

Payout management (bank details, schedule, tax forms) is handled entirely through Stripe's hosted Express dashboard — we don't build or maintain payment infrastructure.

### Key Database Models

```
pattern_purchases {
  buyer_id, pattern_id, seller_id
  price_cents, platform_fee_cents, seller_amount_cents
  stripe_session_id (unique), stripe_payment_intent
  status: "pending" | "completed" | "refunded"
  @@unique([buyer_id, pattern_id])
}

pdf_access_logs {
  user_id, pdf_upload_id, pattern_id
  ip_address, user_agent, access_type
  // "view" | "download" | "watermarked_view"
}

users += stripe_connect_id, stripe_onboarded, seller_bio
patterns += price_cents, currency, is_marketplace, sales_count
```

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/marketplace` | GET | Browse marketplace (search, filter, sort) |
| `/marketplace/[id]` | GET | Pattern detail (gates instructions behind purchase) |
| `/marketplace/[id]/checkout` | POST | Create Stripe Checkout Session |
| `/marketplace/[id]/ownership` | GET | Check if user has access |
| `/marketplace/[id]/pdf` | GET | Serve watermarked PDF |
| `/marketplace/purchases` | GET | User's purchased patterns |
| `/marketplace/earnings` | GET | Creator earnings dashboard |
| `/marketplace/connect` | POST | Start Stripe Connect onboarding |
| `/marketplace/connect/status` | GET | Check onboarding completion |
| `/marketplace/connect/dashboard` | GET | Stripe Express dashboard link |
| `/marketplace/agreements` | GET | Legal agreement texts |
| `/webhooks/stripe` | POST | Purchase fulfillment + refunds |

### Growth Implications

The marketplace creates a **two-sided network effect**:
- More creators → more patterns → more buyers → more revenue for creators → more creators
- Each creator promotes Stitch to their existing audience (Ravelry, Instagram, newsletter)
- Pattern sales give creators a financial reason to prefer Stitch over Ravelry (competitive commission rate)
- Buyers who purchase patterns are deeply invested users with high retention

This mirrors Ravelry's original growth strategy — the pattern marketplace was what made Ravelry indispensable, not the project tracking. The key difference: Ravelry's marketplace was web-only. Stitch offers mobile-first browsing with in-app pattern access, which is a better experience for the 18-34 growth segment.

---

## Sources

**Monetization:**
- RevenueCat State of Subscription Apps 2026 (115K apps, $16B revenue)
- Ravelry Blog — "How Does Ravelry Make Money?"
- KnitCompanion, Row Counter, Stash2Go, Ribblr pricing (App Store)
- Duolingo freemium model analysis (MAU-to-premium: 3% → 8.8%)

**Free Tier Psychology:**
- Profitwell 2022 study (restrictive free tiers → 35% lower conversion)
- Canva, Notion, Spotify free tier design analysis
- Elena Verna / Amplitude — reverse trial research
- Frontiers in Psychology 2025 — trial duration and conversion

**Advertising:**
- Craft Yarn Council 2024 survey (7,000+ respondents)
- RevenueCat, Business of Apps — CPI/CPM benchmarks
- Hootsuite, Sprout Social — platform-specific ad performance
- Modash, Favikon — influencer pricing data
