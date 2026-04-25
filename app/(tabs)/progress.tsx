import React, { useEffect, useState } from 'react'
import {
  ScrollView, View, Text, Pressable,
  StyleSheet, SafeAreaView, useWindowDimensions,
} from 'react-native'
import { useStore } from '@/lib/store'
import { Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { getTrend, getDialDNA } from '@/lib/algorithms'
import Svg, {
  Path, Defs, LinearGradient as SvgGrad, Stop,
  Circle as SvgCircle, Line as SvgLine,
} from 'react-native-svg'

// ── Mini sparkline (Direction A: framed box, dots at each point) ─────────────
function Sparkline({ data, width, height }: { data: number[]; width: number; height: number }) {
  if (data.length < 2) return null
  const pad = 10
  const W = width - pad * 2, H = height - pad * 2
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * W,
    y: pad + H - ((v - min) / range) * H,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id="sg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={theme.colors.accent} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={theme.colors.accent} stopOpacity="0"    />
        </SvgGrad>
      </Defs>
      {/* Soft fill below line */}
      <Path d={`${line} L${pts[pts.length-1].x},${pad+H} L${pts[0].x},${pad+H} Z`} fill="url(#sg)" />
      {/* Accent line */}
      <Path d={line} fill="none" stroke={theme.colors.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots at each data point */}
      {pts.map((p, i) => (
        <SvgCircle key={i} cx={p.x} cy={p.y} r={2} fill={theme.colors.accent} />
      ))}
    </Svg>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos > 55) return theme.colors.bitter
  return theme.colors.balanced
}

const METHODS = [
  { label: 'Espresso',  key: 'espresso'     },
  { label: 'Pour-over', key: 'pour_over'    },
  { label: 'AeroPress', key: 'aeropress'    },
]

// ── screen ────────────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { width }   = useWindowDimensions()
  const { recentBrews, fetchRecentBrews, userProfile, selectedBean } = useStore()
  const [range, setRange] = useState<'7D' | '14D' | '30D'>('14D')

  useEffect(() => { fetchRecentBrews() }, [])

  const days     = range === '7D' ? 7 : range === '14D' ? 14 : 30
  const cutoff   = new Date(); cutoff.setDate(cutoff.getDate() - days)
  const inWindow = recentBrews.filter(b => new Date(b.created_at ?? '') > cutoff)

  const beanBrews: Brew[] = selectedBean
    ? recentBrews.filter(b => b.bean_id === selectedBean.id)
    : recentBrews

  const trajectory = beanBrews.map(b => b.taste_position ?? 50).reverse()
  const dna        = getDialDNA(beanBrews)
  const trend      = getTrend(trajectory)

  const dialInScore = trajectory.length
    ? Math.round(100 - trajectory.reduce((s, v) => s + Math.abs(v - 50), 0) / trajectory.length * 2)
    : 0

  const trendLabel = { improving: '↑ Improving', stable: '→ Stable', regressing: '↓ Regressing' }[trend]
  const trendColor = { improving: theme.colors.positive, stable: theme.colors.textTertiary, regressing: theme.colors.error }[trend]

  const methodCounts = METHODS.map(m => ({
    ...m, count: recentBrews.filter(b => b.method === m.key).length,
  }))
  const maxCount = Math.max(...methodCounts.map(m => m.count), 1)

  const chartW = width - 44

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.grain} pointerEvents="none" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Stats</Text>
            {selectedBean && <Text style={s.beanLabel}>{selectedBean.name}</Text>}
          </View>
          <View style={s.rangeRow}>
            {(['7D', '14D', '30D'] as const).map(r => (
              <Pressable
                key={r}
                style={[s.rangePill, range === r && s.rangePillActive]}
                onPress={() => setRange(r)}
              >
                <Text style={[s.rangeText, range === r && s.rangeTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.hairline} />

        {/* ── Big number + trend ────────────────────────────────────── */}
        <View style={s.heroRow}>
          <View>
            <Text style={s.heroLabel}>SHOTS PULLED</Text>
            <Text style={s.heroNum}>{userProfile.totalBrews}</Text>
            {trajectory.length > 0 && (
              <Text style={[s.trendLine, { color: trendColor }]}>{trendLabel}</Text>
            )}
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroLabel}>AVG RATING</Text>
            <Text style={[s.heroNum, { color: theme.colors.accent }]}>
              {userProfile.averageTaste != null ? (userProfile.averageTaste / 20).toFixed(1) : '—'}
              <Text style={s.heroUnit}>/5</Text>
            </Text>
          </View>
        </View>

        {/* ── Sparkline — in framed box (Direction A) ───────────────── */}
        {trajectory.length >= 2 && (
          <View style={s.sparkBox}>
            <Text style={s.sparkLabel}>RATING TREND · {range}</Text>
            <Sparkline data={trajectory} width={chartW} height={100} />
          </View>
        )}

        {/* ── 2×3 stats grid ────────────────────────────────────────── */}
        {userProfile.totalBrews > 0 && (
          <View style={s.grid}>
            {[
              { label: 'BEST METHOD',   value: 'Espresso',                                 sub: `${methodCounts[0].count} pulls` },
              { label: 'MOST BREWED',   value: selectedBean?.name?.split(' ')[0] ?? '—',  sub: `${beanBrews.length} pulls`     },
              { label: 'AVG TIME',      value: '—',                                         sub: 'seconds'                       },
              { label: 'AVG RATIO',     value: '1:2.2',                                     sub: '± 0.3'                         },
              { label: `SHOTS/${range}`, value: String(inWindow.length),                   sub: 'this period'                   },
              { label: 'DIAL-IN SCORE', value: String(dialInScore),                         sub: '/ 100'                         },
            ].map((st, i) => (
              <View key={st.label} style={[s.gridCell, i % 2 !== 0 && s.gridCellRight, i >= 2 && s.gridCellTop]}>
                <Text style={s.gridLabel}>{st.label}</Text>
                <Text style={s.gridValue}>{st.value}</Text>
                {st.sub ? <Text style={s.gridSub}>{st.sub}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* ── Insight card — rule border, italic serif (Direction A) ─── */}
        <View style={s.insightCard}>
          <Text style={s.insightLabel}>OBSERVATION</Text>
          <Text style={s.insightBody}>
            {dna.length > 0
              ? dna[0]
              : 'Log more brews to unlock personalised insights about your dialling patterns.'}
          </Text>
        </View>

        {/* ── By method bar chart ────────────────────────────────────── */}
        {recentBrews.length > 0 && (
          <View>
            <View style={s.sectionStamp}>
              <View style={s.stampLine} />
              <Text style={s.stampText}>BY METHOD</Text>
              <View style={s.stampLine} />
            </View>
            <View style={s.methodList}>
              {methodCounts.filter(m => m.count > 0).map((m, i, arr) => (
                <View key={m.key} style={[s.methodRow, i < arr.length - 1 && s.methodRowBorder]}>
                  <Text style={s.methodLabel}>{m.label}</Text>
                  <View style={s.methodBarBg}>
                    <View style={[s.methodBarFill, { width: `${(m.count / maxCount) * 100}%` as any }]} />
                  </View>
                  <Text style={s.methodCount}>{m.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Dial DNA ──────────────────────────────────────────────── */}
        {dna.length > 1 && (
          <View>
            <View style={s.sectionStamp}>
              <View style={s.stampLine} />
              <Text style={s.stampText}>DIAL DNA</Text>
              <View style={s.stampLine} />
            </View>
            <View style={s.dnaList}>
              {dna.slice(0, 4).map((d, i, arr) => (
                <View key={i} style={[s.dnaRow, i < arr.length - 1 && s.dnaRowBorder]}>
                  <Text style={s.dnaBullet}>—</Text>
                  <Text style={s.dnaText}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.colors.bgPrimary },
  grain: { position: 'absolute', inset: 0, backgroundColor: 'rgba(90,60,20,0.025)', pointerEvents: 'none' } as any,
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, gap: 18 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:  { fontFamily: fonts.serif, fontSize: 28, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  beanLabel: { fontFamily: fonts.body, fontSize: 13, color: theme.colors.accent, marginTop: 2 },
  hairline:  { height: 1, backgroundColor: theme.colors.divider },

  // Range toggle — flat chips
  rangeRow:        { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.divider, marginTop: 4 },
  rangePill:       { paddingHorizontal: 10, paddingVertical: 5 },
  rangePillActive: { backgroundColor: theme.colors.textPrimary },
  rangeText:       { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textSecondary, letterSpacing: 0.1 },
  rangeTextActive: { color: theme.colors.bgPrimary },

  // Big numbers row
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 4 },
  heroLabel:{ fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18, marginBottom: 4 },
  heroNum:  { fontFamily: fonts.serif, fontSize: 68, color: theme.colors.textPrimary, letterSpacing: -2, lineHeight: 72 },
  heroUnit: { fontFamily: fonts.mono, fontSize: 20, color: theme.colors.textTertiary },
  heroRight:{ alignItems: 'flex-end' },
  trendLine:{ fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },

  // Sparkline — framed 1px rule box (Direction A)
  sparkBox:  { borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.bgSecondary, padding: 4 },
  sparkLabel:{ fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18, padding: 6, paddingBottom: 0 },

  // 2×3 grid — rule borders, flat
  grid: { borderWidth: 1, borderColor: theme.colors.divider, flexDirection: 'row', flexWrap: 'wrap' },
  gridCell:      { width: '50%', padding: 14, gap: 3, backgroundColor: theme.colors.bgSecondary },
  gridCellRight: { borderLeftWidth: 1, borderLeftColor: theme.colors.divider },
  gridCellTop:   { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  gridLabel:     { fontFamily: fonts.mono, fontSize: 8, color: theme.colors.textTertiary, letterSpacing: 0.18 },
  gridValue:     { fontFamily: fonts.serif, fontSize: 22, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  gridSub:       { fontFamily: fonts.body, fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic' },

  // Insight card — flat, rule border, italic serif body (Direction A)
  insightCard: { borderWidth: 1, borderColor: theme.colors.divider, padding: 14, backgroundColor: theme.colors.bgSecondary },
  insightLabel:{ fontFamily: fonts.mono, fontSize: 9, color: theme.colors.accent, letterSpacing: 0.2, marginBottom: 6 },
  insightBody: { fontFamily: fonts.bodyItalic, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 21 },

  // Section stamps (Direction A)
  sectionStamp: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stampLine:    { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  stampText:    { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.25 },

  // Method breakdown — flat list
  methodList: { borderWidth: 1, borderColor: theme.colors.divider },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.bgSecondary },
  methodRowBorder:{ borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  methodLabel:    { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textSecondary, width: 80 },
  methodBarBg:    { flex: 1, height: 2, backgroundColor: theme.colors.divider, overflow: 'hidden' },
  methodBarFill:  { height: 2, backgroundColor: theme.colors.accent },
  methodCount:    { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, width: 24, textAlign: 'right' },

  // DNA list
  dnaList: { borderWidth: 1, borderColor: theme.colors.divider },
  dnaRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.bgSecondary },
  dnaRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  dnaBullet:    { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.accent, marginTop: 2 },
  dnaText:      { flex: 1, fontFamily: fonts.body, fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 },
})
