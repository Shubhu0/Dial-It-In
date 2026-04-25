import React, { useEffect, useState } from 'react'
import {
  ScrollView, View, Text, Pressable,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, MoreHorizontal, RotateCcw } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { useStore } from '@/lib/store'

const METHOD_LABELS: Record<string, string> = {
  espresso:     'Espresso',
  pour_over:    'Pour Over',
  aeropress:    'AeroPress',
  french_press: 'French Press',
}

// ── star rating display ───────────────────────────────────────────────────────
function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Text
          key={i}
          style={{ fontSize: 18, color: i < count ? theme.colors.accent : theme.colors.divider }}
        >
          ★
        </Text>
      ))}
    </View>
  )
}

function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos <= 55) return theme.colors.balanced
  return theme.colors.bitter
}
function tasteLabel(pos: number) {
  if (pos < 40) return 'Sour'
  if (pos < 45) return 'Slightly sour'
  if (pos <= 55) return 'Balanced'
  if (pos <= 60) return 'Slightly bitter'
  return 'Bitter'
}

// ── Kit data (from Profile — in future wire to user preferences) ──────────────
const DEFAULT_KIT = [
  { label: 'MACHINE',  value: 'Lelit Bianca' },
  { label: 'GRINDER',  value: 'Niche Zero'   },
  { label: 'TEMP',     value: '93.0 °C'      },
  { label: 'PRESSURE', value: '9 bar'         },
  { label: 'BASKET',   value: 'VST 18g'      },
  { label: 'WATER',    value: 'Filtered'     },
]

// ── screen ────────────────────────────────────────────────────────────────────
export default function BrewDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
  const { updateParam, recentBrews, beans: storeBeans, isGuest } = useStore()
  const [brew, setBrew] = useState<Brew | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local store first — works for guest mode and recently saved brews
    const localBrew = recentBrews.find(b => b.id === id)
    if (localBrew) {
      // Enrich with bean data from store if not already joined
      if (!localBrew.beans) {
        const bean = storeBeans.find(b => b.id === localBrew.bean_id)
        if (bean) {
          setBrew({ ...localBrew, beans: { name: bean.name, origin: bean.origin } } as any)
        } else {
          setBrew(localBrew)
        }
      } else {
        setBrew(localBrew)
      }
      setLoading(false)
    }

    if (!isGuest) {
      supabase
        .from('brews')
        .select('*, beans(name, origin, roaster)')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) setBrew(data as Brew)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [id])

  if (loading && !brew) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    )
  }

  if (!brew) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerBeanName}>Brew not found</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontFamily: fonts.bodyItalic, fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center' }}>
            This brew record could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  function handleRepeat() {
    if (!brew) return
    if (brew.dose_g)      updateParam('dose_g',      brew.dose_g)
    if (brew.yield_g)     updateParam('yield_g',     brew.yield_g)
    if (brew.time_s)      updateParam('time_s',      brew.time_s)
    if (brew.water_g)     updateParam('water_g',     brew.water_g)
    if (brew.brew_time_s) updateParam('brew_time_s', brew.brew_time_s)
    router.push('/(tabs)/dial')
  }

  const pos      = brew.taste_position ?? 50
  const color    = tasteColor(pos)
  const beanData = (brew as any).beans
  const isEspresso = brew.method === 'espresso'
  const ratio    = isEspresso && brew.dose_g && brew.yield_g
    ? `1:${(brew.yield_g / brew.dose_g).toFixed(1)}`
    : null

  const formattedDate = brew.created_at
    ? new Date(brew.created_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      }).toUpperCase()
    : ''

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {/* Breadcrumb: dot + method · date */}
          <View style={s.breadcrumb}>
            <View style={[s.breadcrumbDot, { backgroundColor: color }]} />
            <Text style={[s.breadcrumbText, { color }]}>
              {METHOD_LABELS[brew.method] ?? brew.method} · {formattedDate}
            </Text>
          </View>
          {/* Bean name */}
          <Text style={s.headerBeanName} numberOfLines={1}>
            {beanData?.name ?? METHOD_LABELS[brew.method] ?? brew.method}
          </Text>
          {beanData?.origin && (
            <Text style={s.headerBeanOrigin} numberOfLines={1}>
              {beanData.origin.split(',')[0]}
            </Text>
          )}
        </View>
        <Pressable style={s.moreBtn} hitSlop={8}>
          <MoreHorizontal size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── 4-col metrics card ───────────────────────────────────── */}
        <View style={s.metricsCard}>
          <Text style={s.cardLabel}>PARAMETERS</Text>
          <View style={s.metricsGrid}>
            {[
              { label: 'DOSE',  value: brew.dose_g  != null ? String(brew.dose_g)  : '—', unit: 'g' },
              { label: 'YIELD', value: brew.yield_g != null ? String(brew.yield_g) : '—', unit: 'g' },
              { label: 'TIME',  value: brew.time_s  != null ? String(brew.time_s)  : '—', unit: 's' },
              { label: 'GRIND', value: brew.grind_setting ?? '—',                          unit: '' },
            ].map((m, i) => (
              <React.Fragment key={m.label}>
                {i > 0 && <View style={s.metricDivider} />}
                <View style={s.metricCell}>
                  <Text style={s.metricLabel}>{m.label}</Text>
                  <Text style={s.metricValue}>
                    {m.value}<Text style={s.metricUnit}>{m.unit}</Text>
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Secondary pills: ratio / flow / temp */}
          {(ratio || brew.water_temp_c) && (
            <View style={s.secondaryRow}>
              {ratio && (
                <View style={s.secondaryPill}>
                  <Text style={s.secondaryLabel}>Ratio</Text>
                  <Text style={s.secondaryValue}>{ratio}</Text>
                </View>
              )}
              {brew.water_temp_c && (
                <View style={s.secondaryPill}>
                  <Text style={s.secondaryLabel}>Temp</Text>
                  <Text style={s.secondaryValue}>{brew.water_temp_c}°C</Text>
                </View>
              )}
              {isEspresso && brew.time_s && brew.yield_g && (
                <View style={s.secondaryPill}>
                  <Text style={s.secondaryLabel}>Flow</Text>
                  <Text style={s.secondaryValue}>
                    {(brew.yield_g / brew.time_s).toFixed(1)} g/s
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Tasting section ─────────────────────────────────────── */}
        <View>
          <Text style={s.sectionTitle}>Tasting</Text>

          {/* Stars + descriptor */}
          <View style={s.tastingRow}>
            <Stars count={brew.rating ?? 4} />
            <Text style={s.tastingDescriptor}>
              {pos > 55 ? 'slightly bitter, needs coarser grind'
                : pos < 45 ? 'slightly sour, needs finer grind'
                : 'balanced, well extracted'}
            </Text>
          </View>

          {/* Notes paragraph */}
          {brew.personal_notes && (
            <View style={s.notesCard}>
              <Text style={s.notesText}>{brew.personal_notes}</Text>
            </View>
          )}

          {/* Taste meter */}
          <View style={s.tasteMeterCard}>
            <View style={s.tasteMeterTrack}>
              <View style={[s.tasteMeterFill, { width: `${pos}%` as any, backgroundColor: color }]} />
              <View style={[s.tasteMeterThumb, { left: `${pos}%` as any }]} />
            </View>
            <View style={s.tasteMeterRow}>
              <Text style={s.tastePole}>Sour</Text>
              <View style={[s.tasteBadge, { backgroundColor: color + '20' }]}>
                <Text style={[s.tasteBadgeText, { color }]}>{tasteLabel(pos)}</Text>
              </View>
              <Text style={s.tastePole}>Bitter</Text>
            </View>
          </View>

          {/* Flavour chips */}
          {brew.taste_notes && brew.taste_notes.length > 0 && (
            <View style={s.flavourChips}>
              {brew.taste_notes.map(n => (
                <View key={n} style={s.flavourChip}>
                  <Text style={s.flavourChipText}>{n}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Environment & kit section ────────────────────────────── */}
        <View>
          <Text style={s.sectionTitle}>Environment & kit</Text>
          <View style={s.kitGrid}>
            {DEFAULT_KIT.map(k => (
              <View key={k.label} style={s.kitCard}>
                <Text style={s.kitLabel}>{k.label}</Text>
                <Text style={s.kitValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTAs ────────────────────────────────────────────────── */}
        <View style={s.ctaRow}>
          <Pressable style={s.repeatBtn} onPress={handleRepeat}>
            <RotateCcw size={15} stroke="#FFF" strokeWidth={2} />
            <Text style={s.repeatBtnText}>Repeat recipe</Text>
          </Pressable>
          <Pressable style={s.shareBtn}>
            <Text style={s.shareBtnText}>Share</Text>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bgPrimary },

  // Header — flat, paper-2 (Direction A)
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  backBtn:  { padding: 4, marginTop: 2 },
  moreBtn:  { padding: 4, marginTop: 2 },
  breadcrumb:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  breadcrumbDot:   { width: 4, height: 4, borderRadius: 2 },
  breadcrumbText:  { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.15 },
  headerBeanName:  { fontFamily: fonts.serif, fontSize: 24, color: theme.colors.textPrimary, letterSpacing: -0.3, lineHeight: 27 },
  headerBeanOrigin:{ fontFamily: fonts.bodyItalic, fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },

  content: { padding: 16, gap: 18, paddingBottom: 40 },

  cardLabel: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18, marginBottom: 10 },

  // 4-col metrics — flat, ruled (Direction A)
  metricsCard:    { backgroundColor: theme.colors.bgSecondary, borderWidth: 1, borderColor: theme.colors.divider, padding: 16 },
  metricsGrid:    { flexDirection: 'row', alignItems: 'center' },
  metricCell:     { flex: 1, alignItems: 'center', paddingVertical: 6 },
  metricDivider:  { width: 1, height: 52, backgroundColor: theme.colors.divider },
  metricLabel:    { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18, marginBottom: 6 },
  metricValue:    { fontFamily: fonts.serif, fontSize: 28, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  metricUnit:     { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.textTertiary },
  secondaryRow:   { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  secondaryPill:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secondaryLabel: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.1 },
  secondaryValue: { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.textSecondary },

  // Tasting section
  sectionTitle:      { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary, marginBottom: 10 },
  tastingRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tastingDescriptor: { fontFamily: fonts.bodyItalic, fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  notesCard: {
    backgroundColor: theme.colors.bgSecondary,
    padding: 14, borderLeftWidth: 3, borderLeftColor: theme.colors.accent,
    borderWidth: 1, borderColor: theme.colors.divider, marginBottom: 10,
  },
  notesText: { fontFamily: fonts.bodyItalic, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 21 },
  tasteMeterCard: { backgroundColor: theme.colors.bgSecondary, borderWidth: 1, borderColor: theme.colors.divider, padding: 14, marginBottom: 10 },
  tasteMeterTrack: {
    height: 6, backgroundColor: theme.colors.divider,
    overflow: 'visible', position: 'relative', marginBottom: 10,
  },
  tasteMeterFill:  { height: 6 },
  tasteMeterThumb: {
    position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7,
    backgroundColor: theme.colors.bgPrimary, borderWidth: 2,
    borderColor: theme.colors.textPrimary, marginLeft: -7,
  },
  tasteMeterRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tastePole:      { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary },
  tasteBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  tasteBadgeText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '700' },
  flavourChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Direction A chips: hairline outline, italic serif (not solid fill)
  flavourChip:    { borderWidth: 1, borderColor: theme.colors.divider, paddingHorizontal: 9, paddingVertical: 3 },
  flavourChipText:{ fontFamily: fonts.bodyItalic, fontSize: 12, color: theme.colors.textSecondary },

  // Kit grid — 3×2 flat (Direction A)
  kitGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: theme.colors.divider },
  kitCard: {
    width: '50%',
    backgroundColor: theme.colors.bgSecondary,
    padding: 12, gap: 4,
    borderRightWidth: 1, borderRightColor: theme.colors.divider,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  kitLabel: { fontFamily: fonts.mono, fontSize: 8, color: theme.colors.textTertiary, letterSpacing: 0.18 },
  kitValue: { fontFamily: fonts.body, fontSize: 14, color: theme.colors.textPrimary },

  // CTAs — flat ink buttons (Direction A)
  ctaRow:        { flexDirection: 'row', gap: 8 },
  repeatBtn:     { flex: 2, height: 48, backgroundColor: theme.colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  repeatBtnText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', color: theme.colors.bgPrimary, letterSpacing: 0.18 },
  shareBtn:      { flex: 1, height: 48, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  shareBtnText:  { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 0.1 },
})
