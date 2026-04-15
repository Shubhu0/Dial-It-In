import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Brew, DialInScore } from '@/lib/types'
import { theme } from '@/constants/theme'
import { ProgressBar } from '@/components/ProgressBar'

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

function barColor(rating: number, index: number, brews: Brew[]) {
  const pos = brews[index]?.taste_position ?? 50
  return tasteColor(pos)
}

export default function ProgressScreen() {
  const { selectedBean, recentBrews, fetchRecentBrews } = useStore()
  const [score, setScore] = useState<DialInScore | null>(null)

  useEffect(() => {
    fetchRecentBrews()
    if (selectedBean) {
      supabase
        .from('dial_in_scores')
        .select('*')
        .eq('bean_id', selectedBean.id)
        .single()
        .then(({ data }) => setScore(data))
    }
  }, [selectedBean?.id])

  const beanBrews = selectedBean
    ? recentBrews.filter((b) => b.bean_id === selectedBean.id)
    : recentBrews

  const last5 = beanBrews.slice(0, 5).reverse()
  const maxRating = 5

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your progress</Text>
          {selectedBean && (
            <Text style={styles.beanName}>{selectedBean.name}</Text>
          )}
        </View>

        {/* Dial-in score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Dial-in score · last 5 shots</Text>

          {/* Bar chart */}
          <View style={styles.barChart}>
            {last5.map((brew, i) => {
              const rating = brew.rating ?? 3
              const height = Math.max(8, (rating / maxRating) * 58)
              return (
                <View key={brew.id} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: barColor(rating, i, last5) },
                    ]}
                  />
                  <Text style={styles.barNum}>{i + 1}</Text>
                </View>
              )
            })}
            {last5.length === 0 && (
              <Text style={styles.emptyChart}>No brews yet</Text>
            )}
          </View>

          <ProgressBar pct={score?.dial_in_pct ?? 0} />
        </View>

        {/* Shot log */}
        <Text style={styles.sectionHeader}>Shot log</Text>
        {beanBrews.length === 0 ? (
          <Text style={styles.empty}>No brews logged yet.</Text>
        ) : (
          beanBrews.map((brew, index) => {
            const pos   = brew.taste_position ?? 50
            const color = tasteColor(pos)
            return (
              <View key={brew.id} style={styles.brewRow}>
                <Text style={styles.brewNum}>#{beanBrews.length - index}</Text>
                <View style={styles.brewInfo}>
                  <Text style={styles.brewMethod}>{METHOD_LABELS[brew.method]}</Text>
                  <Text style={styles.brewParams}>
                    {brew.dose_g ? `${brew.dose_g}g` : ''}
                    {brew.grind_setting ? ` · grind ${brew.grind_setting}` : ''}
                  </Text>
                </View>
                <View style={[styles.tasteBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.tasteBadgeText, { color }]}>{tasteLabel(pos)}</Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { padding: theme.spacing.standard, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title:   { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  beanName: { fontSize: 13, color: theme.colors.accent, marginTop: 2 },
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    20,
    padding:         theme.spacing.base,
    marginBottom:    20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  scoreLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12 },
  barChart:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 68, marginBottom: 12 },
  barCol:     { flex: 1, alignItems: 'center', gap: 4 },
  bar:        { width: '100%', borderRadius: 4, minHeight: 8 },
  barNum:     { fontSize: 10, color: theme.colors.textSecondary },
  emptyChart: { fontSize: 13, color: theme.colors.textSecondary },
  sectionHeader: {
    fontSize:     14,
    fontWeight:   '600',
    color:        theme.colors.textPrimary,
    marginBottom: 10,
  },
  empty: { fontSize: 13, color: theme.colors.textSecondary },
  brewRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.card,
    borderRadius:    14,
    padding:         12,
    marginBottom:    8,
    gap:             10,
  },
  brewNum:    { fontSize: 13, fontWeight: '700', color: theme.colors.accent, width: 28 },
  brewInfo:   { flex: 1 },
  brewMethod: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  brewParams: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  tasteBadge: {
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  tasteBadgeText: { fontSize: 11, fontWeight: '600' },
})
