/**
 * Standard measurement tables by project type.
 * All measurements in cm. Used by the math layer to generate all sizes.
 */

// ─── Hat sizes ──────────────────────────────────────────────────────────────

export const HAT_SIZES: Record<string, { head_circumference_cm: number }> = {
  'Newborn':     { head_circumference_cm: 36 },
  'Baby':        { head_circumference_cm: 40 },
  'Toddler':     { head_circumference_cm: 46 },
  'Child':       { head_circumference_cm: 50 },
  'Teen':        { head_circumference_cm: 53 },
  'Adult S':     { head_circumference_cm: 54 },
  'Adult M':     { head_circumference_cm: 56 },
  'Adult L':     { head_circumference_cm: 58 },
  'Adult XL':    { head_circumference_cm: 61 },
}

// ─── Sweater sizes ──────────────────────────────────────────────────────────

export const SWEATER_SIZES: Record<string, {
  bust_cm: number
  shoulder_width_cm: number
  arm_length_cm: number
  upper_arm_cm: number
  back_length_cm: number
}> = {
  'XS':  { bust_cm: 71,  shoulder_width_cm: 36, arm_length_cm: 56, upper_arm_cm: 28, back_length_cm: 56 },
  'S':   { bust_cm: 81,  shoulder_width_cm: 38, arm_length_cm: 58, upper_arm_cm: 30, back_length_cm: 58 },
  'M':   { bust_cm: 91,  shoulder_width_cm: 40, arm_length_cm: 59, upper_arm_cm: 33, back_length_cm: 60 },
  'L':   { bust_cm: 102, shoulder_width_cm: 43, arm_length_cm: 60, upper_arm_cm: 36, back_length_cm: 62 },
  'XL':  { bust_cm: 112, shoulder_width_cm: 46, arm_length_cm: 61, upper_arm_cm: 39, back_length_cm: 64 },
  '2XL': { bust_cm: 122, shoulder_width_cm: 48, arm_length_cm: 62, upper_arm_cm: 42, back_length_cm: 65 },
  '3XL': { bust_cm: 132, shoulder_width_cm: 50, arm_length_cm: 62, upper_arm_cm: 45, back_length_cm: 66 },
  '4XL': { bust_cm: 142, shoulder_width_cm: 52, arm_length_cm: 63, upper_arm_cm: 48, back_length_cm: 67 },
  '5XL': { bust_cm: 152, shoulder_width_cm: 54, arm_length_cm: 63, upper_arm_cm: 51, back_length_cm: 68 },
}

// ─── Sock sizes ─────────────────────────────────────────────────────────────

export const SOCK_SIZES: Record<string, { foot_length_cm: number; foot_circumference_cm: number }> = {
  'EU 35-36': { foot_length_cm: 22.5, foot_circumference_cm: 20 },
  'EU 37-38': { foot_length_cm: 24,   foot_circumference_cm: 21 },
  'EU 39-40': { foot_length_cm: 25.5, foot_circumference_cm: 22 },
  'EU 41-42': { foot_length_cm: 27,   foot_circumference_cm: 24 },
  'EU 43-44': { foot_length_cm: 28.5, foot_circumference_cm: 25 },
  'EU 45-46': { foot_length_cm: 30,   foot_circumference_cm: 26 },
}

// ─── Mitten sizes ───────────────────────────────────────────────────────────

export const MITTEN_SIZES: Record<string, {
  hand_circumference_cm: number
  hand_length_cm: number
  thumb_length_cm: number
}> = {
  'Baby':      { hand_circumference_cm: 10, hand_length_cm: 8,    thumb_length_cm: 2.5 },
  'Toddler':   { hand_circumference_cm: 12, hand_length_cm: 10,   thumb_length_cm: 3.0 },
  'Child S':   { hand_circumference_cm: 14, hand_length_cm: 12,   thumb_length_cm: 3.5 },
  'Child M':   { hand_circumference_cm: 15, hand_length_cm: 14,   thumb_length_cm: 4.0 },
  'Child L':   { hand_circumference_cm: 16, hand_length_cm: 15.5, thumb_length_cm: 4.5 },
  'Adult S':   { hand_circumference_cm: 18, hand_length_cm: 17,   thumb_length_cm: 5.0 },
  'Adult M':   { hand_circumference_cm: 20, hand_length_cm: 19,   thumb_length_cm: 5.5 },
  'Adult L':   { hand_circumference_cm: 22, hand_length_cm: 21,   thumb_length_cm: 6.0 },
  'Adult XL':  { hand_circumference_cm: 24, hand_length_cm: 22.5, thumb_length_cm: 6.5 },
}

// ─── Blanket presets ────────────────────────────────────────────────────────

export const BLANKET_PRESETS: Record<string, { width_cm: number; height_cm: number }> = {
  'Dishcloth':   { width_cm: 25,  height_cm: 25  },
  'Baby':        { width_cm: 75,  height_cm: 100 },
  'Throw':       { width_cm: 130, height_cm: 170 },
  'Twin':        { width_cm: 170, height_cm: 230 },
  'Queen':       { width_cm: 230, height_cm: 260 },
}

// ─── Size chart lookup ──────────────────────────────────────────────────────

export const SIZE_CHARTS = {
  hat: HAT_SIZES,
  sweater: SWEATER_SIZES,
  socks: SOCK_SIZES,
  mittens: MITTEN_SIZES,
  blanket: BLANKET_PRESETS,
  scarf_cowl: {} as Record<string, Record<string, number>>, // no standard sizes
} as const
