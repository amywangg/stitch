# Pattern Marketplace

**Status:** API routes and infrastructure implemented. Web pages and iOS views pending.

---

## Overview

Creators sell original knitting/crochet patterns through Stitch. Payments flow through **Stripe Connect (Express accounts)** on web. iOS links to web checkout via Apple's External Purchase Link entitlement — no IAP, no 30% Apple cut.

---

## Revenue Model

| | Amount |
|---|---|
| Platform fee | 12% per sale |
| Stripe processing | ~2.9% + $0.30 |
| Creator receives | ~85% of sale price |
| Price range | $1.00 - $100.00 USD |

For comparison: Ravelry charges 3.5% after $30/month in sales. Etsy charges 6.5% transaction + 3% processing. Our 12% is higher than Ravelry but competitive with Etsy, justified by PDF protection, in-app delivery, and built-in mobile audience.

---

## Purchase Flow

### Web (payment happens here)

1. Buyer browses `/marketplace` — search, filter by craft/category/weight/price, sort by newest/popular/price
2. Taps into pattern detail → sees metadata, photos, gauge, sizes, reviews (but not row-by-row instructions)
3. Clicks "Buy for $X.XX" → `POST /marketplace/[id]/checkout` → creates Stripe Checkout Session
4. Redirected to Stripe's hosted checkout page → enters card → pays
5. Stripe splits payment: 88% to creator's Connect account, 12% platform fee
6. `checkout.session.completed` webhook fires → marks purchase completed, increments `sales_count`, notifies seller
7. Buyer redirected to pattern detail with full access

### iOS (viewing happens here)

1. User browses marketplace patterns in-app (same API, native UI)
2. For paid patterns, sees price and "Purchase on stitch.app" button
3. Button opens `SFSafariViewController` to web checkout page
4. After completing payment, returns to app
5. App re-checks ownership via `GET /marketplace/[id]/ownership`
6. Pattern instructions and watermarked PDF are now accessible in-app

Apple's External Purchase Link entitlement (post-2024) allows linking to web checkout for digital content. No Apple commission.

---

## Creator Onboarding

1. Creator taps "Sell this pattern" (iOS → opens web) or visits `/marketplace/sell` (web)
2. `POST /marketplace/connect` → creates Stripe Connect Express account → returns onboarding link
3. Creator completes Stripe's hosted onboarding (~2 min): identity verification, bank details, tax info
4. `account.updated` webhook fires → sets `stripe_onboarded = true`
5. Creator can now set `price_cents` and `is_marketplace: true` on their patterns

### Listing Requirements

- Pattern must be original work (`source_free = true`, no `ravelry_id`)
- Must have a cover photo and description
- Creator must have completed Stripe Connect onboarding
- Price between $1.00 and $100.00 USD (or free)

---

## PDF Protection

Creators will not list patterns if they fear piracy. Five technical layers protect their work:

### Layer 1: Auth + ownership check

Every PDF request verifies the user either owns the pattern (is the creator) or has a completed purchase. Unauthenticated requests are rejected. Users without access get a `403 PURCHASE_REQUIRED` error.

### Layer 2: Per-buyer watermarking

Every PDF page is stamped with:
- Buyer's username
- Transaction ID
- Purchase date

Two watermark placements per page:
- **Diagonal center** — subtle gray text at 30% opacity, rotated to span the page
- **Bottom margin** — smaller text at 50% opacity, always visible

If a watermarked PDF leaks online, the watermark traces it to the specific buyer.

Implementation: `apps/web/lib/pdf-watermark.ts` using `pdf-lib`. The watermark is applied server-side on every view — no pre-generated copies stored.

### Layer 3: No raw URLs

PDFs are streamed through our API (`GET /marketplace/[id]/pdf`). The response is binary PDF data with `no-store` cache headers. There are no permanent download links, no signed Supabase Storage URLs exposed to buyers. The original file in Supabase Storage is only accessed server-side.

### Layer 4: Rate limiting

Maximum 20 PDF views per hour per user per PDF. Prevents automated scraping or bulk downloading. Returns `429 Too Many Requests` when exceeded.

### Layer 5: Access logging

Every PDF view is logged in `pdf_access_logs`:
- User ID
- PDF upload ID and pattern ID
- IP address
- User agent
- Access type (`view` for owners, `watermarked_view` for buyers)
- Timestamp

Anomalous patterns (e.g., 100 views from different IPs for the same user) can be flagged for investigation.

### Fail-closed design

If watermarking fails for any reason (corrupted PDF, pdf-lib error), the server does **not** fall back to serving the unwatermarked PDF. It returns a 500 error. This prevents accidental exposure of unprotected content.

---

## Legal Agreements

Three agreements govern the marketplace. Full text in `apps/web/lib/agreements.ts`. Served via `GET /marketplace/agreements`.

### Buyer agreement (v1.0)

Accepted at checkout. Key terms:

- **License**: Personal, non-transferable, non-exclusive license for individual use
- **Watermarking notice**: All PDFs are watermarked with buyer's account info
- **Prohibited**: Sharing, redistributing, reselling, uploading to other platforms, removing watermarks, claiming as own work
- **Commercial use**: Not permitted unless creator explicitly grants it
- **Enforcement**: Violation → account termination + potential legal action
- **Refunds**: Digital purchases generally non-refundable; technical issues handled within 14 days

### Creator agreement (v1.0)

Accepted when first listing a pattern for sale. Key terms:

- **Eligibility**: Must be 18+, must complete Stripe Connect verification
- **Original work warranty**: Pattern is original or creator has legal right to sell. No infringement.
- **Content requirements**: Title, cover photo, description, and PDF required. Must be complete and usable.
- **Pricing and fees**: Creator sets price ($1-$100). Platform keeps 12%. Stripe fees deducted from payout.
- **PDF protection**: All sold PDFs are watermarked. Originals stored encrypted. Platform provides reasonable protection but cannot guarantee against all piracy.
- **Payouts**: Handled by Stripe. No funds held by Stitch.
- **Takedowns**: Platform can remove listings for violations or valid DMCA notices.
- **Termination**: Creator can delist anytime. Existing purchases remain valid.

### DMCA policy (v1.0)

- **Reporting**: Send takedown notice to copyright@stitch.app with: identification of work, URL, contact info, good faith statement, signature
- **Counter-notification**: Removed patterns restored in 10-14 business days unless original complainant files court action
- **Repeat infringers**: Three valid takedowns = permanent marketplace ban

---

## Pattern Types

Stitch supports two types of original patterns. Both can be listed on the marketplace.

### Type 1: Built in-app

Created via the pattern builder UI — sections, rows, and instructions entered directly in the app. The PDF is **auto-generated on demand** from the structured data.

- "View PDF" and "Download PDF" buttons always available
- No need to upload a PDF — it's generated server-side via `POST /pdf/generate`
- If sold on marketplace, the generated PDF is watermarked per-buyer
- Pattern detail page shows sections/rows inline AND offers PDF view

### Type 2: Uploaded PDF

Creator uploads their own PDF file. The PDF itself is the pattern.

- Can be AI-parsed (Pro) to extract structured sections/rows
- Can be manually filled with metadata (title, description, gauge, etc.) by any tier
- "View PDF" shows the uploaded file directly
- If sold on marketplace, the uploaded PDF is watermarked per-buyer
- No "convert to PDF" or "generate PDF" — the uploaded file is already the PDF

### Key rules

- **Type 1 patterns never show "Upload PDF"** — the PDF is always generated from the builder data
- **Type 2 patterns never show "View generated PDF"** — they show the uploaded file
- **PDF upload is available to all tiers** — AI parsing is Pro-gated, but manual metadata entry is free
- **Both types get watermarked identically** when sold on marketplace

---

## Content Gating

| User relationship | Metadata | Instructions | PDF | Reviews |
|---|---|---|---|---|
| Not logged in | N/A (auth required) | — | — | — |
| Logged in, no purchase | Title, description, photos, gauge, sizes, yarn weight, difficulty | Hidden | Hidden | Visible |
| Buyer (completed purchase) | Full | Full | Watermarked | Visible + can write |
| Creator (pattern owner) | Full | Full | Unwatermarked (Type 1: generated, Type 2: original) | Visible |

Free marketplace patterns (`price_cents = null`) grant full access to all authenticated users.

---

## Tier Interaction

The marketplace is available to **all subscription tiers** (Free, Plus, Pro). No subscription required to buy or sell patterns.

This maximizes the buyer pool — gating marketplace access behind Pro would severely limit the audience and make the platform unattractive to creators.

AI tools for working with purchased patterns (yarn substitution, size recommendation, etc.) remain Pro-gated. This creates a natural upsell: "You bought a sweater pattern — upgrade to Pro to get AI size recommendations."

---

## Creator Earnings Dashboard

`GET /marketplace/earnings` returns:

```json
{
  "total_sales": 47,
  "total_earnings_cents": 198500,
  "this_month_cents": 34200,
  "patterns_listed": 8,
  "recent_sales": [
    {
      "id": "...",
      "price_cents": 599,
      "platform_fee_cents": 72,
      "seller_amount_cents": 527,
      "created_at": "2026-03-15T...",
      "pattern": { "title": "Honey Cowl", "slug": "honey-cowl" },
      "buyer": { "username": "knitlover42", "display_name": "Sarah" }
    }
  ]
}
```

Payout management (bank details, payout schedule, tax forms, 1099s) is handled through Stripe's hosted Express dashboard. Creators access it via `GET /marketplace/connect/dashboard` which returns a Stripe login link.

---

## Database Schema

### New fields on `users`

```prisma
stripe_connect_id   String?   @unique  // Stripe Connect Express account ID
stripe_onboarded    Boolean   @default(false)
seller_bio          String?
```

### New fields on `patterns`

```prisma
price_cents         Int?      // null = free, > 0 = paid (USD cents)
currency            String    @default("usd")
is_marketplace      Boolean   @default(false)
sales_count         Int       @default(0)  // denormalized for sort

@@index([is_marketplace, deleted_at])
```

### `pattern_purchases` (new table)

```prisma
model pattern_purchases {
  id                    String   @id @default(uuid())
  buyer_id              String
  pattern_id            String
  seller_id             String
  price_cents           Int
  platform_fee_cents    Int       // 12%
  seller_amount_cents   Int
  currency              String    @default("usd")
  stripe_session_id     String    @unique
  stripe_payment_intent String?
  status                String    @default("pending")  // pending | completed | refunded

  @@unique([buyer_id, pattern_id])  // one purchase per user per pattern
}
```

### `pdf_access_logs` (new table)

```prisma
model pdf_access_logs {
  id              String   @id @default(uuid())
  user_id         String
  pdf_upload_id   String
  pattern_id      String?
  ip_address      String?
  user_agent      String?
  access_type     String   // view | download | watermarked_view

  @@index([user_id, created_at])
}
```

---

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/marketplace` | GET | Yes | Browse patterns (search, filter, sort, paginated) |
| `/marketplace/[id]` | GET | Yes | Pattern detail — gates instructions behind purchase |
| `/marketplace/[id]/checkout` | POST | Yes | Create Stripe Checkout Session |
| `/marketplace/[id]/ownership` | GET | Yes | Check access (used by iOS to show buy vs view) |
| `/marketplace/[id]/pdf` | GET | Yes | Serve watermarked PDF — rate limited + logged |
| `/marketplace/purchases` | GET | Yes | User's purchased patterns (paginated) |
| `/marketplace/earnings` | GET | Yes | Creator earnings summary + recent sales |
| `/marketplace/connect` | POST | Yes | Create Stripe Connect account + onboarding link |
| `/marketplace/connect/status` | GET | Yes | Check Stripe onboarding status |
| `/marketplace/connect/dashboard` | GET | Yes | Get Stripe Express dashboard login link |
| `/marketplace/agreements` | GET | No | Legal agreement texts (buyer, creator, DMCA) |
| `/webhooks/stripe` | POST | Stripe sig | Purchase fulfillment, refunds, account updates |

---

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://stitch.app
```

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/lib/stripe.ts` | Stripe client, fee constants, `calculateFees()` |
| `apps/web/lib/pdf-watermark.ts` | `watermarkPdf()` — stamps every page with buyer info |
| `apps/web/lib/agreements.ts` | Full legal text for all three agreements |
| `apps/web/lib/schemas/marketplace.ts` | Zod validation schemas |
| `apps/web/app/api/v1/marketplace/` | All marketplace API routes |
| `apps/web/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `packages/db/prisma/schema.prisma` | `pattern_purchases`, `pdf_access_logs` models |

---

## Dependencies

```json
{
  "stripe": "^17.x",
  "pdf-lib": "^1.17.x"
}
```

Both installed in `apps/web/package.json`.

---

## What's Built vs What's Pending

### Built

- [x] Database schema (validated, Prisma client regenerated)
- [x] All 12 API routes
- [x] Stripe Connect onboarding flow
- [x] Checkout session creation with fee splitting
- [x] Stripe webhook (purchase fulfillment, refunds, account updates)
- [x] PDF watermarking with pdf-lib
- [x] PDF access logging and rate limiting
- [x] Legal agreements (buyer, creator, DMCA)
- [x] Marketplace fields on existing PATCH /patterns/[id] route
- [x] iOS models (MarketplacePattern, PatternOwnership, etc.)
- [x] Zod validation schemas

### Pending

- [ ] `pnpm db:push` to apply schema to database
- [ ] iOS views: MarketplaceView, MarketplacePatternDetailView
- [ ] iOS: creator earnings view
- [ ] iOS: "Sell this pattern" button in PatternDetailView toolbar
- [ ] Web: `/marketplace` browse page
- [ ] Web: `/marketplace/[id]` detail + checkout page
- [ ] Web: `/marketplace/sell` creator dashboard
- [ ] Stripe account setup (create Connect platform, configure webhooks)
- [ ] Apple: apply for External Purchase Link entitlement
- [ ] Refund handling UX (buyer-initiated refund requests)
- [ ] Abuse detection alerts (anomalous PDF access patterns)
- [ ] Search indexing / full-text search for marketplace patterns
- [ ] Creator verification badges (optional, future)

---

## Growth Implications

The marketplace creates a **two-sided network effect**:

1. More creators → more patterns → more buyers → more revenue for creators → more creators
2. Each creator promotes Stitch to their existing audience (Ravelry, Instagram, newsletter)
3. Pattern sales give creators a financial incentive to prefer Stitch over Ravelry
4. Buyers who purchase patterns are deeply invested users with high retention

This mirrors Ravelry's original growth: the pattern marketplace made Ravelry indispensable, not the project tracking. Stitch offers mobile-first browsing with in-app pattern access — a better experience for the 18-34 growth segment that lives on their phones.
