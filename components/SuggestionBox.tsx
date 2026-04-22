import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { DialTip, Suggestion, SuggestionChange } from '@/lib/types'
import { theme } from '@/constants/theme'

// ── Live dial tip (shown while dragging, no save needed) ─────────────────────

interface DialTipProps {
  tip:  DialTip
  zone: string
}

export function LiveTipBox({ tip, zone }: DialTipProps) {
  const opacity   = useSharedValue(0)
  const translateY = useSharedValue(8)

  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 200 })
    translateY.value = withSpring(0, { damping: 14, stiffness: 200 })
  }, [tip.label])

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const urgencyColor = {
    high:   theme.colors.sour,
    medium: theme.colors.accent,
    low:    theme.colors.balanced,
  }[tip.urgency]

  if (zone === 'balanced') {
    return (
      <Animated.View style={[styles.box, { borderLeftColor: theme.colors.balanced }, animStyle]}>
        <View style={styles.headerRow}>
          <View style={[styles.dot, { backgroundColor: theme.colors.balanced }]} />
          <Text style={[styles.headlineText, { color: theme.colors.balanced }]}>
            {tip.label}
          </Text>
        </View>
        <Text style={styles.detailText}>{tip.detail}</Text>
      </Animated.View>
    )
  }

  return (
    <Animated.View style={[styles.box, { borderLeftColor: urgencyColor }, animStyle]}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: urgencyColor }]} />
        <Text style={[styles.headlineText, { color: urgencyColor }]}>{tip.label}</Text>
      </View>
      <Text style={styles.detailText}>{tip.detail}</Text>

      {tip.params.length > 0 && (
        <View style={styles.paramsGrid}>
          {tip.params.map((p, i) => (
            <View key={i} style={styles.paramChip}>
              <Text style={styles.paramArrow}>
                {p.direction === 'up' ? '↑' : p.direction === 'down' ? '↓' : '✓'}
              </Text>
              <Text style={styles.paramName}>{p.name}</Text>
              <Text style={styles.paramChange}>{p.change}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  )
}

// ── AI/saved suggestion (shown after save) ────────────────────────────────────

interface SavedSuggestionProps {
  suggestion: Suggestion | null
  loading:    boolean
  onApply?:   (changes: SuggestionChange[]) => void
}

export function SavedSuggestionBox({ suggestion, loading, onApply }: SavedSuggestionProps) {
  const opacity   = useSharedValue(0)
  const scale     = useSharedValue(0.95)

  useEffect(() => {
    if (suggestion || loading) {
      opacity.value = withTiming(1, { duration: 300 })
      scale.value   = withSpring(1, { damping: 14, stiffness: 180 })
    }
  }, [suggestion, loading])

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }))

  if (!suggestion && !loading) return null

  if (loading) {
    return (
      <Animated.View style={[styles.box, styles.aiBox, animStyle]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Analysing your brew…</Text>
        </View>
      </Animated.View>
    )
  }

  if (!suggestion) return null

  const accent = suggestion.closerThanLast ? theme.colors.balanced : theme.colors.accent

  return (
    <Animated.View style={[styles.box, styles.aiBox, { borderLeftColor: accent }, animStyle]}>
      <Text style={styles.aiLabel}>BREW DIAGNOSIS</Text>
      <Text style={[styles.diagnosisText, { color: theme.colors.textPrimary }]}>
        {suggestion.diagnosis}
      </Text>

      {suggestion.changes.length > 0 && (
        <>
          <Text style={[styles.aiLabel, { marginTop: 10 }]}>NEXT ADJUSTMENTS</Text>
          {suggestion.changes.map((c, i) => (
            <View key={i} style={styles.changeRow}>
              <Text style={styles.changeArrow}>
                {c.direction === 'up' ? '↑' : c.direction === 'down' ? '↓' : '→'}
              </Text>
              <Text style={styles.changeParam}>{PARAM_LABELS[c.param] ?? c.param}</Text>
              <Text style={styles.changeValues}>{c.from} → <Text style={styles.changeToValue}>{c.to}</Text></Text>
            </View>
          ))}
          {onApply && (
            <Pressable
              style={styles.applyBtn}
              onPress={() => onApply(suggestion.changes)}
            >
              <Text style={styles.applyBtnText}>Apply these changes →</Text>
            </Pressable>
          )}
        </>
      )}

      {suggestion.reasoning ? (
        <Text style={styles.reasoningText}>{suggestion.reasoning}</Text>
      ) : null}

      {suggestion.closerThanLast && (
        <View style={styles.closerBadge}>
          <Text style={styles.closerText}>Closer than last time 👍</Text>
        </View>
      )}
    </Animated.View>
  )
}

const PARAM_LABELS: Record<string, string> = {
  grind_setting: 'Grind',
  yield_g:       'Yield',
  time_s:        'Shot time',
  brew_time_s:   'Brew time',
  dose_g:        'Dose',
  water_temp_c:  'Temp',
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.lg,
    padding:         14,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    ...theme.shadow.sm,
    marginBottom:    10,
  },
  aiBox: {
    borderLeftColor: theme.colors.accent,
  },

  // Live tip
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headlineText: { fontSize: 14, fontWeight: '700', flex: 1 },
  detailText:   { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  paramsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  paramChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: theme.colors.bgPrimary,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical:    5,
  },
  paramArrow:  { fontSize: 13, fontWeight: '700', color: theme.colors.accent },
  paramName:   { fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary },
  paramChange: { fontSize: 11, color: theme.colors.textSecondary },

  // Loading
  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary },

  // Saved suggestion
  aiLabel:     {
    fontSize:      10,
    fontWeight:    '700',
    color:         theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom:  4,
  },
  diagnosisText: { fontSize: 14, lineHeight: 20 },
  changeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  changeArrow: { fontSize: 14, fontWeight: '700', color: theme.colors.accent, width: 14 },
  changeParam: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, width: 70 },
  changeValues:{ fontSize: 13, color: theme.colors.textSecondary },
  reasoningText: {
    fontSize:   12,
    color:      theme.colors.textSecondary,
    lineHeight: 18,
    marginTop:  10,
    fontStyle:  'italic',
  },
  changeToValue: { fontWeight: '700', color: theme.colors.textPrimary },

  applyBtn: {
    marginTop:       12,
    height:          40,
    borderRadius:    theme.radius.lg,
    backgroundColor: theme.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    ...theme.shadow.xs,
  },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  closerBadge: {
    marginTop:       10,
    alignSelf:       'flex-start',
    backgroundColor: theme.colors.balancedLight,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical:    4,
  },
  closerText: { fontSize: 12, fontWeight: '600', color: theme.colors.accentDark },
})
