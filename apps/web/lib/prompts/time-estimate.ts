/**
 * Prompt builder for AI-powered project time estimation context.
 * AI adds motivational context and practical scheduling advice
 * on top of the deterministic math from time-math.ts.
 */

import type { SectionEstimate, SpeedProfile, SessionFrequency } from '@/lib/time-math'

export interface TimeEstimatePromptInput {
  project_title: string
  pattern_title: string | null
  craft_type: string
  percent_complete: number
  current_section: string | null
  sections: SectionEstimate[]
  speed: SpeedProfile
  frequency: SessionFrequency
  total_remaining_hours: number
  estimated_days: number
  estimated_date: string
}

export interface TimeEstimateAIResponse {
  summary: string
  section_context: string | null
  pacing_advice: string
  milestone_note: string | null
}

export function buildTimeEstimatePrompt(input: TimeEstimatePromptInput): {
  system: string
  user: string
} {
  const sectionBreakdown = input.sections
    .map((s) => {
      if (s.is_completed) return `  - ${s.name}: done`
      if (s.remaining_rows === 0) return `  - ${s.name}: done (no rows tracked)`
      return `  - ${s.name}: ${s.completed_rows}/${s.total_rows} rows (${s.estimated_hours}h remaining)`
    })
    .join('\n')

  const activeSections = input.sections.filter((s) => !s.is_completed && s.remaining_rows > 0)

  return {
    system: `You are a knitting project coach. You give concise, encouraging progress updates and practical scheduling advice.

Rules:
- Be warm but not saccharine — no exclamation marks, no "you got this!" platitudes
- Reference specific sections by name when relevant
- If a section is very long (100+ rows), acknowledge the grind
- If the project is nearly done (<10% remaining), celebrate appropriately
- If speed confidence is low, mention that the estimate will improve as they knit more
- Keep it short — 1-2 sentences per field maximum
- No disclaimers or hedging language

Respond with valid JSON only.`,

    user: `Project: "${input.project_title}"${input.pattern_title ? ` (pattern: "${input.pattern_title}")` : ''}
Craft: ${input.craft_type}
Progress: ${input.percent_complete}% complete

Section breakdown:
${sectionBreakdown}

${input.current_section ? `Currently working on: ${input.current_section}` : ''}

Speed: ${input.speed.rows_per_hour} rows/hour (${input.speed.confidence} confidence, ${input.speed.sessions_analyzed} sessions analyzed)
Schedule: ${input.frequency.sessions_per_week} sessions/week, ~${input.frequency.avg_session_minutes} min each
Remaining: ${input.total_remaining_hours} hours of knitting
Estimated completion: ${input.estimated_days} days (${input.estimated_date})

${activeSections.length} section${activeSections.length === 1 ? '' : 's'} remaining.

Return JSON:
{
  "summary": "1-2 sentence overall progress summary with time estimate in natural language",
  "section_context": "context about what's ahead in the current/next section, or null if project is simple",
  "pacing_advice": "1 sentence about their pace and when they'll finish based on their schedule",
  "milestone_note": "note about an upcoming milestone (halfway, last section, almost done), or null"
}`,
  }
}
