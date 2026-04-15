import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { theme } from '@/constants/theme'

interface Props {
  pct: number  // 0–100
}

export function ProgressBar({ pct }: Props) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` as any }]} />
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>Dialed in</Text>
        <Text style={styles.pct}>{Math.round(clamped)}%</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  track: {
    height:          5,
    backgroundColor: theme.colors.divider,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: {
    height:          5,
    backgroundColor: theme.colors.accent,
    borderRadius:    3,
  },
  labels:  { flexDirection: 'row', justifyContent: 'space-between' },
  label:   { fontSize: 11, color: theme.colors.textSecondary },
  pct:     { fontSize: 11, color: theme.colors.accent, fontWeight: '600' },
})
