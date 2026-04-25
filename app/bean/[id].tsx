import React, { useEffect, useState } from 'react'
import {
  View, Text, Pressable, ScrollView, Modal,
  StyleSheet, SafeAreaView, useWindowDimensions,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Zap, MoreHorizontal, X, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle as SvgCircle, Line as SvgLine, Circle } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Bean, Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { FlavorRadar } from '@/components/FlavorRadar'
import { ROAST_GRADIENT, DEFAULT_GRADIENT } from '@/components/BagArt'

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

function buildFlavor(brews: Brew[]) {
  if (!brews.length) return { fruit: 0.65, floral: 0.5, sweet: 0.6, body: 0.5, bitter: 0.35, acid: 0.7 }
  const avg = brews.reduce((s, b) => s + (b.taste_position ?? 50), 0) / brews.length
  const t   = avg / 100
  return {
    fruit:  Math.max(0.1, 1    - t * 0.55),
    floral: Math.max(0.1, 0.85 - t * 0.5),
    sweet:  Math.max(0.1, 0.5  + (0.5 - t) * 0.4),
    body:   Math.max(0.1, 0.35 + t * 0.55),
    bitter: Math.max(0.1, t    * 0.9),
    acid:   Math.max(0.1, 1    - t * 0.75),
  }
}

// ── DialMark cream (inline SVG for use on dark bg) ────────────────────────────
function DialMarkCream({ size = 22 }: { size?: number }) {
  const c = size / 2, r = c - 1
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SvgCircle cx={c} cy={c} r={r}        fill="none" stroke="rgba(255,240,210,0.9)" strokeWidth={1.4} />
      <SvgCircle cx={c} cy={c} r={r * 0.62} fill="none" stroke="rgba(255,240,210,0.9)" strokeWidth={1.0} opacity={0.55} />
      <SvgCircle cx={c} cy={c} r={r * 0.18} fill="rgba(255,240,210,0.9)" />
      <SvgLine x1={c} y1={1.5} x2={c} y2={c * 0.42}
        stroke={theme.colors.accentLight ?? '#D98C55'} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

// ── Scatter plot (x = brew index, y = taste proximity to balance) ─────────────
function ScatterPlot({ brews, width }: { brews: Brew[]; width: number }) {
  if (brews.length === 0) return null
  const H = 72, pad = 12
  const W = width - pad * 2

  return (
    <Svg width={width} height={H + 16}>
      {/* Baseline at y=50 (balance) */}
      <SvgLine
        x1={pad} y1={H / 2}
        x2={pad + W} y2={H / 2}
        stroke={theme.colors.divider}
        strokeDasharray="3 4"
      />
      {brews.slice(0, 12).reverse().map((b, i) => {
        const pos   = b.taste_position ?? 50
        const score = 100 - Math.abs(pos - 50) * 2
        const x     = pad + ((i + 0.5) / Math.min(brews.length, 12)) * W
        const y     = H - (score / 100) * (H - 8) - 4
        const r     = score > 80 ? 5 : 3.5
        return (
          <Circle
            key={b.id}
            cx={x} cy={y} r={r}
            fill={score > 80 ? theme.colors.accent : theme.colors.textTertiary}
            opacity={score > 80 ? 1 : 0.55}
          />
        )
      })}
    </Svg>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BeanDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>()
  const router    = useRouter()
  const { width } = useWindowDimensions()
  const { setBean, beans: storeBeans, recentBrews, isGuest, updateBeanLocally } = useStore()

  const [bean,  setLocalBean] = useState<Bean | null>(null)
  const [brews, setBrews]     = useState<Brew[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Bean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Always check local store first — works immediately for guest & recently added beans
    const storeBean = storeBeans.find(b => b.id === id)
    if (storeBean) setLocalBean(storeBean)

    if (isGuest) {
      // Guest mode: everything comes from the store
      setBrews(recentBrews.filter(b => b.bean_id === id))
    } else {
      // Authenticated: fetch fresh from Supabase (may overwrite store data with server data)
      supabase.from('beans').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) setLocalBean(data as Bean) })
      supabase.from('brews').select('*').eq('bean_id', id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setBrews(data as Brew[]) })
    }
  }, [id, storeBeans, recentBrews, isGuest])

  function handleDialIn() {
    if (!bean) return
    setBean(bean)
    router.push('/(tabs)/dial')
  }

  function openEdit() {
    if (!bean) return
    setEditForm({
      name:          bean.name,
      roaster:       bean.roaster ?? '',
      origin:        bean.origin ?? '',
      roast_level:   bean.roast_level ?? 'medium',
      roast_date:    bean.roast_date ?? '',
      notes:         bean.notes ?? '',
      grind_setting: bean.grind_setting ?? '',
    })
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!bean) return
    setSaving(true)
    const updated: Bean = { ...bean, ...editForm }
    setLocalBean(updated)
    updateBeanLocally(updated)
    if (!isGuest) {
      await supabase.from('beans').update({
        name:          updated.name,
        roaster:       updated.roaster,
        origin:        updated.origin,
        roast_level:   updated.roast_level,
        roast_date:    updated.roast_date || null,
        notes:         updated.notes,
        grind_setting: updated.grind_setting,
      }).eq('id', bean.id)
    }
    setSaving(false)
    setEditOpen(false)
  }

  const [colorDark, colorLight] = ROAST_GRADIENT[bean?.roast_level ?? 'medium'] ?? DEFAULT_GRADIENT
  const flavor   = buildFlavor(brews)
  const avgTaste = brews.length
    ? brews.reduce((s, b) => s + (b.taste_position ?? 50), 0) / brews.length
    : null
  const bestBrew = brews.reduce((best, b) => {
    if (!best) return b
    const s1 = 100 - Math.abs((b.taste_position    ?? 50) - 50) * 2
    const s2 = 100 - Math.abs((best.taste_position ?? 50) - 50) * 2
    return s1 > s2 ? b : best
  }, null as Brew | null)

  // Card is 440px wide max, padded from screen edge
  const cardWidth = Math.min(width - 44, 420)

  const noteChips = bean?.notes
    ? bean.notes.split(',').map(n => n.trim()).filter(Boolean).slice(0, 5)
    : []

  return (
    <SafeAreaView style={s.safe}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <Text style={s.topBarTitle} numberOfLines={1}>{bean?.name ?? 'Bean'}</Text>
        <Pressable style={s.moreBtn} hitSlop={8} onPress={openEdit}>
          <MoreHorizontal size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Trading card — 3:4 aspect ratio ────────────────────── */}
        <LinearGradient
          colors={[colorDark, colorLight]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[s.card, { width: cardWidth, aspectRatio: 3/4 }]}
        >
          {/* Grain overlay */}
          <View style={s.cardGrain} />
          {/* Inner cream frame */}
          <View style={s.cardFrame} />

          {/* Header row: edition + DialMark */}
          <View style={s.cardHeader}>
            <Text style={s.cardEdition}>
              ED. 01 · N°{String((parseInt(id.slice(-3), 16) % 99) + 1).padStart(2, '0')}
            </Text>
            <DialMarkCream size={22} />
          </View>

          {/* Name + origin */}
          <Text style={s.cardName}>{bean?.name ?? '…'}</Text>
          <Text style={s.cardOrigin} numberOfLines={1}>
            {[bean?.origin?.split(',')[0], bean?.roaster].filter(Boolean).join(' · ')}
          </Text>

          {/* Flavor radar — centered, 200px */}
          <View style={s.radarWrap}>
            <FlavorRadar flavor={flavor} size={Math.min(200, cardWidth - 44)} darkMode />
          </View>

          {/* Note chips — cream bg, rounded */}
          {noteChips.length > 0 && (
            <View style={s.chips}>
              {noteChips.map(n => (
                <View key={n} style={s.chip}>
                  <Text style={s.chipText}>{n}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 4-col metadata grid — real bean fields */}
          <View style={s.metaGrid}>
            {[
              ['ROASTER',  bean?.roaster ?? '—'],
              ['ROAST',    bean?.roast_level?.replace('-', '–') ?? '—'],
              ['ORIGIN',   bean?.origin?.split(',')[0] ?? '—'],
              ['GRIND',    bean?.grind_setting ?? '—'],
            ].map(([k, v]) => (
              <View key={k} style={s.metaCell}>
                <Text style={s.metaKey}>{k}</Text>
                <Text style={s.metaVal} numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Dial history section ────────────────────────────────── */}
        <View style={s.historyCard}>
          <View style={s.historyHeader}>
            <Text style={s.historyTitle}>Dial history</Text>
            <Text style={s.historyCount}>{brews.length} pull{brews.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Stat trio: Best / Sweet spot / Pulls */}
          <View style={s.statTrio}>
            {[
              { label: 'Best',       value: bestBrew ? `${brews.length === 1 ? '1st' : '★'} · ${bestBrew.time_s ?? '—'}s` : '—' },
              { label: 'Sweet spot', value: bestBrew?.grind_setting ? `G${bestBrew.grind_setting}` : '—' },
              { label: 'Pulls',      value: String(brews.length) },
            ].map((st, i) => (
              <React.Fragment key={st.label}>
                {i > 0 && <View style={s.trioDivider} />}
                <View style={s.trioCell}>
                  <Text style={s.trioLabel}>{st.label}</Text>
                  <Text style={s.trioValue}>{st.value}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Scatter plot */}
          {brews.length > 0 && (
            <>
              <ScatterPlot brews={brews} width={cardWidth - 32} />
              <View style={s.scatterAxis}>
                <Text style={s.scatterLabel}>Oldest</Text>
                <Text style={s.scatterLabel}>← session →</Text>
                <Text style={s.scatterLabel}>Latest</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Stats strip ─────────────────────────────────────────── */}
        <View style={s.statsStrip}>
          <View style={s.statsCell}>
            <Text style={s.statsVal}>{brews.length}</Text>
            <Text style={s.statsLbl}>BREWS</Text>
          </View>
          {avgTaste != null && (
            <>
              <View style={s.statsDivider} />
              <View style={s.statsCell}>
                <Text style={[s.statsVal, { color: tasteColor(avgTaste) }]}>
                  {avgTaste.toFixed(0)}
                </Text>
                <Text style={s.statsLbl}>AVG TASTE</Text>
              </View>
            </>
          )}
          {bean?.grind_setting && (
            <>
              <View style={s.statsDivider} />
              <View style={s.statsCell}>
                <Text style={s.statsVal}>{bean.grind_setting}</Text>
                <Text style={s.statsLbl}>GRIND</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Dial In CTA ─────────────────────────────────────────── */}
        <Pressable style={s.dialBtn} onPress={handleDialIn}>
          <Zap size={17} stroke="#FFF" fill="#FFF" />
          <Text style={s.dialBtnText}>Dial In This Bean</Text>
        </Pressable>

        {/* ── Brew history list ────────────────────────────────────── */}
        {brews.length > 0 && (
          <View>
            <Text style={s.brewHistoryTitle}>Brew history</Text>
            <View style={s.brewList}>
              {brews.map((brew, index) => {
                const pos   = brew.taste_position ?? 50
                const color = tasteColor(pos)
                const date  = brew.created_at
                  ? new Date(brew.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : ''
                return (
                  <Pressable
                    key={brew.id}
                    style={s.brewRow}
                    onPress={() => router.push(`/brew/${brew.id}`)}
                  >
                    <View style={[s.brewStripe, { backgroundColor: color }]} />
                    <View style={[s.brewNumBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[s.brewNum, { color }]}>#{brews.length - index}</Text>
                    </View>
                    <View style={s.brewInfo}>
                      <Text style={s.brewMethod}>{METHOD_LABELS[brew.method] ?? brew.method}</Text>
                      <View style={s.brewParams}>
                        {brew.dose_g  ? <Text style={s.brewParam}>{brew.dose_g}g</Text>  : null}
                        {brew.time_s  ? <Text style={s.brewParam}>· {brew.time_s}s</Text> : null}
                        {brew.yield_g ? <Text style={s.brewParam}>· {brew.yield_g}g out</Text> : null}
                      </View>
                      {date ? <Text style={s.brewDate}>{date}</Text> : null}
                    </View>
                    <View style={[s.tastePill, { backgroundColor: color + '20' }]}>
                      <Text style={[s.tastePillText, { color }]}>{pos}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Edit Bean Modal ─────────────────────────────────────── */}
      <Modal visible={editOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.modalOverlay} onPress={() => setEditOpen(false)} />
          <View style={s.editSheet}>
            {/* Sheet header */}
            <View style={s.editHeader}>
              <Text style={s.editTitle}>Edit Bean</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setEditOpen(false)} style={s.editIconBtn} hitSlop={8}>
                  <X size={18} stroke={theme.colors.textSecondary} />
                </Pressable>
                <Pressable onPress={handleSaveEdit} style={[s.editIconBtn, s.editSaveBtn]} hitSlop={8}>
                  {saving
                    ? <Text style={s.editSaveBtnText}>…</Text>
                    : <Check size={16} stroke={theme.colors.bgPrimary} />
                  }
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={s.editContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {([
                { key: 'name',          label: 'BEAN NAME',    placeholder: 'e.g. Yirgacheffe Natural' },
                { key: 'roaster',       label: 'ROASTER',      placeholder: 'e.g. Square Mile' },
                { key: 'origin',        label: 'ORIGIN',       placeholder: 'e.g. Ethiopia, Sidamo' },
                { key: 'grind_setting', label: 'GRIND SETTING',placeholder: 'e.g. 14' },
                { key: 'roast_date',    label: 'ROAST DATE',   placeholder: 'YYYY-MM-DD' },
                { key: 'notes',         label: 'TASTING NOTES',placeholder: 'e.g. blueberry, jasmine, honey' },
              ] as const).map(field => (
                <View key={field.key} style={s.editField}>
                  <Text style={s.editFieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[s.editInput, field.key === 'notes' && s.editInputMulti]}
                    value={(editForm as any)[field.key] ?? ''}
                    onChangeText={v => setEditForm(f => ({ ...f, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    multiline={field.key === 'notes'}
                    numberOfLines={field.key === 'notes' ? 3 : 1}
                  />
                </View>
              ))}

              {/* Roast level selector */}
              <View style={s.editField}>
                <Text style={s.editFieldLabel}>ROAST LEVEL</Text>
                <View style={s.roastRow}>
                  {(['light', 'medium', 'medium-dark', 'dark'] as const).map(r => (
                    <Pressable
                      key={r}
                      style={[s.roastChip, editForm.roast_level === r && s.roastChipActive]}
                      onPress={() => setEditForm(f => ({ ...f, roast_level: r }))}
                    >
                      <Text style={[s.roastChipText, editForm.roast_level === r && s.roastChipTextActive]}>
                        {r.replace('-', '‑')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bgPrimary },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  backBtn:     { padding: 4 },
  topBarTitle: { fontFamily: fonts.serif, fontSize: 17, color: theme.colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  moreBtn:     { padding: 4 },

  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40, gap: 14, alignItems: 'center' },

  // Trading card — keep gradient + shadow (signature component, same both directions)
  card: {
    borderRadius: 6,    // Direction A: 6px bean card radius
    padding:      22,
    overflow:     'hidden',
    position:     'relative',
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius:  20,
    elevation:     10,
  },
  cardGrain: {
    position:        'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius:    18,
    pointerEvents:   'none',
  } as any,
  cardFrame: {
    position:    'absolute', top: 10, left: 10, right: 10, bottom: 10,
    borderRadius: 12, borderWidth: 1,
    borderColor:  'rgba(255,240,210,0.32)',
    pointerEvents:'none',
  } as any,
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardEdition: { fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,240,210,0.72)', letterSpacing: 0.25 },
  cardName:    { fontFamily: fonts.serif, fontSize: 28, color: '#FEF2DC', letterSpacing: -0.5, lineHeight: 30, marginBottom: 4 },
  cardOrigin:  { fontFamily: fonts.mono, fontSize: 11, color: 'rgba(254,242,220,0.70)', marginBottom: 12 },
  radarWrap:   { alignItems: 'center', marginVertical: 4 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: 8 },
  chip: {
    backgroundColor: 'rgba(255,240,210,0.14)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,240,210,0.3)',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  chipText:  { fontSize: 11, color: 'rgba(254,242,220,0.88)' },
  metaGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  metaCell:  { width: '50%', paddingTop: 8, paddingRight: 8 },
  metaKey:   { fontFamily: fonts.mono, fontSize: 8, color: 'rgba(255,240,210,0.55)', letterSpacing: 0.2, marginBottom: 2 },
  metaVal:   { fontFamily: fonts.mono, fontSize: 13, color: 'rgba(254,242,220,0.92)', fontWeight: '500' },

  // Dial history card
  // Dial history card — flat, ruled (Direction A)
  historyCard: {
    width: '100%',
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, borderColor: theme.colors.divider,
    padding: 16,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  historyTitle:  { fontFamily: fonts.serif, fontSize: 18, color: theme.colors.textPrimary },
  historyCount:  { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary },
  statTrio:      { flexDirection: 'row', marginBottom: 14 },
  trioCell:      { flex: 1, gap: 3 },
  trioDivider:   { width: 1, backgroundColor: theme.colors.divider, marginHorizontal: 12 },
  trioLabel:     { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.15 },
  trioValue:     { fontFamily: fonts.serif, fontSize: 17, color: theme.colors.textPrimary, letterSpacing: -0.3 },
  scatterAxis:   { flexDirection: 'row', justifyContent: 'space-between' },
  scatterLabel:  { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary },

  // Stats strip — flat (Direction A)
  statsStrip:   { width: '100%', backgroundColor: theme.colors.bgSecondary, borderWidth: 1, borderColor: theme.colors.divider, flexDirection: 'row', paddingVertical: 14 },
  statsCell:    { flex: 1, alignItems: 'center', gap: 2 },
  statsVal:     { fontFamily: fonts.serif, fontSize: 22, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  statsLbl:     { fontFamily: fonts.mono, fontSize: 8, color: theme.colors.textTertiary, letterSpacing: 1.2 },
  statsDivider: { width: 1, height: 28, backgroundColor: theme.colors.divider },

  // Dial In CTA — flat ink button (Direction A)
  dialBtn:    { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, backgroundColor: theme.colors.accent },
  dialBtnText:{ fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', color: theme.colors.bgPrimary, letterSpacing: 0.18 },

  // Brew history list — flat rows
  brewHistoryTitle: { fontFamily: fonts.serif, fontSize: 18, color: theme.colors.textPrimary, marginBottom: 8, alignSelf: 'flex-start' },
  brewList:         { width: '100%' },
  brewRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.bgSecondary,
    borderTopWidth: 1, borderTopColor: theme.colors.dividerSoft,
  },
  brewStripe:   { width: 3, alignSelf: 'stretch' },
  brewNumBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  brewNum:      { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700' },
  brewInfo:     { flex: 1, paddingVertical: 10 },
  brewMethod:   { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textPrimary },
  brewParams:   { flexDirection: 'row', gap: 4, marginTop: 2 },
  brewParam:    { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary },
  brewDate:     { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, marginTop: 2 },
  tastePill:    { paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: 8, borderWidth: 1 },
  tastePillText:{ fontFamily: fonts.mono, fontSize: 10, fontWeight: '700' },

  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  editSheet: {
    backgroundColor: theme.colors.bgPrimary,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
    maxHeight: '85%',
  },
  editHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.bgSecondary,
  },
  editTitle: { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary },
  editIconBtn: { padding: 6, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.bgPrimary },
  editSaveBtn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  editSaveBtnText: { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.bgPrimary },
  editContent: { padding: 20, gap: 16, paddingBottom: 40 },
  editField: { gap: 6 },
  editFieldLabel: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18 },
  editInput: {
    fontFamily: fonts.body, fontSize: 15, color: theme.colors.textPrimary,
    borderWidth: 1, borderColor: theme.colors.divider,
    backgroundColor: theme.colors.bgSecondary,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  editInputMulti: { height: 72, textAlignVertical: 'top' },
  roastRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roastChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: theme.colors.divider,
    backgroundColor: theme.colors.bgSecondary,
  },
  roastChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  roastChipText: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 0.1 },
  roastChipTextActive: { color: theme.colors.bgPrimary },
})
