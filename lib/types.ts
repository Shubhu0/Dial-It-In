export type Method = 'espresso' | 'pour_over' | 'aeropress' | 'french_press'

export interface Bean {
  id: string
  user_id: string
  name: string
  roaster?: string
  origin?: string
  roast_level?: 'light' | 'medium' | 'medium-dark' | 'dark'
  roast_date?: string
  notes?: string
  grind_setting?: string
  created_at?: string
}

export interface BrewParams {
  dose_g: number
  yield_g: number
  time_s: number
  grind_setting: string
  taste_position: number
  water_temp_c?: number
  water_g?: number
  brew_time_s?: number
}

export interface SuggestionChange {
  param: string
  from: string
  to: string
  direction: string
}

export interface Suggestion {
  diagnosis: string
  changes: SuggestionChange[]
  reasoning: string
  closerThanLast: boolean
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
  bean_id: string
  total_brews: number
  avg_rating: number
  dial_in_pct: number
}
