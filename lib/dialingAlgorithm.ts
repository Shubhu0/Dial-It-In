export type TasteZone = 'very_sour' | 'sour' | 'balanced' | 'bitter' | 'very_bitter'

export interface DialTip {
  label: string       // short action headline
  detail: string      // why
  params: { name: string; change: string; direction: 'up' | 'down' | 'none' }[]
}

export function getZone(position: number): TasteZone {
  if (position <  30) return 'very_sour'
  if (position <  45) return 'sour'
  if (position <= 55) return 'balanced'
  if (position <= 70) return 'bitter'
  return 'very_bitter'
}

const TIPS: Record<string, Record<TasteZone, DialTip>> = {
  espresso: {
    very_sour: {
      label:  'Under-extracted — grind much finer',
      detail: 'Sour/sharp taste means water passed too fast. Significantly increase contact time.',
      params: [
        { name: 'Grind',    change: '2–3 steps finer',  direction: 'down' },
        { name: 'Time',     change: '+5–8 s',            direction: 'up'   },
        { name: 'Temp',     change: '+2–3 °C',           direction: 'up'   },
      ],
    },
    sour: {
      label:  'Slightly under-extracted',
      detail: 'Light sourness — small grind or time adjustment should dial it in.',
      params: [
        { name: 'Grind',  change: '1 step finer', direction: 'down' },
        { name: 'Time',   change: '+3–4 s',        direction: 'up'   },
      ],
    },
    balanced: {
      label:  'Balanced extraction',
      detail: 'Sweet, complex, neither sour nor bitter — this is your recipe.',
      params: [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:  'Slightly over-extracted',
      detail: 'Bitterness from too much contact time. Coarsen grind or pull shorter.',
      params: [
        { name: 'Grind',  change: '1 step coarser', direction: 'up'  },
        { name: 'Yield',  change: '+2–3 g',          direction: 'up'  },
      ],
    },
    very_bitter: {
      label:  'Over-extracted — grind coarser',
      detail: 'Harsh bitterness. Reduce contact time significantly.',
      params: [
        { name: 'Grind',  change: '2–3 steps coarser', direction: 'up'   },
        { name: 'Time',   change: '−5–8 s',             direction: 'down' },
        { name: 'Temp',   change: '−2–3 °C',            direction: 'down' },
      ],
    },
  },
  pour_over: {
    very_sour: {
      label:  'Way under-extracted',
      detail: 'Water is flowing too fast. Finer grind and slower pour will extend contact time.',
      params: [
        { name: 'Grind',     change: '2–3 steps finer',  direction: 'down' },
        { name: 'Pour rate', change: 'Slower',            direction: 'down' },
        { name: 'Bloom',     change: '+30–45 s',          direction: 'up'   },
      ],
    },
    sour: {
      label:  'Slightly under-extracted',
      detail: 'A touch sour — try a finer grind or longer bloom.',
      params: [
        { name: 'Grind', change: '1 step finer', direction: 'down' },
        { name: 'Bloom', change: '+20–30 s',      direction: 'up'   },
      ],
    },
    balanced: {
      label:  'Perfectly balanced',
      detail: 'Clean, sweet cup — document this recipe.',
      params: [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:  'Slightly over-extracted',
      detail: 'Coarser grind or faster pour will reduce contact time.',
      params: [
        { name: 'Grind',     change: '1 step coarser', direction: 'up'  },
        { name: 'Pour rate', change: 'Slightly faster', direction: 'up'  },
      ],
    },
    very_bitter: {
      label:  'Over-extracted',
      detail: 'Strong bitterness — significantly reduce extraction.',
      params: [
        { name: 'Grind',     change: '2–3 steps coarser', direction: 'up'   },
        { name: 'Pour rate', change: 'Much faster',        direction: 'up'   },
        { name: 'Temp',      change: '−3 °C',              direction: 'down' },
      ],
    },
  },
  aeropress: {
    very_sour: {
      label:  'Way under-extracted',
      detail: 'Steep much longer and go finer.',
      params: [
        { name: 'Steep time', change: '+60–90 s',      direction: 'up'   },
        { name: 'Grind',      change: '2 steps finer', direction: 'down' },
        { name: 'Temp',       change: '+5 °C',          direction: 'up'   },
      ],
    },
    sour: {
      label:  'Under-extracted',
      detail: 'A bit sour — extend steep or go slightly finer.',
      params: [
        { name: 'Steep time', change: '+30 s',          direction: 'up'   },
        { name: 'Grind',      change: '1 step finer',   direction: 'down' },
      ],
    },
    balanced: {
      label:  'Dialled in',
      detail: 'Sweet and balanced — save these params.',
      params: [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:  'Over-extracted',
      detail: 'Reduce steep time or go coarser.',
      params: [
        { name: 'Steep time', change: '−30 s',            direction: 'down' },
        { name: 'Grind',      change: '1 step coarser',   direction: 'up'   },
      ],
    },
    very_bitter: {
      label:  'Way over-extracted',
      detail: 'Much shorter steep — try inverted method or coarser grind.',
      params: [
        { name: 'Steep time', change: '−60+ s',            direction: 'down' },
        { name: 'Grind',      change: '2–3 steps coarser', direction: 'up'   },
        { name: 'Temp',       change: '−5 °C',              direction: 'down' },
      ],
    },
  },
  french_press: {
    very_sour: {
      label:  'Way under-extracted',
      detail: 'Steep much longer for a full extraction.',
      params: [
        { name: 'Steep time', change: '+90 s',           direction: 'up'   },
        { name: 'Grind',      change: '2 steps finer',   direction: 'down' },
      ],
    },
    sour: {
      label:  'Under-extracted',
      detail: 'Add some steep time.',
      params: [
        { name: 'Steep time', change: '+30–45 s', direction: 'up' },
      ],
    },
    balanced: {
      label:  'Balanced',
      detail: 'Full, round cup — this is your recipe.',
      params: [
        { name: 'All params', change: 'Lock in & save', direction: 'none' },
      ],
    },
    bitter: {
      label:  'Over-extracted',
      detail: 'Reduce steep or press slower.',
      params: [
        { name: 'Steep time', change: '−30 s',      direction: 'down' },
        { name: 'Press',      change: 'Press slower', direction: 'down' },
      ],
    },
    very_bitter: {
      label:  'Way over-extracted',
      detail: 'Significantly reduce steep time.',
      params: [
        { name: 'Steep time', change: '−60+ s',           direction: 'down' },
        { name: 'Grind',      change: '2 steps coarser',  direction: 'up'   },
      ],
    },
  },
}

export function getDialTip(position: number, method: string): DialTip {
  const zone = getZone(position)
  return TIPS[method]?.[zone] ?? {
    label:  'Adjust to taste',
    detail: 'Move the dial toward balanced (centre) for a sweeter cup.',
    params: [],
  }
}

// Legacy string helper kept for backwards compat
export function getLocalSuggestion(
  position: number,
  method: string,
  history: { taste_position?: number }[]
): string {
  if (history.length >= 3) {
    const zones = history.map((h) => ((h.taste_position ?? 50) > 50 ? 'bitter' : 'sour'))
    const oscillating = zones.slice(0, 3).every((z, i) => i === 0 || z !== zones[i - 1])
    if (oscillating) return "You're oscillating — try a smaller adjustment next time."
  }
  const tip = getDialTip(position, method)
  return tip.label
}
