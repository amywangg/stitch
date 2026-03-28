import { z } from 'zod'

export const listPatternSchema = z.object({
  price_cents: z.number().int().min(100).max(10000).nullable(),
  is_marketplace: z.boolean(),
})

export const marketplaceSearchSchema = z.object({
  query: z.string().max(200).optional(),
  craft: z.enum(['knitting', 'crochet']).optional(),
  category: z.string().max(50).optional(),
  weight: z.string().max(30).optional(),
  sort: z.enum(['newest', 'popular', 'price_low', 'price_high']).default('newest'),
  price_filter: z.enum(['free', 'paid', 'all']).default('all'),
})

export const checkoutSchema = z.object({
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
})
