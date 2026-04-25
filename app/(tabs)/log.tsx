import React, { useEffect, useState } from 'react'
import {
  View, Text, Pressable, SectionList,
  StyleSheet, SafeAreaView, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useStore } from '@/lib/store'
import { Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'

const METHOD_LABELS: Record<string, string> = {
  espresso:     'Espresso',
  pour_over:    'Pour Over',
  aeropress:    'AeroPress',
  french_press: 'French Press',
}

// Small filter pills — not modals, just toggleable chips
const FILTERS = ['All', 'Espresso', '4★+', 'This week'] as const
type Filter = typeof FILTERS[number]

type Section = { title: string; dateLabel: string; data: Brew[] }

function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos > 55) return theme.colors.bitter
  return theme.colors.balanced
}

function buildSections(brews: Brew[]): Section[] {
  const map  = new Map<string, Brew[]>()
  const now  = new Date()
  const yest = new Date(now); yest.setDate(yest.getDate() - 1)
  brews.forEach(b => {
    const d   = b.created_at ? new Date(b.created_at) : now
    const key = d.toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(b)
  })
  return Array.from(map.entries()).map(([key, items]) => {
    const d = new Date(key)
    let title = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    if (d.toDateString() === now.toDateString())  title = 'TODAY'
    if (d.toDateString() === yest.toDateString()) title = 'YESTERDAY'
    const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
    return { title, dateLabel, data: items }
  })
}

export default function LogScreen() {
  const router  = useRouter()
  const { recentBrews, fetchRecentBrews } = useStore()
  const [activeFilter, setFilter] = useState<Filter>('All')

  useEffect(() => { fetchRecentBrews() }, [])

  const filtered = recentBrews.filter(b => {
    if (activeFilter === 'Espresso')  return b.method === 'espresso'
    if (activeFilter === '4★+')       return (b.rating ?? 0) >= 4
    if (activeFilter === 'This week') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
      return new Date(b.created_at ?? '') > cutoff
    }
    return true
  })

  const sections = buildSections(filtered)

  return (
    <SafeAreaView style={s.safe}>
      {/* Paper grain */}
      <View style={s.grain} pointerEvents="none" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Brew Log</Text>
        <Text style={s.subtitle}>Vol. 01 · {recentBrews.length} entries</Text>
      </View>

      {/* Filter pills — small, horizontal row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[s.filterPill, activeFilter === f && s.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Hairline */}
      <View style={s.hairline} />

      {/* List */}
      {sections.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No entries yet</Text>
          <Text style={s.emptyHint}>Pull a shot and log it here</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={b => b.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            // Direction A day header — mono caps with flanking hairlines
            <View style={s.dayHeader}>
              <View style={s.dayHairline} />
              <Text style={s.dayTitle}>{section.title}</Text>
              <Text style={s.dayDate}>· {section.dateLabel}</Text>
              <View style={s.dayHairline} />
            </View>
          )}
          renderItem={({ item: brew, index }) => {
            const pos   = brew.taste_position ?? 50
            const color = tasteColor(pos)
            const time  = brew.created_at
              ? new Date(brew.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : ''
            const entryNum = String(filtered.length - filtered.indexOf(brew)).padStart(3, '0')
            return (
              <Pressable
                style={[s.brewRow, { borderLeftColor: color }]}
                onPress={() => router.push(`/brew/${brew.id}`)}
              >
                {/* Left: entry number + time */}
                <View style={s.brewMeta}>
                  <Text style={s.entryNum}>▷{entryNum}</Text>
                  <Text style={s.entryTime}>{time}</Text>
                </View>

                {/* Center: bean + note + params */}
                <View style={s.brewBody}>
                  <Text style={s.brewBeanName} numberOfLines={1}>
                    {brew.beans?.name ?? METHOD_LABELS[brew.method] ?? brew.method}
                  </Text>
                  {brew.personal_notes ? (
                    <Text style={s.brewNote} numberOfLines={1}>"{brew.personal_notes}"</Text>
                  ) : null}
                  <Text style={s.brewParams}>
                    {[
                      brew.dose_g        ? `${brew.dose_g}g`       : null,
                      brew.yield_g       ? `${brew.yield_g}g`      : null,
                      brew.time_s        ? `${brew.time_s}s`       : null,
                      brew.grind_setting ? `G${brew.grind_setting}` : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                {/* Right: star rating */}
                <Text style={s.brewStars}>
                  {'★'.repeat(brew.rating ?? 0)}{'☆'.repeat(5 - (brew.rating ?? 0))}
                </Text>
              </Pressable>
            )
          }}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
          ItemSeparatorComponent={()   => <View style={s.rowDivider} />}
        />
      )}

      {/* FAB */}
      <Pressable style={s.fab} onPress={() => router.push('/(tabs)/dial')}>
        <Plus size={22} stroke="#FFF" strokeWidth={2} />
      </Pressable>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.colors.bgPrimary },
  grain: { position: 'absolute', inset: 0, backgroundColor: 'rgba(90,60,20,0.025)', pointerEvents: 'none' } as any,

  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8 },
  title:  { fontFamily: fonts.serif, fontSize: 28, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  subtitle:{ fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.18, marginTop: 2 },

  // Filter pills — fixed height row, no vertical stretch
  filterScroll: { height: 40, flexGrow: 0 },
  filterRow: {
    paddingHorizontal: 22, gap: 6,
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
  },
  filterPill: {
    height: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.divider,
    backgroundColor: theme.colors.bgPrimary,
  },
  filterPillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  filterText:       { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textSecondary, letterSpacing: 0.1 },
  filterTextActive: { color: theme.colors.bgPrimary },

  hairline: { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: 22 },

  listContent: { paddingHorizontal: 22, paddingBottom: 120 },

  // Day section header — mono caps with hairlines (Direction A)
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  dayHairline: { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  dayTitle:    { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.accentDark, letterSpacing: 0.25 },
  dayDate:     { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary },

  // Brew row — flat, left border stripe for taste zone
  brewRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12,
    borderLeftWidth: 3, paddingLeft: 12,
    backgroundColor: theme.colors.bgPrimary,
  },
  rowDivider: { height: 1, backgroundColor: theme.colors.dividerSoft },
  brewMeta: { width: 46, gap: 2 },
  entryNum: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.accent },
  entryTime:{ fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary },
  brewBody:      { flex: 1, gap: 2 },
  brewBeanName:  { fontFamily: fonts.serif, fontSize: 16, color: theme.colors.textPrimary, letterSpacing: -0.2 },
  brewNote:      { fontFamily: fonts.bodyItalic, fontSize: 12, color: theme.colors.textSecondary },
  brewParams:    { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.05 },
  brewStars:     { fontSize: 12, color: theme.colors.accent, alignSelf: 'flex-start', marginTop: 2 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary },
  emptyHint:  { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textSecondary },

  // FAB — Direction A: lighter shadow
  fab: {
    position:        'absolute',
    right:           22,
    bottom:          20,
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: theme.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#281400',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    10,
    elevation:       5,
  },
})
