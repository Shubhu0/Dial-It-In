import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Brew } from '@/lib/types'
import { theme } from '@/constants/theme'

const METHOD_LABELS: Record<string, string> = {
  espresso:     'Espresso',
  pour_over:    'Pour over',
  aeropress:    'AeroPress',
  french_press: 'French press',
}

function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos <= 55) return theme.colors.balanced
  return theme.colors.accentDark
}

function tasteLabel(pos: number) {
  if (pos < 30) return 'Very Sour'
  if (pos < 45) return 'Sour'
  if (pos <= 55) return 'Balanced'
  if (pos <= 70) return 'Bitter'
  return 'Very Bitter'
}

interface Props {
  brew: Brew
}

export function SessionCard({ brew }: Props) {
  const router = useRouter()
  const pos    = brew.taste_position ?? 50
  const color  = tasteColor(pos)

  const date = brew.created_at
    ? new Date(brew.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/brew/${brew.id}`)}
    >
      <Text style={styles.method}>{METHOD_LABELS[brew.method] ?? brew.method} · {date}</Text>
      <Text style={styles.beanName} numberOfLines={1}>{(brew as any).beans?.name ?? '—'}</Text>

      {/* Mini taste bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pos}%` as any, backgroundColor: color }]} />
      </View>

      <View style={[styles.badge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.badgeText, { color }]}>{tasteLabel(pos)}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    width:           132,
    height:          118,
    backgroundColor: theme.colors.card,
    borderRadius:    18,
    padding:         12,
    marginRight:     10,
    justifyContent:  'space-between',
  },
  method:   { fontSize: 10, color: theme.colors.textSecondary },
  beanName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  barTrack: {
    height:          4,
    backgroundColor: theme.colors.divider,
    borderRadius:    2,
    overflow:        'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  badge: {
    borderRadius:    6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf:       'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
})
