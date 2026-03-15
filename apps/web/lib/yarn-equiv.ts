/**
 * Deterministic yarn equivalence scoring.
 * Matches yarns by weight, fiber content, yardage, and grams.
 * Used to pre-filter candidates before AI evaluation.
 */

import { YARN_WEIGHT_ORDER, isValidYarnWeight, type YarnWeight } from '@/lib/yarn-math'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface YarnProfile {
  id: string
  name: string
  company: string | null
  weight: string | null
  fiber_content: string | null
  yardage_per_skein: number | null
  grams_per_skein: number | null
  image_url?: string | null
}

export interface ScoredYarn {
  yarn: YarnProfile
  score: number
  weight_match: 'exact' | 'adjacent' | 'none'
  fiber_overlap: number // 0-1
  yardage_similarity: number // 0-1
  grams_similarity: number // 0-1
}

// ─── Fiber parsing ───────────────────────────────────────────────────────────

/** Common fiber names normalized for comparison */
const FIBER_ALIASES: Record<string, string> = {
  'merino': 'wool',
  'superwash merino': 'superwash wool',
  'superwash': 'superwash wool',
  'lambswool': 'wool',
  'shetland': 'wool',
  'bluefaced leicester': 'wool',
  'bfl': 'wool',
  'corriedale': 'wool',
  'targhee': 'wool',
  'rambouillet': 'wool',
  'kid mohair': 'mohair',
  'kid silk': 'mohair',
  'tussah silk': 'silk',
  'mulberry silk': 'silk',
  'pima cotton': 'cotton',
  'organic cotton': 'cotton',
  'mercerized cotton': 'cotton',
  'baby alpaca': 'alpaca',
  'huacaya alpaca': 'alpaca',
  'suri alpaca': 'alpaca',
  'tencel': 'lyocell',
  'polyamide': 'nylon',
}

/**
 * Extracts fiber types from a fiber content string like "80% merino, 20% nylon".
 * Returns normalized fiber names with their percentages.
 */
export function parseFiberContent(
  content: string | null | undefined,
): Array<{ fiber: string; pct: number }> {
  if (!content) return []

  const fibers: Array<{ fiber: string; pct: number }> = []
  // Match patterns like "80% merino wool", "100% cotton", "merino/silk"
  const segments = content.toLowerCase().split(/[,/+&]/)

  for (const segment of segments) {
    const trimmed = segment.trim()
    if (!trimmed) continue

    // Try to extract percentage
    const pctMatch = trimmed.match(/(\d+)\s*%\s*(.+)/)
    if (pctMatch) {
      const pct = parseInt(pctMatch[1], 10)
      const fiberName = pctMatch[2].trim()
      const normalized = FIBER_ALIASES[fiberName] ?? fiberName
      fibers.push({ fiber: normalized, pct })
    } else {
      // No percentage — treat as equal parts
      const normalized = FIBER_ALIASES[trimmed] ?? trimmed
      fibers.push({ fiber: normalized, pct: 0 }) // 0 = unknown percentage
    }
  }

  // If any have 0 pct (unknown), distribute remaining evenly
  const knownPct = fibers.filter((f) => f.pct > 0).reduce((sum, f) => sum + f.pct, 0)
  const unknowns = fibers.filter((f) => f.pct === 0)
  if (unknowns.length > 0 && knownPct < 100) {
    const remaining = 100 - knownPct
    const perFiber = remaining / unknowns.length
    unknowns.forEach((f) => (f.pct = perFiber))
  }

  return fibers
}

/**
 * Calculates fiber content overlap between two yarns (0-1).
 * Higher score = more similar fiber composition.
 */
export function fiberOverlap(a: string | null | undefined, b: string | null | undefined): number {
  const fibersA = parseFiberContent(a)
  const fibersB = parseFiberContent(b)

  if (fibersA.length === 0 || fibersB.length === 0) return 0.5 // Unknown — neutral

  // Compute overlap by shared fiber types, weighted by percentage
  let overlap = 0
  for (const fA of fibersA) {
    const match = fibersB.find((fB) => fB.fiber === fA.fiber)
    if (match) {
      // Score based on how close the percentages are
      const minPct = Math.min(fA.pct, match.pct)
      overlap += minPct
    }
  }

  return Math.min(1, overlap / 100)
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Calculates similarity between two numeric values (0-1).
 * Returns 1 for identical, decreasing as they diverge.
 */
function numericSimilarity(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  if (a == null || b == null) return 0.5 // Unknown — neutral
  if (a === 0 && b === 0) return 1
  const max = Math.max(a, b)
  if (max === 0) return 1
  return 1 - Math.abs(a - b) / max
}

/**
 * Scores a candidate yarn against a source yarn.
 * Higher score = more equivalent.
 */
export function scoreEquivalence(source: YarnProfile, candidate: YarnProfile): ScoredYarn {
  // Weight match
  let weightMatch: ScoredYarn['weight_match'] = 'none'
  let weightScore = 0

  if (source.weight && candidate.weight) {
    if (source.weight === candidate.weight) {
      weightMatch = 'exact'
      weightScore = 1
    } else if (
      isValidYarnWeight(source.weight) &&
      isValidYarnWeight(candidate.weight)
    ) {
      const diff = Math.abs(
        YARN_WEIGHT_ORDER[source.weight as YarnWeight] -
          YARN_WEIGHT_ORDER[candidate.weight as YarnWeight],
      )
      if (diff === 1) {
        weightMatch = 'adjacent'
        weightScore = 0.5
      }
    }
  } else {
    weightScore = 0.3 // Unknown weight — partial credit
  }

  // Fiber overlap
  const fiber = fiberOverlap(source.fiber_content, candidate.fiber_content)

  // Yardage similarity
  const yardage = numericSimilarity(source.yardage_per_skein, candidate.yardage_per_skein)

  // Grams similarity
  const grams = numericSimilarity(source.grams_per_skein, candidate.grams_per_skein)

  // Weighted composite score
  // Weight category is most important, then fiber, then put-up (yardage/grams)
  const score = weightScore * 0.35 + fiber * 0.35 + yardage * 0.15 + grams * 0.15

  return {
    yarn: candidate,
    score: Math.round(score * 100) / 100,
    weight_match: weightMatch,
    fiber_overlap: Math.round(fiber * 100) / 100,
    yardage_similarity: Math.round(yardage * 100) / 100,
    grams_similarity: Math.round(grams * 100) / 100,
  }
}

/**
 * Scores and ranks an array of candidates against a source yarn.
 * Returns top N results sorted by score descending.
 */
export function rankEquivalents(
  source: YarnProfile,
  candidates: YarnProfile[],
  limit = 15,
): ScoredYarn[] {
  return candidates
    .filter((c) => c.id !== source.id) // Exclude the source yarn itself
    .map((c) => scoreEquivalence(source, c))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
