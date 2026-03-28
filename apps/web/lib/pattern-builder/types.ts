/**
 * Shared types for the AI Pattern Builder.
 * Three-layer architecture: Config (decision tree) → Math (deterministic) → AI (instruction writer).
 */

import type { YarnWeight } from '@/lib/yarn-math'

// ─── Project types ──────────────────────────────────────────────────────────

export const PROJECT_TYPES = ['hat', 'sweater', 'socks', 'mittens', 'scarf_cowl', 'blanket'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

// ─── Input types (what the API receives) ────────────────────────────────────

export interface YarnSelection {
  name: string
  weight: YarnWeight
  fiber_content?: string | null
  strands: number
}

export interface PatternBuilderInput {
  project_type: ProjectType
  yarns: YarnSelection[]
  needle_size_mm?: number
  gauge_override?: { stitches_per_10cm: number; rows_per_10cm: number }
  options: ProjectOptions
  target_size?: string
  custom_measurements?: Record<string, number>
  use_my_measurements?: boolean
}

// ─── Hat options ────────────────────────────────────────────────────────────

export type HatStyle = 'beanie' | 'slouchy' | 'beret' | 'watch_cap'
export type BrimStyle = 'rib_1x1' | 'rib_2x2' | 'folded_rib' | 'rolled_stockinette' | 'seed' | 'garter' | 'picot' | 'no_brim'
export type CrownStyle = 'wedge_6' | 'wedge_8' | 'wedge_10' | 'spiral' | 'gathered'
export type BodyStitch = 'stockinette' | 'seed' | 'cables'

export interface HatOptions {
  type: 'hat'
  hat_style: HatStyle
  brim_style: BrimStyle
  crown_style: CrownStyle
  body_stitch: BodyStitch
  ear_flaps: boolean
  double_layered: boolean
}

// ─── Sweater options ────────────────────────────────────────────────────────

export type SweaterConstruction = 'top_down_raglan' | 'top_down_yoke' | 'drop_shoulder' | 'set_in_sleeve' | 'bottom_up_seamed'
export type Neckline = 'crew' | 'v_neck' | 'scoop' | 'square' | 'boat' | 'henley' | 'turtleneck' | 'mock_turtleneck' | 'cowl_neck' | 'hooded' | 'shawl_collar' | 'no_neckband'
export type SleeveStyle = 'long' | 'three_quarter' | 'short' | 'sleeveless'
export type SleeveShape = 'tapered' | 'straight' | 'bell'
export type BodyFit = 'fitted' | 'standard' | 'relaxed' | 'oversized'
export type BodyLength = 'cropped' | 'regular' | 'tunic'
export type BodyShaping = 'straight' | 'waist_shaped' | 'a_line'
export type HemStyle = 'rib_1x1' | 'rib_2x2' | 'garter' | 'folded_hem' | 'rolled' | 'no_border'
export type ClosureType = 'button_band' | 'zipper' | 'open_front'

export interface SweaterOptions {
  type: 'sweater'
  construction: SweaterConstruction
  neckline: Neckline
  sleeve_style: SleeveStyle
  sleeve_shape: SleeveShape
  body_fit: BodyFit
  body_length: BodyLength
  body_shaping: BodyShaping
  hem_style: HemStyle
  is_cardigan: boolean
  closure_type?: ClosureType // only when is_cardigan = true
}

// ─── Sock options ───────────────────────────────────────────────────────────

export type SockConstruction = 'cuff_down' | 'toe_up'
export type HeelType = 'heel_flap_gusset' | 'short_row' | 'afterthought' | 'fish_lips_kiss'
export type ToeType = 'wedge' | 'star' | 'rounded' | 'gathered'
export type ToeFinish = 'kitchener' | 'gathered'
export type CuffStyle = 'rib_1x1' | 'rib_2x2' | 'folded' | 'picot' | 'rolled'
export type LegLength = 'no_show' | 'ankle' | 'crew' | 'mid_calf' | 'knee_high'

export interface SockOptions {
  type: 'socks'
  construction: SockConstruction
  heel_type: HeelType
  toe_type: ToeType
  toe_finish: ToeFinish
  cuff_style: CuffStyle
  leg_length: LegLength
}

// ─── Mitten options ─────────────────────────────────────────────────────────

export type MittenStyle = 'full_mitten' | 'fingerless' | 'convertible'
export type ThumbConstruction = 'gusset' | 'peasant' | 'afterthought'
export type MittenTopShaping = 'rounded' | 'pointed' | 'gathered'
export type CuffRibbing = 'rib_1x1' | 'rib_2x2'

export interface MittenOptions {
  type: 'mittens'
  style: MittenStyle
  thumb_construction: ThumbConstruction
  top_shaping: MittenTopShaping
  cuff_ribbing: CuffRibbing
}

// ─── Scarf / Cowl options ───────────────────────────────────────────────────

export type StitchPattern = 'stockinette' | 'garter' | 'seed' | 'rib_1x1' | 'rib_2x2' | 'moss'
export type ScarfForm = 'scarf' | 'cowl'
export type ScarfConstruction = 'flat' | 'bias_diagonal'
export type CowlConstruction = 'joined_round' | 'mobius' | 'flat_seamed'
export type EdgeTreatment = 'garter_border' | 'seed_border' | 'i_cord' | 'slip_stitch' | 'no_border'
export type CowlWrap = 'single' | 'double'

export interface ScarfCowlOptions {
  type: 'scarf_cowl'
  form: ScarfForm
  stitch_pattern: StitchPattern
  // Scarf-specific
  scarf_construction?: ScarfConstruction
  edge_treatment?: EdgeTreatment
  fringe?: boolean
  width_cm?: number
  length_cm?: number
  // Cowl-specific
  cowl_construction?: CowlConstruction
  cowl_wrap?: CowlWrap
  height_cm?: number
  circumference_cm?: number
}

// ─── Blanket options ────────────────────────────────────────────────────────

export type BlanketConstruction = 'single_piece' | 'modular_squares' | 'mitered_squares' | 'log_cabin' | 'corner_to_corner' | 'strips'
export type BlanketBorder = 'garter' | 'seed' | 'i_cord' | 'no_border'

export interface BlanketOptions {
  type: 'blanket'
  construction: BlanketConstruction
  stitch_pattern: StitchPattern
  border: BlanketBorder
  preset_size?: string
  custom_width_cm?: number
  custom_height_cm?: number
}

export type ProjectOptions =
  | HatOptions
  | SweaterOptions
  | SockOptions
  | MittenOptions
  | ScarfCowlOptions
  | BlanketOptions

// ─── Math output types ──────────────────────────────────────────────────────

export interface Gauge {
  stitches_per_10cm: number
  rows_per_10cm: number
}

export interface SizeSpec {
  name: string
  measurements: Record<string, number>
}

export interface StepBlueprint {
  step_number: number
  description: string
  stitch_count: number | null
  row_type: 'setup' | 'work_rows' | 'repeat' | 'work_to_measurement' | 'finishing'
  rows_in_step: number | null
  is_repeat: boolean
  repeat_count: number | null
  rows_per_repeat: number | null
  target_measurement_cm: number | null
  math_notes: string | null
}

export interface SectionBlueprint {
  name: string
  sort_order: number
  steps: StepBlueprint[]
}

export interface PatternBlueprint {
  title_suggestion: string
  difficulty: string
  garment_type: string
  gauge: Gauge
  needle_size_mm: number
  ribbing_needle_mm: number
  yarn_weight: YarnWeight
  sizes: SizeSpec[]
  sections_per_size: Record<string, SectionBlueprint[]>
}

// ─── AI output types ────────────────────────────────────────────────────────

export interface AIPatternSection {
  name: string
  steps: {
    step_number: number
    instruction: string
    stitch_count: number | null
    notes: string | null
  }[]
}

export interface AIPatternOutput {
  title: string
  description: string
  sections: AIPatternSection[]
}

// ─── Config types (decision tree) ───────────────────────────────────────────

export interface QuestionOption {
  value: string
  label: string
  description?: string
  default?: boolean
}

export interface Question {
  key: string
  label: string
  type: 'single_select' | 'boolean' | 'number_input'
  options?: QuestionOption[]
  depends_on?: { key: string; values: string[] }
  required: boolean
}

export interface ProjectTypeConfig {
  type: ProjectType
  label: string
  description: string
  questions: Question[]
  size_chart_key: string
  recommended_yarn_weights: YarnWeight[]
}
