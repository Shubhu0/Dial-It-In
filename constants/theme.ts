export const theme = {
  colors: {
    bgPrimary:    '#F5E6D3',
    bgSecondary:  '#FFF8F0',
    card:         '#FFFFFF',
    accent:       '#C68A3A',
    accentDark:   '#6B4F3A',
    textPrimary:  '#3A2E2A',
    textSecondary:'#7A6A58',
    divider:      '#E8D9C8',
    sour:         '#D97C6C',
    balanced:     '#8CBA80',
  },
  radius: {
    sm:   12,
    md:   16,
    lg:   24,
    full: 9999,
  },
  spacing: {
    micro:       4,
    tight:       8,
    compact:     12,
    base:        16,
    standard:    20,
    comfortable: 24,
    section:     32,
  },
  font: {
    sizes:   { xs: 10, sm: 12, base: 14, md: 16, lg: 20, xl: 26, xxl: 28 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' } as const,
  },
}
