import { z } from 'zod'

/** Reusable schema for page/limit query params. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/** Reusable schema for a single UUID path param. */
export const idParamSchema = z.object({
  id: z.string().uuid(),
})
