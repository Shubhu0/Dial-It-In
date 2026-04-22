import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Brew, DialInScore } from '@/lib/types'
import { theme } from '@/constants/theme'
import { ProgressChart } from '@/components/ProgressChart'
import { getZoneLabel, getTrend, getDialDNA } from '@/lib/algorithms'

const METHOD_LABELS: Record<string, string> = {
  espresso:     'Espresso',
  pour_over:    'Pour Over',
  aeropress:    'AeroPress',
  french_press: 'French Press',
}

function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos > 55) return theme.colors.bitter
  return theme.colors.balanced
}

export default function ProgressScreen() {
  const { width } = useWindowDimensions()
  const { selectedBean, recentBrews, fetchRecentBrews, userProfile } = useStore()
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

  const beanBrews: Brew[] = selectedBean
    ? recentBrews.filter((b) => b.bean_id === selectedBean.id)
    : recentBrews

  const dna = getDialDNA(beanBrews)

  const trajectory = beanBrews
    .map((b) => b.taste_position ?? 50)
    .reverse()

  const dialInPct = score?.dial_in_pct
    ?? (trajectory.length
        ? Math.round(100 - (trajectory.reduce((s, v) => s + Math.abs(v - 50), 0) / trajectory.length) * 2)
        : 0)

  const trend = getTrend(trajectory)
  const trendLabel = { improving: '📈 Improving', stable: '→ Stable', regressing: '📉 Needs work' }[trend]
  const trendColor = { improving: theme.colors.balanced, stable: theme.colors.accent, regressing: theme.colors.sour }[trend]

  const chartWidth = Math.min(width - 64, 360)

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Progress</Text>
            {selectedBean && (
              <Text style={styles.beanLabel}>{selectedBean.name}</Text>
            )}
          </View>
          {trajectory.length > 0 && (
            <View style={[styles.trendBadge, { backgroundColor: trendColor + '22' }]}>
              <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
            </View>
          )}
        </View>

        {/* Dial-in score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>DIAL-IN SCORE</Text>

          {/* Progress ring (simple linear bar) */}
          <View style={styles.scorePctRow}>
            <Text style={styles.scorePct}>{Math.max(0, dialInPct)}%</Text>
            <Text style={styles.scoreHint}>
              {dialInPct >= 80 ? 'Dialled in 🎯'
              : dialInPct >= 60 ? 'Getting there'
              : 'Keep iterating'}
            </Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View style={[
              styles.scoreBarFill,
              { width: `${Math.max(0, Math.min(100, dialInPct))}%`,
                backgroundColor: dialInPct >= 80 ? theme.colors.balanced
                  : dialInPct >= 60 ? theme.colors.accent
                  : theme.colors.sour }
            ]} />
          </View>

          {/* Mini bar chart (last 5) */}
          {beanBrews.length > 0 && (
            <View style={styles.barChart}>
              {beanBrews.slice(0, 5).reverse().map((brew, i) => {
                const pos    = brew.taste_position ?? 50
                const height = Math.max(8, (Math.abs(pos - 50) / 50) * 52 + 8)
                const color  = tasteColor(pos)
                return (
                  <View key={brew.id} style={styles.barCol}>
                    <View style={styles.barBg}>
                      <View style={[styles.bar, { height, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.barLabel}>{i + 1}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* Trajectory chart */}
        {trajectory.length >= 2 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Taste trajectory</Text>
            <Text style={styles.chartSub}>Closer to 50 = more balanced</Text>
            <ProgressChart
              trajectory={trajectory}
              width={chartWidth}
              height={120}
            />
          </View>
        )}

        {/* Personal stats */}
        {userProfile.totalBrews > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{userProfile.totalBrews}</Text>
              <Text style={styles.statLabel}>Total brews</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: tasteColor(userProfile.averageTaste) }]}>
                {userProfile.averageTaste}
              </Text>
              <Text style={styles.statLabel}>Avg taste</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: trendColor }]}>
                {userProfile.tastePreference}
              </Text>
              <Text style={styles.statLabel}>Your target</Text>
            </View>
          </View>
        )}

        {/* Brew comparison — last 2 brews side by side */}
        {beanBrews.length >= 2 && (() => {
          const curr = beanBrews[0]
          const prev = beanBrews[1]
          const rows = [
            { label: 'Dose',      curr: curr.dose_g        != null ? `${curr.dose_g}g`        : '—', prev: prev.dose_g        != null ? `${prev.dose_g}g`        : '—' },
            { label: 'Yield',     curr: curr.yield_g       != null ? `${curr.yield_g}g`       : '—', prev: prev.yield_g       != null ? `${prev.yield_g}g`       : '—' },
            { label: 'Time',      curr: curr.time_s        != null ? `${curr.time_s}s`        : '—', prev: prev.time_s        != null ? `${prev.time_s}s`        : '—' },
            { label: 'Grind',     curr: curr.grind_setting ?? '—',                                   prev: prev.grind_setting ?? '—'                                   },
            { label: 'Taste',     curr: getZoneLabel(curr.taste_position ?? 50),                     prev: getZoneLabel(prev.taste_position ?? 50)                     },
          ]
          return (
            <View style={styles.compareCard}>
              <Text style={styles.compareTitle}>Brew comparison</Text>
              <View style={styles.compareHeaderRow}>
                <Text style={[styles.compareLabel, { flex: 1 }]} />
                <Text style={styles.compareColHead}>Previous</Text>
                <Text style={[styles.compareColHead, { color: theme.colors.accent }]}>Latest</Text>
              </View>
              {rows.map((r) => (
                <View key={r.label} style={styles.compareRow}>
                  <Text style={styles.compareLabel}>{r.label}</Text>
                  <Text style={styles.compareCell}>{r.prev}</Text>
                  <Text style={[styles.compareCell, styles.compareCellCurrent]}>{r.curr}</Text>
                </View>
              ))}
            </View>
          )
        })()}

        {/* Dial DNA — behavioural insights */}
        {dna.length > 0 && (
          <View style={styles.dnaCard}>
            <Text style={styles.dnaTitle}>🧬 Dial DNA</Text>
            <Text style={styles.dnaSub}>Patterns we've noticed in your brewing</Text>
            {dna.map((insight, i) => (
              <View key={i} style={styles.dnaRow}>
                <View style={styles.dnaDot} />
                <Text style={styles.dnaText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Shot log */}
        <Text style={styles.sectionTitle}>Shot log</Text>
        {beanBrews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyText}>No brews logged yet</Text>
            <Text style={styles.emptyHint}>Head to the Dial tab to log your first brew</Text>
          </View>
        ) : (
          beanBrews.map((brew, index) => {
            const pos   = brew.taste_position ?? 50
            const color = tasteColor(pos)
            const date  = brew.created_at
              ? new Date(brew.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : ''
            return (
              <View key={brew.id} style={styles.brewRow}>
                <View style={[styles.brewNumBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.brewNum, { color }]}>#{beanBrews.length - index}</Text>
                </View>
                <View style={styles.brewInfo}>
                  <Text style={styles.brewMethod}>{METHOD_LABELS[brew.method] ?? brew.method}</Text>
                  <View style={styles.brewParamsRow}>
                    {brew.dose_g        ? <Text style={styles.brewParam}>{brew.dose_g}g</Text>        : null}
                    {brew.grind_setting ? <Text style={styles.brewParam}>grind {brew.grind_setting}</Text> : null}
                    {brew.time_s        ? <Text style={styles.brewParam}>{brew.time_s}s</Text>        : null}
                  </View>
                  {date ? <Text style={styles.brewDate}>{date}</Text> : null}
                </View>
                <View style={[styles.tastePill, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.tastePillText, { color }]}>{getZoneLabel(pos)}</Text>
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
  content: { padding: 20, paddingBottom: 40, gap: 16 },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  title:     { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary },
  beanLabel: { fontSize: 13, color: theme.colors.accent, marginTop: 2 },
  trendBadge: {
    borderRadius:    theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical:    5,
  },
  trendText: { fontSize: 12, fontWeight: '600' },

  // Score card
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         18,
    ...theme.shadow.md,
  },
  scoreCardLabel: {
    fontSize:      10,
    fontWeight:    '700',
    color:         theme.colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom:  12,
  },
  scorePctRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  scorePct:    { fontSize: 40, fontWeight: '800', color: theme.colors.textPrimary },
  scoreHint:   { fontSize: 13, color: theme.colors.textSecondary },
  scoreBarBg: {
    height:          8,
    backgroundColor: theme.colors.divider,
    borderRadius:    theme.radius.full,
    overflow:        'hidden',
    marginBottom:    16,
  },
  scoreBarFill: {
    height:       8,
    borderRadius: theme.radius.full,
  },
  barChart: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    gap:            8,
    height:         72,
    marginTop:      4,
  },
  barCol:  { flex: 1, alignItems: 'center', gap: 4 },
  barBg:   { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar:     { width: '100%', borderRadius: 4 },
  barLabel:{ fontSize: 10, color: theme.colors.textSecondary },

  // Chart card
  chartCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         16,
    alignItems:      'center',
    ...theme.shadow.sm,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, alignSelf: 'flex-start' },
  chartSub:   { fontSize: 11, color: theme.colors.textSecondary, alignSelf: 'flex-start', marginBottom: 12 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex:            1,
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.lg,
    padding:         14,
    alignItems:      'center',
    ...theme.shadow.xs,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },

  // Brew comparison
  compareCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         16,
    ...theme.shadow.sm,
  },
  compareTitle:     { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  compareHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  compareColHead:   { width: 80, fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, textAlign: 'right' },
  compareRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  compareLabel:     { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
  compareCell:      { width: 80, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right' },
  compareCellCurrent: { fontWeight: '700', color: theme.colors.textPrimary },

  // Dial DNA
  dnaCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         16,
    ...theme.shadow.sm,
  },
  dnaTitle:  { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  dnaSub:    { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 12, marginTop: 2 },
  dnaRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  dnaDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent, marginTop: 6 },
  dnaText:   { flex: 1, fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 },

  // Section
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 4 },

  // Empty state
  emptyState: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         32,
    alignItems:      'center',
    gap:             6,
    ...theme.shadow.xs,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  emptyHint: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },

  // Brew row
  brewRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.lg,
    padding:         12,
    gap:             10,
    ...theme.shadow.xs,
  },
  brewNumBadge: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brewNum:      { fontSize: 12, fontWeight: '700' },
  brewInfo:     { flex: 1 },
  brewMethod:   { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  brewParamsRow:{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  brewParam:    { fontSize: 11, color: theme.colors.textSecondary },
  brewDate:     { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
  tastePill: {
    borderRadius:    theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  tastePillText: { fontSize: 11, fontWeight: '600' },
})
