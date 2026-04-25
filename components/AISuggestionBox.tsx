import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Suggestion } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'

interface Props {
  suggestion: Suggestion | null
  localText?: string
  loading?: boolean
}

export function AISuggestionBox({ suggestion, localText, loading }: Props) {
  if (!suggestion && !localText && !loading) return null

  if (loading) {
    return (
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.icon}>✦</Text>
          <Text style={s.headerLabel}>ANALYSING…</Text>
        </View>
        <Text style={s.diagnosis}>Getting your dial-in suggestion…</Text>
      </View>
    )
  }

  if (!suggestion) return null

  const accent = suggestion.closerThanLast ? theme.colors.balanced : theme.colors.accent

  return (
    <View style={[s.card, { borderColor: accent }]}>
      <View style={s.header}>
        <Text style={[s.icon, { color: accent }]}>✦</Text>
        <Text style={[s.headerLabel, { color: accent }]}>BREW DIAGNOSIS</Text>
      </View>

      <Text style={s.diagnosis}>{suggestion.diagnosis}</Text>

      {suggestion.changes.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { marginTop: 10 }]}>NEXT ADJUSTMENTS</Text>
          {suggestion.changes.map((c, i) => (
            <View key={i} style={s.changeRow}>
              <Text style={[s.arrow, { color: accent }]}>
                {c.direction === 'up' ? '↑' : c.direction === 'down' ? '↓' : '→'}
              </Text>
              <Text style={s.paramName}>{c.param.replace('_', ' ')}</Text>
              <Text style={s.changeVal}>
                {c.from} → <Text style={[s.toVal, { color: theme.colors.textPrimary }]}>{c.to}</Text>
              </Text>
            </View>
          ))}
        </>
      )}

      {suggestion.reasoning ? (
        <Text style={s.reasoning}>{suggestion.reasoning}</Text>
      ) : null}

      {suggestion.closerThanLast && (
        <View style={s.closerBadge}>
          <Text style={s.closerText}>Closer than last time 👍</Text>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    theme.radius.lg,
    padding:         16,
    borderWidth:     1.5,
    borderColor:     theme.colors.accent,
    ...theme.shadow.sm,
  },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  icon:        { fontSize: 12, color: theme.colors.accent },
  headerLabel: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', color: theme.colors.accent, letterSpacing: 0.15 },
  sectionLabel:{ fontFamily: fonts.mono, fontSize: 9,  fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 1, marginBottom: 6 },
  diagnosis:   { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  changeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  arrow:       { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', width: 14 },
  paramName:   { fontFamily: fonts.mono, fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary, width: 80 },
  changeVal:   { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.textSecondary },
  toVal:       { fontFamily: fonts.mono, fontWeight: '700' },
  reasoning:   { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 10 },
  closerBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: theme.colors.balancedLight, borderRadius: theme.radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  closerText:  { fontFamily: fonts.mono, fontSize: 12, fontWeight: '600', color: theme.colors.accentDark },
})
