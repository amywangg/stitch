/**
 * Deterministic project time estimation calculations.
 * Derives knitting speed from counter history and crafting sessions,
 * then projects completion time across pattern sections.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionData {
  duration_minutes: number
  active_minutes: number | null
  rows_start: number | null
  rows_end: number | null
}

export interface SectionEstimate {
  name: string
  total_rows: number
  completed_rows: number
  remaining_rows: number
  estimated_minutes: number
  estimated_hours: number
  is_completed: boolean
}

export interface SpeedProfile {
  rows_per_hour: number
  confidence: 'high' | 'medium' | 'low'
  sessions_analyzed: number
  total_rows_tracked: number
  total_minutes_tracked: number
}

export interface TimeEstimate {
  speed: SpeedProfile
  sections: SectionEstimate[]
  total_remaining_rows: number
  total_remaining_minutes: number
  total_remaining_hours: number
  percent_complete: number
}

// ─── Speed calculation ───────────────────────────────────────────────────────

/** Default knitting speed when no data is available (rows per hour) */
const DEFAULT_ROWS_PER_HOUR = 15

/** Minimum sessions needed for high confidence */
const HIGH_CONFIDENCE_THRESHOLD = 5

/** Minimum sessions needed for medium confidence */
const MEDIUM_CONFIDENCE_THRESHOLD = 2

/**
 * Calculates the user's knitting speed from crafting session data.
 * Uses sessions with both row tracking and time data.
 * Falls back to default speed if no usable sessions exist.
 */
export function calculateSpeed(sessions: SessionData[]): SpeedProfile {
  // Filter to sessions with usable row + time data
  const usable = sessions.filter(
    (s) =>
      s.rows_start != null &&
      s.rows_end != null &&
      s.rows_end > s.rows_start &&
      s.duration_minutes > 0,
  )

  if (usable.length === 0) {
    return {
      rows_per_hour: DEFAULT_ROWS_PER_HOUR,
      confidence: 'low',
      sessions_analyzed: 0,
      total_rows_tracked: 0,
      total_minutes_tracked: 0,
    }
  }

  let totalRows = 0
  let totalMinutes = 0

  for (const s of usable) {
    const rows = s.rows_end! - s.rows_start!
    // Prefer active_minutes (excludes breaks) over total duration
    const minutes = s.active_minutes ?? s.duration_minutes
    totalRows += rows
    totalMinutes += minutes
  }

  const rowsPerHour = totalMinutes > 0 ? (totalRows / totalMinutes) * 60 : DEFAULT_ROWS_PER_HOUR

  let confidence: SpeedProfile['confidence'] = 'low'
  if (usable.length >= HIGH_CONFIDENCE_THRESHOLD) confidence = 'high'
  else if (usable.length >= MEDIUM_CONFIDENCE_THRESHOLD) confidence = 'medium'

  return {
    rows_per_hour: round2(rowsPerHour),
    confidence,
    sessions_analyzed: usable.length,
    total_rows_tracked: totalRows,
    total_minutes_tracked: totalMinutes,
  }
}

// ─── Section time estimation ─────────────────────────────────────────────────

export interface SectionInput {
  name: string
  target_rows: number | null
  current_row: number
  completed: boolean
}

/**
 * Estimates time for each section and the overall project.
 */
export function estimateProjectTime(
  sections: SectionInput[],
  speed: SpeedProfile,
): TimeEstimate {
  const sectionEstimates: SectionEstimate[] = []
  let totalRemainingRows = 0
  let totalRows = 0
  let completedRows = 0

  for (const section of sections) {
    const sectionTotal = section.target_rows ?? 0
    const sectionDone = section.completed ? sectionTotal : section.current_row
    const remaining = section.completed ? 0 : Math.max(0, sectionTotal - section.current_row)

    totalRows += sectionTotal
    completedRows += sectionDone
    totalRemainingRows += remaining

    const estimatedMinutes = speed.rows_per_hour > 0
      ? (remaining / speed.rows_per_hour) * 60
      : 0

    sectionEstimates.push({
      name: section.name,
      total_rows: sectionTotal,
      completed_rows: sectionDone,
      remaining_rows: remaining,
      estimated_minutes: Math.round(estimatedMinutes),
      estimated_hours: round2(estimatedMinutes / 60),
      is_completed: section.completed,
    })
  }

  const totalRemainingMinutes = speed.rows_per_hour > 0
    ? (totalRemainingRows / speed.rows_per_hour) * 60
    : 0

  const percentComplete = totalRows > 0 ? round2((completedRows / totalRows) * 100) : 0

  return {
    speed,
    sections: sectionEstimates,
    total_remaining_rows: totalRemainingRows,
    total_remaining_minutes: Math.round(totalRemainingMinutes),
    total_remaining_hours: round2(totalRemainingMinutes / 60),
    percent_complete: percentComplete,
  }
}

// ─── Calendar estimation ─────────────────────────────────────────────────────

export interface SessionFrequency {
  sessions_per_week: number
  avg_session_minutes: number
}

/**
 * Estimates session frequency from recent crafting sessions.
 * Looks at the last 30 days of activity.
 */
export function calculateSessionFrequency(
  sessions: Array<{ date: Date; duration_minutes: number }>,
): SessionFrequency {
  if (sessions.length === 0) {
    // Default: 3 sessions/week, 45 min each — reasonable hobby pace
    return { sessions_per_week: 3, avg_session_minutes: 45 }
  }

  // Find date range
  const dates = sessions.map((s) => s.date.getTime())
  const earliest = Math.min(...dates)
  const latest = Math.max(...dates)
  const spanDays = Math.max(1, (latest - earliest) / (1000 * 60 * 60 * 24))
  const spanWeeks = Math.max(1, spanDays / 7)

  const sessionsPerWeek = round2(sessions.length / spanWeeks)
  const avgMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / sessions.length

  return {
    sessions_per_week: sessionsPerWeek,
    avg_session_minutes: Math.round(avgMinutes),
  }
}

/**
 * Given remaining minutes and session frequency, estimates calendar days to completion.
 */
export function estimateCalendarDays(
  remainingMinutes: number,
  frequency: SessionFrequency,
): { estimated_days: number; estimated_date: string } {
  const minutesPerWeek = frequency.sessions_per_week * frequency.avg_session_minutes
  if (minutesPerWeek <= 0) {
    return { estimated_days: 0, estimated_date: 'unknown' }
  }

  const weeks = remainingMinutes / minutesPerWeek
  const days = Math.ceil(weeks * 7)

  const completionDate = new Date()
  completionDate.setDate(completionDate.getDate() + days)

  return {
    estimated_days: days,
    estimated_date: completionDate.toISOString().split('T')[0],
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
