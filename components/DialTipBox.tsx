import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { DialTip } from '@/lib/dialingAlgorithm'
import { theme } from '@/constants/theme'

const DIRECTION_ARROW: Record<string, string> = {
  up:   '↑',
  down: '↓',
  none: '✓',
}
const DIRECTION_COLOR: Record<string, string> = {
  up:   theme.colors.accentDark,
  down: theme.colors.sour,
  none: theme.colors.balanced,
}

export function DialTipBox({ tip, zone }: { tip: DialTip; zone: string }) {
  const isBalanced = zone === 'balanced'

  return (
    <View style={[styles.box, isBalanced && styles.boxBalanced]}>
      <Text style={[styles.label, isBalanced && styles.labelBalanced]}>{tip.label}</Text>
      <Text style={styles.detail}>{tip.detail}</Text>

      {tip.params.length > 0 && !isBalanced && (
        <View style={styles.params}>
          {tip.params.map((p, i) => (
            <View key={i} style={styles.paramRow}>
              <Text style={[styles.arrow, { color: DIRECTION_COLOR[p.direction] }]}>
                {DIRECTION_ARROW[p.direction]}
              </Text>
              <Text style={styles.paramName}>{p.name}</Text>
              <Text style={styles.paramChange}>{p.change}</Text>
            </View>
          ))}
        </View>
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
    borderLeftColor: theme.colors.sour,
    gap:             6,
  },
  boxBalanced: {
    borderLeftColor: theme.colors.balanced,
  },
  label: {
    fontSize:   14,
    fontWeight: '700',
    color:      theme.colors.textPrimary,
  },
  labelBalanced: {
    color: theme.colors.balanced,
  },
  detail: {
    fontSize:   13,
    color:      theme.colors.textSecondary,
    lineHeight: 18,
  },
  params: {
    marginTop: 8,
    gap:       4,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  arrow: {
    fontSize:   15,
    fontWeight: '700',
    width:      16,
  },
  paramName: {
    fontSize:   13,
    fontWeight: '600',
    color:      theme.colors.textPrimary,
    flex:       1,
  },
  paramChange: {
    fontSize: 13,
    color:    theme.colors.textSecondary,
  },
})
