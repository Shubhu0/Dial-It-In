import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming,
} from 'react-native-reanimated'
import { DialTip, Suggestion, SuggestionChange } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'

// ── Live dial tip ─────────────────────────────────────────────────────────────

interface LiveTipProps { tip: DialTip; zone: string }

export function LiveTipBox({ tip, zone }: LiveTipProps) {
  const opacity    = useSharedValue(0)
  const translateY = useSharedValue(6)

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

  const accentColor = zone === 'balanced' ? theme.colors.balanced : urgencyColor

  return (
    <Animated.View style={[s.nudgeCard, { borderColor: accentColor }, animStyle]}>
      <View style={s.nudgeHeader}>
        {/* Sparkle icon */}
        <Text style={[s.nudgeIcon, { color: accentColor }]}>✦</Text>
        <Text style={[s.nudgeLabel, { color: accentColor }]}>NUDGE</Text>
      </View>
      <Text style={s.nudgeBody}>
        {tip.detail}{' '}
        {tip.params.length > 0 && (
          tip.params.map((p, i) => (
            <Text key={i} style={[s.nudgeBold, { color: accentColor }]}>
              {p.direction === 'up' ? '↑' : p.direction === 'down' ? '↓' : '✓'}
              {' '}{p.name} {p.change}
              {i < tip.params.length - 1 ? ', ' : ''}
            </Text>
          ))
        )}
      </Text>
    </Animated.View>
  )
}

// ── AI saved suggestion ───────────────────────────────────────────────────────

interface SavedSuggestionProps {
  suggestion: Suggestion | null
  loading:    boolean
  onApply?:   (changes: SuggestionChange[]) => void
}

const PARAM_LABELS: Record<string, string> = {
  grind_setting: 'Grind',
  yield_g:       'Yield',
  time_s:        'Shot time',
  brew_time_s:   'Brew time',
  dose_g:        'Dose',
  water_temp_c:  'Temp',
}

export function SavedSuggestionBox({ suggestion, loading, onApply }: SavedSuggestionProps) {
  const opacity = useSharedValue(0)
  const scale   = useSharedValue(0.96)

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
      <Animated.View style={[s.nudgeCard, animStyle]}>
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={s.loadingText}>Analysing your brew…</Text>
        </View>
      </Animated.View>
    )
  }

  if (!suggestion) return null

  const accent = suggestion.closerThanLast ? theme.colors.balanced : theme.colors.accent

  return (
    <Animated.View style={[s.nudgeCard, { borderColor: accent }, animStyle]}>
      <View style={s.nudgeHeader}>
        <Text style={[s.nudgeIcon, { color: accent }]}>✦</Text>
        <Text style={[s.nudgeLabel, { color: accent }]}>BREW DIAGNOSIS</Text>
      </View>

      <Text style={s.nudgeBody}>{suggestion.diagnosis}</Text>

      {suggestion.changes.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { marginTop: 10 }]}>NEXT ADJUSTMENTS</Text>
          {suggestion.changes.map((c, i) => (
            <View key={i} style={s.changeRow}>
              <Text style={[s.changeArrow, { color: accent }]}>
                {c.direction === 'up' ? '↑' : c.direction === 'down' ? '↓' : '→'}
              </Text>
              <Text style={s.changeParam}>{PARAM_LABELS[c.param] ?? c.param}</Text>
              <Text style={s.changeValues}>
                {c.from} → <Text style={[s.changeToValue, { color: theme.colors.textPrimary }]}>{c.to}</Text>
              </Text>
            </View>
          ))}
          {onApply && (
            <Pressable style={[s.applyBtn, { backgroundColor: accent }]} onPress={() => onApply(suggestion.changes)}>
              <Text style={s.applyBtnText}>Apply these changes →</Text>
            </Pressable>
          )}
        </>
      )}

      {suggestion.reasoning ? (
        <Text style={s.reasoningText}>{suggestion.reasoning}</Text>
      ) : null}

      {suggestion.closerThanLast && (
        <View style={s.closerBadge}>
          <Text style={s.closerText}>Closer than last time 👍</Text>
        </View>
      )}
    </Animated.View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  nudgeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    theme.radius.lg,
    padding:         16,
    borderWidth:     1.5,
    borderColor:     theme.colors.accent,
    ...theme.shadow.sm,
    marginBottom:    10,
  },
  nudgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  nudgeIcon:   { fontSize: 12, color: theme.colors.accent },
  nudgeLabel:  { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', letterSpacing: 0.15 },
  nudgeBody:   { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  nudgeBold:   { fontWeight: '700' },

  sectionLabel: {
    fontFamily: fonts.mono, fontSize: 9, fontWeight: '700',
    color: theme.colors.textTertiary, letterSpacing: 1, marginBottom: 6,
  },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: fonts.mono, fontSize: 13, color: theme.colors.textSecondary },

  changeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  changeArrow:  { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', width: 14 },
  changeParam:  { fontFamily: fonts.mono, fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary, width: 70 },
  changeValues: { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.textSecondary },
  changeToValue:{ fontFamily: fonts.mono, fontWeight: '700' },
  reasoningText:{ fontFamily: fonts.mono, fontSize: 11, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 10 },

  applyBtn: {
    marginTop: 12, height: 40, borderRadius: theme.radius.lg,
    alignItems: 'center', justifyContent: 'center', ...theme.shadow.xs,
  },
  applyBtnText: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: '#FFF' },

  closerBadge: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: theme.colors.balancedLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  closerText: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '600', color: theme.colors.accentDark },
})
