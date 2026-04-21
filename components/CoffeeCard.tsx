import React from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { Bean, Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { getZoneLabel } from '@/lib/algorithms'

// ── Bean chip (horizontal list item) ─────────────────────────────────────────

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
    scale.value = withSpring(0.93, { damping: 8 }, () => {
      scale.value = withSpring(1, { damping: 10 })
    })
    onPress()
  }

  const roastColor = ({
    light: '#F5C060',
    medium: '#C68A3A',
    'medium-dark': '#8B5E3C',
    dark: '#4A2F1A',
  }[bean.roast_level ?? 'medium']) ?? theme.colors.accent

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.beanChip, isSelected && styles.beanChipSelected, animStyle]}>
        {bean.image_url ? (
          <Image source={{ uri: bean.image_url }} style={styles.beanThumb} />
        ) : (
          <View style={[styles.roastDot, { backgroundColor: roastColor }]} />
        )}
        <View>
          <Text style={[styles.beanName, isSelected && styles.beanNameSelected]} numberOfLines={1}>
            {bean.name}
          </Text>
          {bean.origin ? (
            <Text style={styles.beanOrigin} numberOfLines={1}>{bean.origin}</Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  )
}

// ── Last coffee card (hero card on home screen) ───────────────────────────────

interface LastCoffeeCardProps {
  bean:       Bean | null
  lastBrew?:  Brew | null
  onPress?:   () => void
}

export function LastCoffeeCard({ bean, lastBrew, onPress }: LastCoffeeCardProps) {
  if (!bean) {
    return (
      <Pressable style={styles.emptyCard} onPress={onPress}>
        <Text style={styles.emptyIcon}>☕</Text>
        <Text style={styles.emptyTitle}>No bean selected</Text>
        <Text style={styles.emptySub}>Add your first bean to get started</Text>
      </Pressable>
    )
  }

  const tastePos   = lastBrew?.taste_position
  const zoneLabel  = tastePos != null ? getZoneLabel(tastePos) : null

  const zoneColor = tastePos != null
    ? tastePos < 45 ? theme.colors.sour
    : tastePos > 55 ? theme.colors.bitter
    : theme.colors.balanced
    : theme.colors.textSecondary

  return (
    <Pressable style={styles.heroCard} onPress={onPress}>
      {/* Bean photo banner — shown only when an image exists */}
      {bean.image_url ? (
        <Image source={{ uri: bean.image_url }} style={styles.heroBanner} />
      ) : (
        <View style={styles.colorBand} />
      )}

      <View style={styles.heroContent}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>CURRENT BEAN</Text>
          <Text style={styles.heroName} numberOfLines={2}>{bean.name}</Text>
          {bean.roaster ? <Text style={styles.heroSub}>{bean.roaster}</Text> : null}
          {bean.origin  ? <Text style={styles.heroOrigin}>{bean.origin}</Text> : null}
        </View>

        <View style={styles.heroRight}>
          {bean.roast_level ? (
            <View style={styles.roastBadge}>
              <Text style={styles.roastBadgeText}>{bean.roast_level}</Text>
            </View>
          ) : null}
          {zoneLabel ? (
            <View style={[styles.tasteBadge, { backgroundColor: zoneColor + '22' }]}>
              <Text style={[styles.tasteBadgeText, { color: zoneColor }]}>{zoneLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {lastBrew && (
        <View style={styles.lastBrewRow}>
          <Text style={styles.lastBrewLabel}>Last brew: </Text>
          <Text style={styles.lastBrewMethod}>{lastBrew.method?.replace('_', ' ')}</Text>
          {lastBrew.dose_g  ? <Text style={styles.lastBrewParam}> · {lastBrew.dose_g}g</Text>  : null}
          {lastBrew.grind_setting ? <Text style={styles.lastBrewParam}> · grind {lastBrew.grind_setting}</Text> : null}
        </View>
      )}
    </Pressable>
  )
}

// ── Session card (horizontal scroll item) ────────────────────────────────────

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

  return (
    <Pressable style={styles.sessionCard} onPress={onPress}>
      <View style={[styles.sessionBar, { backgroundColor: color }]} />
      <Text style={styles.sessionDate}>{date}</Text>
      <Text style={styles.sessionMethod} numberOfLines={1}>
        {brew.method?.replace('_', ' ')}
      </Text>
      {brew.beans?.name ? (
        <Text style={styles.sessionBean} numberOfLines={1}>{brew.beans.name}</Text>
      ) : null}
      <View style={[styles.sessionTaste, { backgroundColor: color + '22' }]}>
        <Text style={[styles.sessionTasteText, { color }]}>{getZoneLabel(pos)}</Text>
      </View>
    </Pressable>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // BeanChip
  beanChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    paddingHorizontal: 14,
    paddingVertical:   10,
    marginRight:      10,
    borderWidth:      1.5,
    borderColor:      theme.colors.divider,
    ...theme.shadow.xs,
  },
  beanChipSelected: {
    borderColor:     theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
  beanThumb:  { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.divider },
  roastDot:   { width: 10, height: 10, borderRadius: 5 },
  beanName:   { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, maxWidth: 120 },
  beanNameSelected: { color: theme.colors.accentDark },
  beanOrigin: { fontSize: 11, color: theme.colors.textSecondary },

  // EmptyCard
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         24,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     theme.colors.divider,
    borderStyle:     'dashed',
    ...theme.shadow.xs,
  },
  emptyIcon:  { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  emptySub:   { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },

  // HeroCard
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    overflow:        'hidden',
    ...theme.shadow.md,
  },
  heroBanner:  { width: '100%', height: 120, backgroundColor: theme.colors.accentMuted },
  colorBand:   { height: 4, backgroundColor: theme.colors.accentMuted },
  heroContent: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    padding:        16,
  },
  heroLeft:    { flex: 1, gap: 3 },
  heroRight:   { alignItems: 'flex-end', gap: 6 },
  heroLabel:   { fontSize: 9, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 1.2 },
  heroName:    { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, lineHeight: 24 },
  heroSub:     { fontSize: 12, color: theme.colors.textSecondary },
  heroOrigin:  { fontSize: 11, color: theme.colors.textTertiary },
  roastBadge:  {
    backgroundColor: theme.colors.accentMuted,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  roastBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.accentDark },
  tasteBadge:  {
    borderRadius:    theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  tasteBadgeText: { fontSize: 10, fontWeight: '600' },
  lastBrewRow: {
    flexDirection:  'row',
    alignItems:     'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingHorizontal: 16,
    paddingVertical:    8,
  },
  lastBrewLabel:  { fontSize: 11, color: theme.colors.textSecondary },
  lastBrewMethod: { fontSize: 11, fontWeight: '600', color: theme.colors.textPrimary },
  lastBrewParam:  { fontSize: 11, color: theme.colors.textSecondary },

  // SessionCard
  sessionCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.lg,
    width:           140,
    marginRight:     10,
    overflow:        'hidden',
    ...theme.shadow.xs,
  },
  sessionBar:       { height: 3 },
  sessionDate:      { fontSize: 10, color: theme.colors.textSecondary, marginTop: 10, marginHorizontal: 12 },
  sessionMethod:    { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, marginHorizontal: 12, marginTop: 3 },
  sessionBean:      { fontSize: 11, color: theme.colors.textSecondary, marginHorizontal: 12, marginTop: 2 },
  sessionTaste: {
    margin:          10,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
    alignSelf:       'flex-start',
  },
  sessionTasteText: { fontSize: 10, fontWeight: '600' },
})
