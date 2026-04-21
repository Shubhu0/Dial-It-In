import { create } from 'zustand'
import { supabase } from './supabase'
import { Bean, Brew, BrewParams, Method, Suggestion, UserProfile } from './types'
import {
  buildUserProfile,
  getBestBrew,
  getSmartDefaults,
  optimizeNextDial,
} from './algorithms'

interface BrewState {
  // Selection
  selectedBean:   Bean | null
  selectedMethod: Method

  // Current session
  currentParams:  BrewParams
  lastSuggestion: Suggestion | null

  // Data
  recentBrews: Brew[]
  beans:       Bean[]

  // Adaptive learning
  userProfile: UserProfile

  // Guest mode (local-only, no Supabase)
  isGuest: boolean

  // Actions
  setBean:          (bean: Bean) => void
  setMethod:        (method: Method) => void
  updateParam:      (key: keyof BrewParams, value: number | string) => void
  setTastePosition: (pos: number) => void
  applyBestBrew:    (beanId: string) => void
  saveBrew:         () => Promise<void>
  fetchRecentBrews: () => Promise<void>
  fetchBeans:       () => Promise<void>
  setGuestMode:     (v: boolean) => void
  addBeanLocally:   (bean: Bean) => void
}

const DEFAULT_PARAMS: BrewParams = {
  dose_g:         18,
  yield_g:        36,
  time_s:         28,
  grind_setting:  '14',
  taste_position: 50,
  water_temp_c:   93,
}

const DEFAULT_PROFILE: UserProfile = {
  tastePreference: 50,
  totalBrews:      0,
  averageTaste:    50,
  trend:           'stable',
  trajectory:      [],
}

export const useStore = create<BrewState>((set, get) => ({
  selectedBean:   null,
  selectedMethod: 'espresso',
  currentParams:  DEFAULT_PARAMS,
  lastSuggestion: null,
  recentBrews:    [],
  beans:          [],
  userProfile:    DEFAULT_PROFILE,
  isGuest:        false,

  setBean: (bean) => {
    set({ selectedBean: bean })
    // Apply smart defaults for this bean's roast level
    const method   = get().selectedMethod
    const defaults = getSmartDefaults(bean.roast_level, method)
    set((s) => ({
      currentParams: {
        ...s.currentParams,
        grind_setting: bean.grind_setting ?? defaults.grind_setting,
        water_temp_c:  defaults.water_temp_c,
      },
    }))
  },

  setMethod: (method) => {
    set({ selectedMethod: method })
    // Re-derive defaults when method changes
    const bean     = get().selectedBean
    const defaults = getSmartDefaults(bean?.roast_level, method)
    set((s) => ({
      currentParams: {
        ...s.currentParams,
        dose_g:       defaults.dose_g,
        yield_g:      defaults.yield_g ?? s.currentParams.yield_g,
        time_s:       defaults.time_s  ?? s.currentParams.time_s,
        water_g:      defaults.water_g,
        brew_time_s:  defaults.brew_time_s,
        grind_setting: defaults.grind_setting,
        water_temp_c:  defaults.water_temp_c,
      },
    }))
  },

  updateParam: (key, value) =>
    set((s) => ({ currentParams: { ...s.currentParams, [key]: value } })),

  setTastePosition: (pos) =>
    set((s) => ({ currentParams: { ...s.currentParams, taste_position: pos } })),

  // Pre-load best parameters for a given bean
  applyBestBrew: (beanId) => {
    const best = getBestBrew(
      get().recentBrews.filter((b) => b.bean_id === beanId)
    )
    if (!best) return
    set((s) => ({
      selectedMethod: best.method,
      currentParams: {
        ...s.currentParams,
        dose_g:        best.dose_g        ?? s.currentParams.dose_g,
        yield_g:       best.yield_g       ?? s.currentParams.yield_g,
        time_s:        best.time_s        ?? s.currentParams.time_s,
        water_g:       best.water_g       ?? s.currentParams.water_g,
        brew_time_s:   best.brew_time_s   ?? s.currentParams.brew_time_s,
        grind_setting: best.grind_setting ?? s.currentParams.grind_setting,
        taste_position: 50,
      },
    }))
  },

  setGuestMode: (v) => set({ isGuest: v }),

  addBeanLocally: (bean) =>
    set((s) => ({ beans: [bean, ...s.beans] })),

  saveBrew: async () => {
    const { selectedBean, selectedMethod, currentParams, isGuest, recentBrews } = get()
    if (!selectedBean) return

    const opt = optimizeNextDial(currentParams.taste_position, selectedMethod)

    // Guest mode: save locally, no Supabase
    if (isGuest) {
      const prevTaste = recentBrews.find(b => b.bean_id === selectedBean.id)?.taste_position ?? 50
      const suggestion: Suggestion = {
        diagnosis:      opt.note,
        changes:        [],
        reasoning:      `Based on taste position ${currentParams.taste_position}/100`,
        closerThanLast: Math.abs(currentParams.taste_position - 50) < Math.abs(prevTaste - 50),
      }
      const localBrew: Brew = {
        id:            `local_${Date.now()}`,
        user_id:       'guest',
        bean_id:       selectedBean.id,
        method:        selectedMethod,
        ...currentParams,
        ai_suggestion: suggestion,
        created_at:    new Date().toISOString(),
        beans:         { name: selectedBean.name, origin: selectedBean.origin },
      }
      set((s) => {
        const newBrews = [localBrew, ...s.recentBrews]
        return { recentBrews: newBrews, lastSuggestion: suggestion, userProfile: buildUserProfile(newBrews) }
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Fetch last 5 brews for context
    const { data: history } = await supabase
      .from('brews')
      .select('*')
      .eq('bean_id', selectedBean.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Call Edge Function best-effort (8 s timeout)
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

      suggestion = await Promise.race([
        invokePromise,
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        ),
      ])
    } catch {
      const prevTaste = history?.[0]?.taste_position ?? 50
      suggestion = {
        diagnosis:      opt.note,
        changes:        [],
        reasoning:      `Based on taste position ${currentParams.taste_position}/100`,
        closerThanLast: Math.abs(currentParams.taste_position - 50) <
                        Math.abs(prevTaste - 50),
      }
    }

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

    const allBrews = get().recentBrews
    set({ userProfile: buildUserProfile(allBrews) })
  },

  fetchRecentBrews: async () => {
    if (get().isGuest) return  // local brews already in state
    const { data } = await supabase
      .from('brews')
      .select('*, beans(name, origin)')
      .order('created_at', { ascending: false })
      .limit(50)
    const brews = (data ?? []) as Brew[]
    set({ recentBrews: brews, userProfile: buildUserProfile(brews) })
  },

  fetchBeans: async () => {
    if (get().isGuest) return  // local beans already in state
    const { data } = await supabase
      .from('beans')
      .select('*')
      .order('created_at', { ascending: false })
    set({ beans: (data as Bean[]) ?? [] })
  },
}))
