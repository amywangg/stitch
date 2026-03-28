export interface StashItem {
  id: string
  yarn_name: string
  company: string | null
  weight: string | null
  colorway: string | null
  skeins: number
  yardage_per_skein: number | null
  total_yardage: number | null
}

export interface PatternResult {
  ravelry_id: number
  name: string
  permalink: string
  craft: string
  weight: string | null
  yardage_min: number | null
  yardage_max: number | null
  gauge: string | null
  difficulty: number | null
  rating: number | null
  photo_url: string | null
  designer: string | null
  free: boolean
}

export interface SearchState {
  craft: 'knitting' | 'crochet' | null
  stashItem: StashItem | null
  weight: string | null
  yardageMax: number | null
  category: string | null
  designer: string | null
  availability: 'free' | null
  difficulty: string | null
}

export type Stage = 'craft' | 'yarn' | 'category' | 'results'
