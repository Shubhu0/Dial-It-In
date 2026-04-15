import { create } from 'zustand'
import { supabase } from './supabase'
import { Bean, Brew, BrewParams, Method, Suggestion } from './types'

interface BrewState {
  selectedBean: Bean | null
  selectedMethod: Method
  currentParams: BrewParams
  lastSuggestion: Suggestion | null
  recentBrews: Brew[]
  beans: Bean[]

  setBean: (bean: Bean) => void
  setMethod: (method: Method) => void
  updateParam: (key: keyof BrewParams, value: number | string) => void
  setTastePosition: (pos: number) => void
  saveBrew: () => Promise<void>
  fetchRecentBrews: () => Promise<void>
  fetchBeans: () => Promise<void>
}

const DEFAULT_PARAMS: BrewParams = {
  dose_g:         18,
  yield_g:        36,
  time_s:         28,
  grind_setting:  '14',
  taste_position: 50,
}

export const useStore = create<BrewState>((set, get) => ({
  selectedBean:   null,
  selectedMethod: 'espresso',
  currentParams:  DEFAULT_PARAMS,
  lastSuggestion: null,
  recentBrews:    [],
  beans:          [],

  setBean:   (bean)   => set({ selectedBean: bean }),
  setMethod: (method) => set({ selectedMethod: method }),

  updateParam: (key, value) =>
    set((s) => ({ currentParams: { ...s.currentParams, [key]: value } })),

  setTastePosition: (pos) =>
    set((s) => ({ currentParams: { ...s.currentParams, taste_position: pos } })),

  saveBrew: async () => {
    const { selectedBean, selectedMethod, currentParams } = get()
    if (!selectedBean) return

    const { data: { user } } = await supabase.auth.getUser()

    // 1. Fetch last 5 brews for context
    const { data: history } = await supabase
      .from('brews')
      .select('*')
      .eq('bean_id', selectedBean.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // 2. Call Edge Function (best-effort, 8 s timeout — save even if AI unavailable)
    let suggestion: Suggestion | null = null
    try {
      const invokePromise = supabase.functions.invoke('get-suggestion', {
        body: {
          method:  selectedMethod,
          params:  currentParams,
          history: history ?? [],
          bean:    selectedBean,
        },
      }).then(({ data }) => data ?? null)

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      )

      suggestion = await Promise.race([invokePromise, timeoutPromise])
    } catch {
      // Edge function not deployed, timed out, or unreachable — save without suggestion
    }

    // 3. Save to DB
    const { error } = await supabase.from('brews').insert({
      user_id:       user?.id,
      bean_id:       selectedBean.id,
      method:        selectedMethod,
      ...currentParams,
      ai_suggestion: suggestion,
    })

    if (error) throw new Error(error.message)

    set({ lastSuggestion: suggestion })
    await get().fetchRecentBrews()
  },

  fetchRecentBrews: async () => {
    const { data } = await supabase
      .from('brews')
      .select('*, beans(name, origin)')
      .order('created_at', { ascending: false })
      .limit(20)
    set({ recentBrews: data ?? [] })
  },

  fetchBeans: async () => {
    const { data } = await supabase
      .from('beans')
      .select('*')
      .order('created_at', { ascending: false })
    set({ beans: (data as Bean[]) ?? [] })
  },
}))
