export const theme = {
  colors: {
    // Backgrounds
    bgPrimary:     '#F5E6D3',
    bgSecondary:   '#EDD9C0',
    surface:       '#FFFFFF',
    surfaceWarm:   '#FDF6ED',
    card:          '#FFFFFF',

    // Accent
    accent:        '#C68A3A',
    accentDark:    '#6B4F3A',
    accentLight:   '#E8C490',
    accentMuted:   '#F2E4CC',

    // Text
    textPrimary:   '#3A2E2A',
    textSecondary: '#7A6A58',
    textTertiary:  '#B0A090',

    // Taste zones
    sour:          '#D97C6C',
    sourLight:     '#F5C0B8',
    balanced:      '#8CBA80',
    balancedLight: '#C8E6C0',
    bitter:        '#C68A3A',
    bitterLight:   '#F0DDB8',

    // UI
    divider:       '#E8D8C4',
    overlay:       'rgba(58, 46, 42, 0.55)',
    success:       '#8CBA80',
    error:         '#D97C6C',
  },

  spacing: {
    xs:          4,
    sm:          8,
    md:          12,
    base:        16,
    lg:          20,
    xl:          24,
    xxl:         32,
    xxxl:        48,
    // legacy aliases
    micro:       4,
    tight:       8,
    compact:     12,
    standard:    20,
    comfortable: 24,
    section:     32,
  },

  radius: {
    xs:   6,
    sm:   10,
    md:   14,
    lg:   18,
    xl:   22,
    xxl:  28,
    full: 9999,
  },

  shadow: {
    xs: {
      shadowColor:   '#3A2E2A',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius:  4,
      elevation: 1,
    },
    sm: {
      shadowColor:   '#3A2E2A',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius:  8,
      elevation: 2,
    },
    md: {
      shadowColor:   '#3A2E2A',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius:  14,
      elevation: 5,
    },
    lg: {
      shadowColor:   '#3A2E2A',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius:  24,
      elevation: 10,
    },
  },

  font: {
    sizes:   { xs: 10, sm: 12, base: 14, md: 16, lg: 20, xl: 24, xxl: 28 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' } as const,
  },
}

export type Theme = typeof theme
