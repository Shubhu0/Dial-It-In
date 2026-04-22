import {
  DialTip,
  TasteZone,
  Method,
  RoastLevel,
  SmartDefaults,
  OptimizationResult,
  UserProfile,
  BrewParams,
  Brew,
  SuggestionChange,
} from './types'

// ── Zone classification ───────────────────────────────────────────────────────

export function getZone(position: number): TasteZone {
  if (position <  20) return 'very_sour'
  if (position <  45) return 'sour'
  if (position <= 55) return 'balanced'
  if (position <= 80) return 'bitter'
  return 'very_bitter'
}

export function getZoneLabel(position: number): string {
  const zone = getZone(position)
  return {
    very_sour: 'Very Sour',
    sour:      'Sour',
    balanced:  'Balanced',
    bitter:    'Bitter',
    very_bitter: 'Very Bitter',
  }[zone]
}

// ── 1. Basic suggestion engine ────────────────────────────────────────────────

const TIPS: Record<string, Record<TasteZone, DialTip>> = {
  espresso: {
    very_sour: {
      label:   'Under-extracted — grind much finer',
      detail:  'Sour, sharp taste means water passed too quickly. Significantly increase contact time.',
      urgency: 'high',
      params:  [
        { name: 'Grind',  change: '2–3 steps finer', direction: 'down' },
        { name: 'Time',   change: '+5–8 s',           direction: 'up'  },
        { name: 'Temp',   change: '+2–3 °C',          direction: 'up'  },
      ],
    },
    sour: {
      label:   'Slightly under-extracted',
      detail:  'Light sourness — a small grind or time tweak will dial it in.',
      urgency: 'medium',
      params:  [
        { name: 'Grind', change: '1 step finer', direction: 'down' },
        { name: 'Time',  change: '+3–4 s',        direction: 'up'  },
      ],
    },
    balanced: {
      label:   'Balanced extraction',
      detail:  'Sweet, complex, neither sour nor bitter — this is your recipe.',
      urgency: 'low',
      params:  [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:   'Slightly over-extracted',
      detail:  'Bitterness from too much contact time. Coarsen grind or pull shorter.',
      urgency: 'medium',
      params:  [
        { name: 'Grind', change: '1 step coarser', direction: 'up' },
        { name: 'Yield', change: '+2–3 g',          direction: 'up' },
      ],
    },
    very_bitter: {
      label:   'Over-extracted — grind coarser',
      detail:  'Harsh bitterness. Reduce contact time significantly.',
      urgency: 'high',
      params:  [
        { name: 'Grind', change: '2–3 steps coarser', direction: 'up'   },
        { name: 'Time',  change: '−5–8 s',             direction: 'down' },
        { name: 'Temp',  change: '−2–3 °C',            direction: 'down' },
      ],
    },
  },

  pour_over: {
    very_sour: {
      label:   'Way under-extracted',
      detail:  'Water is flowing too fast. Finer grind and slower pour extend contact time.',
      urgency: 'high',
      params:  [
        { name: 'Grind',     change: '2–3 steps finer', direction: 'down' },
        { name: 'Pour rate', change: 'Much slower',      direction: 'down' },
        { name: 'Bloom',     change: '+30–45 s',         direction: 'up'  },
      ],
    },
    sour: {
      label:   'Slightly under-extracted',
      detail:  'A touch sour — try a finer grind or a longer bloom.',
      urgency: 'medium',
      params:  [
        { name: 'Grind', change: '1 step finer', direction: 'down' },
        { name: 'Bloom', change: '+20–30 s',      direction: 'up'  },
      ],
    },
    balanced: {
      label:   'Perfectly balanced',
      detail:  'Clean, sweet cup — document this recipe.',
      urgency: 'low',
      params:  [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:   'Slightly over-extracted',
      detail:  'Coarser grind or faster pour will reduce contact time.',
      urgency: 'medium',
      params:  [
        { name: 'Grind',     change: '1 step coarser',  direction: 'up' },
        { name: 'Pour rate', change: 'Slightly faster',  direction: 'up' },
      ],
    },
    very_bitter: {
      label:   'Over-extracted',
      detail:  'Strong bitterness — significantly reduce extraction.',
      urgency: 'high',
      params:  [
        { name: 'Grind',     change: '2–3 steps coarser', direction: 'up'   },
        { name: 'Pour rate', change: 'Much faster',        direction: 'up'   },
        { name: 'Temp',      change: '−3 °C',              direction: 'down' },
      ],
    },
  },

  aeropress: {
    very_sour: {
      label:   'Way under-extracted',
      detail:  'Steep much longer and go finer.',
      urgency: 'high',
      params:  [
        { name: 'Steep time', change: '+60–90 s',      direction: 'up'   },
        { name: 'Grind',      change: '2 steps finer', direction: 'down' },
        { name: 'Temp',       change: '+5 °C',          direction: 'up'  },
      ],
    },
    sour: {
      label:   'Under-extracted',
      detail:  'A bit sour — extend steep or go slightly finer.',
      urgency: 'medium',
      params:  [
        { name: 'Steep time', change: '+30 s',        direction: 'up'   },
        { name: 'Grind',      change: '1 step finer', direction: 'down' },
      ],
    },
    balanced: {
      label:   'Dialled in',
      detail:  'Sweet and balanced — save these params.',
      urgency: 'low',
      params:  [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:   'Over-extracted',
      detail:  'Reduce steep time or go coarser.',
      urgency: 'medium',
      params:  [
        { name: 'Steep time', change: '−30 s',          direction: 'down' },
        { name: 'Grind',      change: '1 step coarser', direction: 'up'  },
      ],
    },
    very_bitter: {
      label:   'Way over-extracted',
      detail:  'Much shorter steep — try inverted method or coarser grind.',
      urgency: 'high',
      params:  [
        { name: 'Steep time', change: '−60+ s',            direction: 'down' },
        { name: 'Grind',      change: '2–3 steps coarser', direction: 'up'   },
        { name: 'Temp',       change: '−5 °C',              direction: 'down' },
      ],
    },
  },

  french_press: {
    very_sour: {
      label:   'Way under-extracted',
      detail:  'Steep much longer for a full extraction.',
      urgency: 'high',
      params:  [
        { name: 'Steep time', change: '+90 s',         direction: 'up'   },
        { name: 'Grind',      change: '2 steps finer', direction: 'down' },
      ],
    },
    sour: {
      label:   'Under-extracted',
      detail:  'Add some steep time.',
      urgency: 'medium',
      params:  [
        { name: 'Steep time', change: '+30–45 s', direction: 'up' },
      ],
    },
    balanced: {
      label:   'Balanced',
      detail:  'Full, round cup — this is your recipe.',
      urgency: 'low',
      params:  [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:   'Over-extracted',
      detail:  'Reduce steep or press slower.',
      urgency: 'medium',
      params:  [
        { name: 'Steep time', change: '−30 s',       direction: 'down' },
        { name: 'Press',      change: 'Press slower', direction: 'down' },
      ],
    },
    very_bitter: {
      label:   'Way over-extracted',
      detail:  'Significantly reduce steep time.',
      urgency: 'high',
      params:  [
        { name: 'Steep time', change: '−60+ s',          direction: 'down' },
        { name: 'Grind',      change: '2 steps coarser', direction: 'up'  },
      ],
    },
  },
}

export function getDialTip(position: number, method: string): DialTip {
  const zone = getZone(position)
  return TIPS[method]?.[zone] ?? {
    label:   'Adjust to taste',
    detail:  'Move the dial toward balanced (centre) for a sweeter cup.',
    urgency: 'low',
    params:  [],
  }
}

// ── 2. Progress tracking ──────────────────────────────────────────────────────

export function getProgressFeedback(currentTaste: number, previousTaste: number): string {
  const currentDelta  = Math.abs(currentTaste  - 50)
  const previousDelta = Math.abs(previousTaste - 50)

  if (currentDelta < previousDelta - 3) return 'Closer than last time 👍'
  if (currentDelta > previousDelta + 3) return 'Slightly further off than last brew'
  return 'About the same as last brew — try a bolder adjustment'
}

// ── 3. Trajectory ─────────────────────────────────────────────────────────────

export function getTrend(trajectory: number[]): 'improving' | 'stable' | 'regressing' {
  if (trajectory.length < 3) return 'stable'
  const recent   = trajectory.slice(-3)
  const deltas   = recent.map((t) => Math.abs(t - 50))
  const improving = deltas[0] > deltas[deltas.length - 1]
  const margin    = Math.abs(deltas[0] - deltas[deltas.length - 1])
  if (margin < 3)    return 'stable'
  return improving ? 'improving' : 'regressing'
}

// ── 4. Smart starting point ───────────────────────────────────────────────────

const METHOD_DEFAULTS: Record<Method, Partial<SmartDefaults>> = {
  espresso: {
    dose_g: 18, yield_g: 36, time_s: 28,
    water_temp_c: 93,
  },
  pour_over: {
    dose_g: 15, water_g: 250, brew_time_s: 180,
    water_temp_c: 94,
  },
  aeropress: {
    dose_g: 16, water_g: 200, brew_time_s: 120,
    water_temp_c: 88,
  },
  french_press: {
    dose_g: 30, water_g: 500, brew_time_s: 240,
    water_temp_c: 95,
  },
}

export function getSmartDefaults(
  roast: RoastLevel | undefined,
  method: Method,
): SmartDefaults {
  const base = METHOD_DEFAULTS[method]

  // Grind/time adjustments by roast level
  const grindMap: Record<string, string> = {
    light:       method === 'espresso' ? '10' : '16',
    medium:      method === 'espresso' ? '14' : '20',
    'medium-dark': method === 'espresso' ? '16' : '22',
    dark:        method === 'espresso' ? '18' : '26',
  }

  const tempOffset: Record<string, number> = {
    light: +2, medium: 0, 'medium-dark': -1, dark: -2,
  }

  const roastKey    = roast ?? 'medium'
  const grind       = grindMap[roastKey] ?? '14'
  const temp        = (base.water_temp_c ?? 93) + (tempOffset[roastKey] ?? 0)

  let note = 'Standard starting point'
  if (roast === 'light')        note = 'Light roast: finer grind, higher temp, longer extraction'
  else if (roast === 'dark')    note = 'Dark roast: coarser grind, lower temp, shorter extraction'
  else if (roast === 'medium')  note = 'Medium roast: balanced starting point'

  return {
    dose_g:       base.dose_g ?? 18,
    yield_g:      base.yield_g,
    time_s:       base.time_s,
    water_g:      base.water_g,
    brew_time_s:  base.brew_time_s,
    grind_setting: grind,
    water_temp_c:  temp,
    note,
  }
}

// ── 5. User preference learning ───────────────────────────────────────────────

export function buildUserProfile(history: Brew[]): UserProfile {
  if (history.length === 0) {
    return { tastePreference: 50, totalBrews: 0, averageTaste: 50, trend: 'stable', trajectory: [] }
  }

  const trajectory = history
    .filter((b) => b.taste_position != null)
    .map((b) => b.taste_position as number)
    .reverse()  // chronological

  const last10 = trajectory.slice(-10)
  const avg    = last10.reduce((s, v) => s + v, 0) / last10.length

  // Personal target drifts 50% toward the user's average (they may prefer slightly bitter)
  const personalTarget = 50 + (avg - 50) * 0.5

  return {
    tastePreference: Math.round(personalTarget),
    totalBrews:      history.length,
    averageTaste:    Math.round(avg),
    trend:           getTrend(trajectory),
    trajectory,
  }
}

// ── 6. Next step coaching ─────────────────────────────────────────────────────

export function getCoachingMessage(taste: number, profile: UserProfile): string {
  const error  = taste - profile.tastePreference
  const absErr = Math.abs(error)

  if (absErr <= 5)   return "That looks smooth — lock it in!"
  if (absErr <= 15)  return error < 0
    ? 'Getting warmer — try dialling back the extraction slightly'
    : 'Nearly there — ease off the grind a touch'

  return error < -15
    ? 'You\'re getting closer — decrease grind size and extend brew time'
    : 'Over-extracted — increase grind size and reduce brew time'
}

// ── 7. Oscillation detection ──────────────────────────────────────────────────

export function isOscillating(trajectory: number[]): boolean {
  if (trajectory.length < 4) return false
  const last4 = trajectory.slice(-4)
  let switches = 0
  for (let i = 1; i < last4.length; i++) {
    const prev = last4[i - 1] > 50 ? 'bitter' : 'sour'
    const curr = last4[i]     > 50 ? 'bitter' : 'sour'
    if (prev !== curr) switches++
  }
  return switches >= 3
}

// ── 8. Bean memory ────────────────────────────────────────────────────────────

export function getBestBrew(brews: Brew[]): Brew | null {
  if (!brews.length) return null
  return brews.reduce((best, b) => {
    const bd = Math.abs((b.taste_position    ?? 50) - 50)
    const ad = Math.abs((best.taste_position ?? 50) - 50)
    return bd < ad ? b : best
  })
}

// ── 9. Gradient-descent optimisation ─────────────────────────────────────────

export function optimizeNextDial(taste: number, method: Method): OptimizationResult {
  const error = taste - 50   // positive = too bitter, negative = too sour

  const grindAdjust = error * (method === 'espresso' ? 0.12 : 0.08)
  const timeAdjust  = error * (method === 'espresso' ? -0.25 : 0.3)
  const yieldAdjust = method === 'espresso' ? error * 0.15 : 0

  const notes: string[] = []
  if (Math.abs(grindAdjust) > 0.5) notes.push(`grind ${grindAdjust > 0 ? 'coarser' : 'finer'}`)
  if (Math.abs(timeAdjust)  > 1)   notes.push(`${timeAdjust > 0 ? 'longer' : 'shorter'} brew`)
  if (Math.abs(yieldAdjust) > 0.5) notes.push(`yield ${yieldAdjust > 0 ? 'up' : 'down'}`)

  return {
    grindAdjust:  Math.round(grindAdjust * 10) / 10,
    timeAdjust:   Math.round(timeAdjust),
    yieldAdjust:  Math.round(yieldAdjust * 10) / 10,
    note: notes.length ? `Try: ${notes.join(', ')}` : 'Minimal adjustment needed',
  }
}

// ── 10. Applicable changes (numeric, for Apply button) ───────────────────────
// Converts gradient-descent deltas into concrete before/after values.

export function buildApplicableChanges(
  params:   BrewParams,
  tastePos: number,
  method:   Method,
): SuggestionChange[] {
  const opt     = optimizeNextDial(tastePos, method)
  const changes: SuggestionChange[] = []

  const currentGrind = parseFloat(params.grind_setting) || 14
  if (Math.abs(opt.grindAdjust) >= 0.5) {
    const next = Math.max(1, Math.min(40, Math.round(currentGrind + opt.grindAdjust)))
    changes.push({
      param:     'grind_setting',
      from:      String(Math.round(currentGrind)),
      to:        String(next),
      direction: opt.grindAdjust > 0 ? 'up' : 'down',
    })
  }

  if (method === 'espresso') {
    if (Math.abs(opt.yieldAdjust) >= 0.5) {
      const curr = params.yield_g || 36
      const next = Math.round(Math.max(20, Math.min(80, curr + opt.yieldAdjust)))
      changes.push({
        param:     'yield_g',
        from:      `${Math.round(curr)}g`,
        to:        `${next}g`,
        direction: opt.yieldAdjust > 0 ? 'up' : 'down',
      })
    }
    if (Math.abs(opt.timeAdjust) >= 1) {
      const curr = params.time_s || 28
      const next = Math.round(Math.max(18, Math.min(50, curr + opt.timeAdjust)))
      changes.push({
        param:     'time_s',
        from:      `${curr}s`,
        to:        `${next}s`,
        direction: opt.timeAdjust > 0 ? 'up' : 'down',
      })
    }
  } else {
    if (Math.abs(opt.timeAdjust) >= 3) {
      const curr = params.brew_time_s || 180
      const next = Math.round(Math.max(30, Math.min(600, curr + opt.timeAdjust * 4)))
      changes.push({
        param:     'brew_time_s',
        from:      `${curr}s`,
        to:        `${next}s`,
        direction: opt.timeAdjust > 0 ? 'up' : 'down',
      })
    }
  }

  return changes
}

// ── 11. Smart parameter warnings ──────────────────────────────────────────────
// Returns a list of human-readable warnings for implausible param combinations.

export function getBrewWarnings(params: BrewParams, method: Method): string[] {
  const warnings: string[] = []

  if (method === 'espresso') {
    const dose  = params.dose_g  || 18
    const yield_ = params.yield_g || 36
    const ratio = yield_ / dose
    const time  = params.time_s  || 28
    if (ratio < 1.5) warnings.push('Yield is very low — likely to taste harsh and over-extracted')
    if (ratio > 3.0) warnings.push('Ratio over 1:3 — may taste watery and under-extracted')
    if (time < 20)   warnings.push('Shot under 20s — likely to taste sour and thin')
    if (time > 42)   warnings.push('Shot over 42s — risk of bitterness and over-extraction')
  }

  if (method === 'pour_over' || method === 'aeropress') {
    const dose  = params.dose_g  || 15
    const water = params.water_g || 250
    const ratio = water / dose
    if (ratio < 12) warnings.push('Ratio under 1:12 — very concentrated, may taste bitter')
    if (ratio > 20) warnings.push('Ratio over 1:20 — too weak, likely to taste sour and watery')
  }

  if (method === 'french_press') {
    const dose  = params.dose_g  || 30
    const water = params.water_g || 500
    const ratio = water / dose
    if (ratio < 12) warnings.push('Ratio under 1:12 — very strong')
    if (ratio > 18) warnings.push('Ratio over 1:18 — may taste weak and watery')
  }

  const temp = params.water_temp_c
  if (temp !== undefined) {
    if (temp < 85) warnings.push('Water temp below 85°C — too low for proper extraction')
    if (temp > 97) warnings.push('Water temp above 97°C — may scorch the grounds')
  }

  return warnings
}

// ── 12. Dial DNA — behavioural pattern analysis ───────────────────────────────
// Returns insight strings describing the user's brewing patterns.

export function getDialDNA(brews: Brew[]): string[] {
  if (brews.length < 3) return []

  const insights:  string[] = []
  const recent     = brews.slice(0, 10)
  const positions  = recent.map((b) => b.taste_position ?? 50)

  // Over-correction: large jumps between sessions
  const jumps   = positions.slice(0, -1).map((p, i) => Math.abs(p - positions[i + 1]))
  const avgJump = jumps.reduce((a, b) => a + b, 0) / jumps.length
  if (avgJump > 18) insights.push('You tend to over-correct — try smaller adjustments each session')

  // Taste preference drift
  const avg = positions.reduce((a, b) => a + b, 0) / positions.length
  if (avg < 42) insights.push('You consistently land on the sour side — that might be your style')
  else if (avg > 58) insights.push('You consistently lean bitter — try a slightly finer grind as your baseline')

  // Side-to-side oscillation
  let oscillations = 0
  for (let i = 1; i < positions.length - 1; i++) {
    const prev = positions[i - 1] > 50
    const curr = positions[i]     > 50
    const next = positions[i + 1] > 50
    if (prev !== curr && curr !== next) oscillations++
  }
  if (oscillations >= 2) insights.push('Bouncing between sour and bitter — change only one variable at a time')

  // Overall trajectory: compare first half vs second half of recent brews
  const half      = Math.floor(positions.length / 2)
  const olderErr  = positions.slice(half).reduce((a, b) => a + Math.abs(b - 50), 0) / (positions.length - half)
  const recentErr = positions.slice(0, half).reduce((a, b) => a + Math.abs(b - 50), 0) / half
  if (recentErr < olderErr - 5) insights.push("You're improving — recent brews are closer to balanced than earlier ones")

  return insights
}

// ── Legacy string helper ──────────────────────────────────────────────────────

export function getLocalSuggestion(position: number, method: string): string {
  return getDialTip(position, method).label
}
