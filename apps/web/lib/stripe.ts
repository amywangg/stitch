import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const _stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

/** Get Stripe instance or return 503 error response */
export function getStripe(): Stripe | NextResponse {
  if (!_stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  return _stripe
}

// Keep the old export for backwards compat — routes should migrate to getStripe()
export const stripe = _stripe

export const MARKETPLACE_FEE_PERCENT = 12
export const MIN_PRICE_CENTS = 100  // $1.00 minimum
export const MAX_PRICE_CENTS = 100_00  // $100.00 maximum

export function calculateFees(priceCents: number) {
  const platformFeeCents = Math.round(priceCents * MARKETPLACE_FEE_PERCENT / 100)
  const sellerAmountCents = priceCents - platformFeeCents
  return { platformFeeCents, sellerAmountCents }
}
