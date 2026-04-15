export type Method      = 'espresso' | 'pour_over' | 'aeropress' | 'french_press'
export type RoastLevel  = 'light' | 'medium' | 'medium-dark' | 'dark'
export type TasteZone   = 'very_sour' | 'sour' | 'balanced' | 'bitter' | 'very_bitter'
export type TrendDir    = 'improving' | 'stable' | 'regressing'

// ── Domain objects ────────────────────────────────────────────────────────────

export interface Bean {
  id: string
  user_id: string
  name: string
  roaster?: string
  origin?: string
  roast_level?: RoastLevel
  roast_date?: string
  notes?: string
  grind_setting?: string
  created_at?: string
}

export interface BrewParams {
  dose_g:         number
  yield_g:        number
  time_s:         number
  grind_setting:  string
  taste_position: number
  water_temp_c?:  number
  water_g?:       number
  brew_time_s?:   number
}

export interface Brew {
  id: string
  user_id: string
  bean_id: string
  method: Method
  dose_g?: number
  water_temp_c?: number
  grind_setting?: string
  yield_g?: number
  time_s?: number
  water_g?: number
  brew_time_s?: number
  taste_position?: number
  taste_notes?: string[]
  rating?: number
  personal_notes?: string
  ai_suggestion?: Suggestion
  created_at?: string
  beans?: { name: string; origin?: string }
}

export interface DialInScore {
  bean_id:    string
  total_brews: number
  avg_rating:  number
  dial_in_pct: number
}

// ── Algorithm types ───────────────────────────────────────────────────────────

export interface SuggestionChange {
  param:     string
  from:      string
  to:        string
  direction: 'up' | 'down' | 'none'
}

export interface Suggestion {
  diagnosis:      string
  changes:        SuggestionChange[]
  reasoning:      string
  closerThanLast: boolean
}

export interface DialTip {
  label:  string    // short action headline
  detail: string    // explanation
  params: { name: string; change: string; direction: 'up' | 'down' | 'none' }[]
  urgency: 'high' | 'medium' | 'low'
}

export interface SmartDefaults {
  dose_g:       number
  yield_g?:     number
  time_s?:      number
  water_g?:     number
  brew_time_s?: number
  grind_setting: string
  water_temp_c:  number
  note: string
}

export interface OptimizationResult {
  grindAdjust:  number   // delta steps (+ = coarser)
  timeAdjust:   number   // delta seconds
  yieldAdjust:  number   // delta grams
  note: string
}

export interface UserProfile {
  tastePreference: number   // personal target (0-100), default 50
  totalBrews:      number
  averageTaste:    number
  trend:           TrendDir
  trajectory:      number[] // taste values over time
}
