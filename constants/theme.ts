// Direction A — "Fieldbook"
// Warm cream paper, Fraunces editorial serif, terracotta accent, ruled hairlines.
// Feels like a barista's bound notebook.

export const theme = {
  colors: {
    // Backgrounds — warm cream paper
    bgPrimary:   '#F3EBD9',   // --fbk-paper
    bgSecondary: '#EBE0C8',   // --fbk-paper-2 (card/secondary surface)
    surface:     '#EBE0C8',   // cards use paper-2
    card:        '#EBE0C8',

    // Accent — terracotta
    accent:      '#A84A1F',   // --fbk-accent
    accentDark:  '#7A3515',   // --fbk-accent-ink (links, emphasis)
    accentLight: '#C97A4A',
    accentMuted: 'rgba(168,74,31,0.08)',

    // Text — warm brown ink hierarchy
    textPrimary:   '#2A211A',  // --fbk-ink
    textSecondary: '#4A3B2E',  // --fbk-ink-2
    textTertiary:  '#7A6753',  // --fbk-ink-soft

    // UI chrome — ruled hairlines
    divider:    '#D9CCAE',    // --fbk-rule
    dividerSoft:'#E4D9BF',    // --fbk-rule-soft (between items)
    overlay:    'rgba(42,33,26,0.50)',

    // Taste zones
    sour:          '#C0533F',
    sourLight:     'rgba(192,83,63,0.10)',
    balanced:      '#4A6B4D',  // --fbk-mint
    balancedLight: 'rgba(74,107,77,0.10)',
    bitter:        '#7A5020',
    bitterLight:   'rgba(122,80,32,0.10)',
    error:         '#C0533F',
    positive:      '#4A6B4D',  // mint
    rule:          '#D9CCAE',
  },

  // Direction A: very square corners — ledger aesthetic
  radius: {
    xs:   2,
    sm:   3,
    md:   4,
    lg:   6,
    xl:   8,
    xxl:  12,
    full: 9999,
  },

  spacing: {
    xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32,
  },

  // Direction A: flat; only FAB has shadow
  shadow: {
    xs: {
      shadowColor: '#2A211A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#2A211A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#2A211A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#2A211A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  font: {
    sizes:   { xs: 9, sm: 11, base: 14, md: 16, lg: 20, xl: 26, xxl: 32 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' } as const,
  },
}

export type Theme = typeof theme
