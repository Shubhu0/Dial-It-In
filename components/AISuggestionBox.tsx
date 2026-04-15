import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Suggestion } from '@/lib/types'
import { theme } from '@/constants/theme'

interface Props {
  suggestion: Suggestion | null
  localText?: string
  loading?: boolean
}

export function AISuggestionBox({ suggestion, localText, loading }: Props) {
  if (!suggestion && !localText && !loading) return null

  if (loading || (!suggestion && localText)) {
    return (
      <View style={[styles.box, { borderLeftColor: theme.colors.accent }]}>
        <Text style={styles.label}>Suggestion</Text>
        <Text style={styles.diagnosis}>{loading ? 'Getting AI suggestion…' : localText}</Text>
      </View>
    )
  }

  if (!suggestion) return null

  const borderColor = suggestion.changes[0]?.direction.includes('finer')
    ? theme.colors.sour
    : suggestion.changes[0]?.direction.includes('coarser')
    ? theme.colors.accentDark
    : theme.colors.balanced

  return (
    <View style={[styles.box, { borderLeftColor: borderColor }]}>
      <Text style={styles.label}>Diagnosis</Text>
      <Text style={styles.diagnosis}>{suggestion.diagnosis}</Text>

      <Text style={[styles.label, { marginTop: 10 }]}>Changes</Text>
      {suggestion.changes.map((c, i) => (
        <View key={i} style={styles.changeRow}>
          <Text style={styles.param}>{c.param}</Text>
          <Text style={styles.from}>{c.from}</Text>
          <Text style={styles.arrow}> → </Text>
          <Text style={styles.to}>{c.to}</Text>
          <Text style={styles.dir}> · {c.direction}</Text>
        </View>
      ))}

      <Text style={styles.reasoning}>{suggestion.reasoning}</Text>

      {suggestion.closerThanLast && (
        <Text style={styles.closer}>Closer than last time 👍</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.md,
    padding:         theme.spacing.base,
    borderLeftWidth: 4,
  },
  label:     { fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 1, fontWeight: '600', textTransform: 'uppercase' },
  diagnosis: { fontSize: 14, color: theme.colors.textPrimary, marginTop: 4, lineHeight: 20 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  param:     { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, marginRight: 4 },
  from:      { fontSize: 13, color: theme.colors.textSecondary },
  arrow:     { fontSize: 13, color: theme.colors.textSecondary },
  to:        { fontSize: 13, fontWeight: '700', color: theme.colors.accent },
  dir:       { fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic' },
  reasoning: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 10, lineHeight: 19 },
  closer:    { fontSize: 13, color: theme.colors.balanced, fontWeight: '600', marginTop: 8 },
})
