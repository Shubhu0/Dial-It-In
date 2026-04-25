import React, { useState, useRef } from 'react'
import {
  View, Text, Pressable, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
  PanResponder,
} from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Circle as SvgCircle, Line as SvgLine, Path } from 'react-native-svg'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { MethodTabs } from '@/components/MethodTabs'
import { BrewSlider } from '@/components/BrewSlider'
import { LiveTipBox, SavedSuggestionBox } from '@/components/SuggestionBox'
import {
  getDialTip, getZone, getCoachingMessage,
  isOscillating, getBrewWarnings,
} from '@/lib/algorithms'
import { SuggestionChange } from '@/lib/types'
import { BagArt } from '@/components/BagArt'

// ── helpers ───────────────────────────────────────────────────────────────────

function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos > 55) return theme.colors.bitter
  return theme.colors.balanced
}

function zoneLabel(pos: number) {
  if (pos < 40) return 'Very sour'
  if (pos < 45) return 'Sour'
  if (pos <= 55) return 'Balanced'
  if (pos <= 60) return 'Bitter'
  return 'Very bitter'
}

// ── DialMark (Direction A logo) ───────────────────────────────────────────────
function DialMarkInline({ size = 20 }: { size?: number }) {
  const c = size / 2, r = c - 1
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SvgCircle cx={c} cy={c} r={r}        fill="none" stroke={theme.colors.textPrimary} strokeWidth={1.4} />
      <SvgCircle cx={c} cy={c} r={r * 0.62} fill="none" stroke={theme.colors.textPrimary} strokeWidth={1.0} opacity={0.55} />
      <SvgCircle cx={c} cy={c} r={r * 0.18} fill={theme.colors.textPrimary} />
      <SvgLine x1={c} y1={1.5} x2={c} y2={c * 0.42}
        stroke={theme.colors.accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// ── Interactive DialRing ──────────────────────────────────────────────────────
// User touches/drags anywhere on the ring area to set taste position (0-100).
// The arc fills clockwise from the top.

const RING_SIZE = 280
const CX = RING_SIZE / 2
const CY = RING_SIZE / 2
const R  = 110

function DialRing({
  position,
  onChange,
}: {
  position: number
  onChange: (v: number) => void
}) {
  const color = tasteColor(position)
  const C     = 2 * Math.PI * R
  const arc   = C * Math.min(position / 100, 1)

  // 36 ticks (every 3rd is longer) — sit outside the ring
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a     = (i / 36) * Math.PI * 2 - Math.PI / 2
    const isMaj = i % 3 === 0
    const r1 = R + 6, r2 = isMaj ? R + 15 : R + 10
    return {
      x1: CX + Math.cos(a) * r1, y1: CY + Math.sin(a) * r1,
      x2: CX + Math.cos(a) * r2, y2: CY + Math.sin(a) * r2,
      isMaj,
    }
  })

  // Touch → position math
  function posFromTouch(x: number, y: number): number {
    const dx = x - CX, dy = y - CY
    const dist = Math.sqrt(dx * dx + dy * dy)
    // Ignore touches very far from ring or in the dead centre
    if (dist < R * 0.3 || dist > R * 1.8) return position
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
    if (angle < 0) angle += 360
    // Snap to balanced at 50% (180°)
    const raw = Math.round(angle / 360 * 100)
    if (raw >= 47 && raw <= 53) return 50
    return Math.max(0, Math.min(100, raw))
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const v = posFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)
        onChange(v)
      },
      onPanResponderMove: (e) => {
        const v = posFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)
        onChange(v)
      },
    })
  ).current

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, position: 'relative' }} {...pan.panHandlers}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        {/* Guide circle */}
        <SvgCircle cx={CX} cy={CY} r={R} fill="none" stroke={theme.colors.divider} strokeWidth={2} />

        {/* Progress arc — clockwise from top */}
        <SvgCircle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${arc} ${C}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
        />

        {/* 36 tick marks */}
        {ticks.map((t, i) => (
          <SvgLine key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={theme.colors.textTertiary} strokeWidth={1}
            opacity={t.isMaj ? 0.4 : 0.15} />
        ))}
      </Svg>

      {/* Centre content */}
      <View style={dr.center} pointerEvents="none">
        <DialMarkInline size={20} />
        <Text style={dr.posNum}>{Math.round(position)}</Text>
        <Text style={[dr.zoneLbl, { color }]}>{zoneLabel(position)}</Text>
        <Text style={dr.hint}>drag to dial in</Text>
      </View>
    </View>
  )
}

const dr = StyleSheet.create({
  center:  { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
  posNum:  { fontFamily: fonts.serif, fontSize: 68, color: theme.colors.textPrimary, letterSpacing: -2, lineHeight: 72 },
  zoneLbl: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.1 },
  hint:    { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, marginTop: 4 },
})

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DialScreen() {
  const router = useRouter()
  const {
    selectedBean, selectedMethod,
    currentParams, lastSuggestion,
    recentBrews, userProfile,
    setMethod, updateParam, setTastePosition,
    saveBrew,
  } = useStore()

  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [showSaved,  setShowSaved]  = useState(false)
  const [showParams, setShowParams] = useState(false)

  const isEspresso = selectedMethod === 'espresso'
  const dialTip    = getDialTip(currentParams.taste_position, selectedMethod)
  const dialZone   = getZone(currentParams.taste_position)
  const coachMsg   = getCoachingMessage(currentParams.taste_position, userProfile)
  const beanBrews  = selectedBean ? recentBrews.filter(b => b.bean_id === selectedBean.id) : []
  const trajectory = beanBrews.map(b => b.taste_position ?? 50).reverse()
  const warnings   = getBrewWarnings(currentParams, selectedMethod)

  const ratio = isEspresso && currentParams.dose_g > 0
    ? `1:${(currentParams.yield_g / currentParams.dose_g).toFixed(1)}`
    : undefined

  function handleApplyChanges(changes: SuggestionChange[]) {
    changes.forEach(c => {
      const num = parseFloat(c.to)
      updateParam(c.param as Parameters<typeof updateParam>[0], isNaN(num) ? c.to : num)
    })
  }

  async function handleSave() {
    setSaving(true); setSaveError(null); setShowSaved(true)
    try   { await saveBrew() }
    catch (e: any) { setSaveError(e?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Paper grain */}
      <View style={s.grain} pointerEvents="none" />

      {/* ── Top strip ────────────────────────────────────────────────── */}
      <View style={s.topStrip}>
        {selectedBean && (
          <BagArt roastLevel={selectedBean.roast_level} roasterName={selectedBean.roaster} width={32} height={42} borderRadius={2} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.stripBean} numberOfLines={1}>
            {selectedBean
              ? `${selectedBean.name}${selectedBean.roaster ? ' · ' + selectedBean.roaster : ''}`
              : 'No bean selected — go to Home first'}
          </Text>
          {ratio && <Text style={s.stripRatio}>{ratio}</Text>}
        </View>
        <Pressable style={s.cancelChip} onPress={() => router.back()}>
          <Text style={s.cancelText}>✕ CANCEL</Text>
        </Pressable>
      </View>
      <View style={s.hairline} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Method tabs */}
        <MethodTabs selected={selectedMethod} onSelect={setMethod} />

        {/* ── Interactive DialRing — centrepiece ───────────────────── */}
        <View style={s.ringSection}>
          <Text style={s.sectionHeader}>TASTE DIAL · drag the ring to set where this brew lands</Text>
          <View style={s.ringWrap}>
            <DialRing position={currentParams.taste_position} onChange={setTastePosition} />
          </View>
        </View>

        {/* ── Live metrics ─────────────────────────────────────────── */}
        <View style={s.metricsCard}>
          {[
            { label: 'YIELD', value: currentParams.yield_g,  unit: 'g' },
            { label: 'DOSE',  value: currentParams.dose_g,   unit: 'g' },
            { label: 'TIME',  value: currentParams.time_s,   unit: 's' },
          ].map((m, i) => (
            <React.Fragment key={m.label}>
              {i > 0 && <View style={s.metricDivider} />}
              <View style={s.metricCell}>
                <Text style={s.metricLabel}>{m.label}</Text>
                <Text style={s.metricVal}>{m.value}<Text style={s.metricUnit}>{m.unit}</Text></Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Parameters — collapsible ─────────────────────────────── */}
        <Pressable style={s.paramsToggle} onPress={() => setShowParams(p => !p)}>
          <Text style={s.paramsToggleText}>
            {showParams ? '▲ HIDE PARAMETERS' : '▼ ADJUST PARAMETERS'}
          </Text>
        </Pressable>

        {showParams && (
          <View style={s.paramsCard}>
            <BrewSlider label="Dose" value={currentParams.dose_g} min={12} max={22} step={0.5} unit="g" description="Ground coffee" onChangeEnd={v => updateParam('dose_g', v)} />
            {isEspresso ? (
              <>
                <View style={s.sliderDivider} />
                <BrewSlider label="Yield" value={currentParams.yield_g} min={20} max={60} step={1} unit="g" badge={ratio} description="Liquid output" onChangeEnd={v => updateParam('yield_g', v)} />
                <View style={s.sliderDivider} />
                <BrewSlider label="Time" value={currentParams.time_s} min={18} max={50} step={1} unit="s" description="Shot pull time" onChangeEnd={v => updateParam('time_s', v)} />
              </>
            ) : (
              <>
                <View style={s.sliderDivider} />
                <BrewSlider label="Water" value={currentParams.water_g ?? 250} min={150} max={400} step={10} unit="g" description="Total water" onChangeEnd={v => updateParam('water_g', v)} />
                <View style={s.sliderDivider} />
                <BrewSlider label="Brew time" value={currentParams.brew_time_s ?? 180} min={60} max={480} step={15} unit="s" description="Extraction time" onChangeEnd={v => updateParam('brew_time_s', v)} />
              </>
            )}
          </View>
        )}

        {/* ── Oscillation warnings ─────────────────────────────────── */}
        {(isOscillating(trajectory) || warnings.length > 0) && (
          <View style={s.warnings}>
            {isOscillating(trajectory) && (
              <Text style={s.warningText}>⚡ You've been oscillating — try a smaller adjustment this time</Text>
            )}
            {warnings.map((w, i) => <Text key={i} style={s.warningText}>⚠️ {w}</Text>)}
          </View>
        )}

        {/* ── Coaching nudge — dashed accent border (Direction A) ──── */}
        {coachMsg && (
          <View style={s.nudgeCard}>
            <View style={s.nudgeHeader}>
              <Text style={s.nudgeSpark}>✦</Text>
              <Text style={s.nudgeLabel}>DIAL-IN NUDGE</Text>
            </View>
            <Text style={s.nudgeBody}>{coachMsg}</Text>
          </View>
        )}

        {/* Live tip */}
        <LiveTipBox tip={dialTip} zone={dialZone} />

        {/* AI suggestion after save */}
        {showSaved && (
          <SavedSuggestionBox suggestion={saving ? null : lastSuggestion} loading={saving} onApply={handleApplyChanges} />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View style={s.hairline} />
      <View style={s.footer}>
        {saveError && <Text style={s.saveError}>{saveError}</Text>}
        {!selectedBean && <Text style={s.saveHint}>Select a bean on Home first</Text>}
        <View style={s.footerBtns}>
          <Pressable style={s.discardBtn} onPress={() => router.back()}>
            <Text style={s.discardText}>DISCARD</Text>
          </Pressable>
          <Pressable
            style={[s.logBtn, (saving || !selectedBean) && s.logBtnDisabled]}
            onPress={handleSave}
            disabled={saving || !selectedBean}
          >
            {saving
              ? <ActivityIndicator color={theme.colors.bgPrimary} />
              : <Text style={s.logBtnText}>STOP & LOG →</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.colors.bgPrimary },
  grain: { position: 'absolute', inset: 0, backgroundColor: 'rgba(90,60,20,0.025)', pointerEvents: 'none' } as any,

  // Top strip
  topStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 22, paddingVertical: 10,
    backgroundColor: theme.colors.bgSecondary,
  },
  stripBean:  { fontFamily: fonts.serif, fontSize: 14, color: theme.colors.textPrimary },
  stripRatio: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary },
  cancelChip: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.divider },
  cancelText: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textSecondary, letterSpacing: 0.18 },
  hairline:   { height: 1, backgroundColor: theme.colors.divider },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, gap: 16, alignItems: 'center' },

  // Ring section
  ringSection: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  sectionHeader: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18, textAlign: 'center' },
  ringWrap: {},

  // Metrics card — flat, ruled
  metricsCard: {
    flexDirection: 'row', alignSelf: 'stretch',
    borderWidth: 1, borderColor: theme.colors.divider,
    backgroundColor: theme.colors.bgSecondary,
  },
  metricCell:    { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  metricDivider: { width: 1, backgroundColor: theme.colors.divider },
  metricLabel:   { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.2 },
  metricVal:     { fontFamily: fonts.serif, fontSize: 22, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  metricUnit:    { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.textTertiary },

  // Params toggle
  paramsToggle: { alignSelf: 'stretch' },
  paramsToggleText: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.accentDark, letterSpacing: 0.18, textAlign: 'center' },
  paramsCard: {
    alignSelf: 'stretch',
    borderWidth: 1, borderColor: theme.colors.divider,
    backgroundColor: theme.colors.bgSecondary,
    padding: 16,
  },
  sliderDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 10 },

  // Warnings
  warnings:    { alignSelf: 'stretch', gap: 6 },
  warningText: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.error, lineHeight: 16 },

  // Nudge card — dashed border (Direction A spec)
  nudgeCard: {
    alignSelf: 'stretch',
    borderWidth: 1.5, borderColor: theme.colors.accent, borderStyle: 'dashed',
    padding: 14, backgroundColor: 'rgba(168,74,31,0.04)',
  },
  nudgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  nudgeSpark:  { fontSize: 12, color: theme.colors.accent },
  nudgeLabel:  { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.accent, letterSpacing: 0.2 },
  nudgeBody:   { fontFamily: fonts.bodyItalic, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },

  // Footer
  footer: {
    paddingHorizontal: 22, paddingBottom: 24, paddingTop: 12,
    backgroundColor: theme.colors.bgSecondary, gap: 8,
  },
  footerBtns:  { flexDirection: 'row', gap: 10 },
  discardBtn: {
    flex: 1, height: 48, borderWidth: 1, borderColor: theme.colors.divider,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.bgPrimary,
  },
  discardText: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textSecondary, letterSpacing: 0.18 },
  logBtn: {
    flex: 2, height: 48, backgroundColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  logBtnDisabled: { backgroundColor: theme.colors.divider },
  logBtnText:     { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.18 },
  saveError:      { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.error, textAlign: 'center' },
  saveHint:       { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' },
})
