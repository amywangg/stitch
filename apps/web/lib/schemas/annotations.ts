import { z } from 'zod'

// Individual point for pen strokes
const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
})

// Bounding rectangle for highlights and text notes
const boundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

// A single annotation on a PDF page
const annotationItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['highlight', 'pen', 'text']),
  page: z.number().int().min(0),
  bounds: boundsSchema.optional(), // highlight + text
  color: z.string().max(20), // hex color e.g. "#FFEB3B"
  points: z.array(pointSchema).optional(), // pen strokes
  text: z.string().max(1000).optional(), // text note content
  width: z.number().min(0.5).max(20).optional(), // pen stroke width
})

// The full annotation data payload
export const annotationDataSchema = z.object({
  annotations: z.array(annotationItemSchema).max(500),
})

export type AnnotationData = z.infer<typeof annotationDataSchema>
export type AnnotationItem = z.infer<typeof annotationItemSchema>
