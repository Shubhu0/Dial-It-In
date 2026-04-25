import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { Bean, Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { getZoneLabel } from '@/lib/algorithms'

const ROAST_COLORS: Record<string, string> = {
  light:         '#F5C060',
  medium:        '#B3622A',
  'medium-dark': '#7A3E18',
  dark:          '#3A1F0D',
}

// ── BeanChip ─────────────────────────────────────────────────────────────────

interface BeanChipProps {
  bean:       Bean
  isSelected: boolean
  onPress:    () => void
}

export function BeanChip({ bean, isSelected, onPress }: BeanChipProps) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  function handlePress() {
    scale.value = withSpring(0.94, { damping: 8 }, () => {
      scale.value = withSpring(1, { damping: 10 })
    })
    onPress()
  }

  const roastColor = ROAST_COLORS[bean.roast_level ?? 'medium'] ?? theme.colors.accent

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[s.beanChip, isSelected && s.beanChipSelected, animStyle]}>
        {/* Bag dot */}
        <View style={[s.beanBag, { backgroundColor: roastColor }]}>
          <View style={s.beanBagFrame} />
        </View>
        <View style={{ maxWidth: 120 }}>
          <Text style={[s.beanName, isSelected && s.beanNameSelected]} numberOfLines={1}>
            {bean.name}
          </Text>
          {bean.origin ? (
            <Text style={s.beanOrigin} numberOfLines={1}>
              {bean.origin.split(',')[0]}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  )
}

// ── SessionCard ───────────────────────────────────────────────────────────────

interface SessionCardProps {
  brew:    Brew
  onPress?: () => void
}

export function SessionCard({ brew, onPress }: SessionCardProps) {
  const pos   = brew.taste_position ?? 50
  const color = pos < 45 ? theme.colors.sour
    : pos > 55 ? theme.colors.bitter
    : theme.colors.balanced

  const date = brew.created_at
    ? new Date(brew.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const method = brew.method?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? ''

  return (
    <Pressable style={s.sessionCard} onPress={onPress}>
      {/* Colored edge stripe */}
      <View style={[s.sessionBar, { backgroundColor: color }]} />
      <View style={s.sessionBody}>
        <Text style={s.sessionDate}>{date}</Text>
        <Text style={s.sessionMethod} numberOfLines={1}>{method}</Text>
        {brew.beans?.name ? (
          <Text style={s.sessionBean} numberOfLines={1}>{brew.beans.name}</Text>
        ) : null}

        {/* Params row */}
        <View style={s.sessionParams}>
          {brew.dose_g  ? <Text style={s.sessionParam}>{brew.dose_g}g</Text>  : null}
          {brew.time_s  ? <Text style={s.sessionParam}>· {brew.time_s}s</Text> : null}
        </View>

        <View style={[s.sessionTaste, { backgroundColor: color + '22' }]}>
          <Text style={[s.sessionTasteText, { color }]}>{getZoneLabel(pos)}</Text>
        </View>
      </View>
    </Pressable>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // BeanChip
  beanChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 10, borderWidth: 1.5, borderColor: theme.colors.divider,
    ...theme.shadow.xs,
  },
  beanChipSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentMuted },
  beanBag: {
    width: 28, height: 36, borderRadius: 5, flexShrink: 0,
    overflow: 'hidden', position: 'relative',
  },
  beanBagFrame: {
    position: 'absolute', top: 3, left: 3, right: 3, bottom: 3,
    borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,240,210,0.35)',
  },
  beanName:         { fontFamily: fonts.serif, fontSize: 14, color: theme.colors.textPrimary },
  beanNameSelected: { color: theme.colors.accentDark },
  beanOrigin:       { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, marginTop: 1 },

  // SessionCard
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: 148, marginRight: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadow.xs,
  },
  sessionBar:       { height: 3 },
  sessionBody:      { padding: 12, gap: 3 },
  sessionDate:      { fontFamily: fonts.mono, fontSize: 9,  color: theme.colors.textTertiary, letterSpacing: 0.2 },
  sessionMethod:    { fontFamily: fonts.serif, fontSize: 14, color: theme.colors.textPrimary },
  sessionBean:      { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary },
  sessionParams:    { flexDirection: 'row', gap: 4, marginTop: 2 },
  sessionParam:     { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary },
  sessionTaste: {
    marginTop: 6, borderRadius: theme.radius.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  sessionTasteText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600' },
})
