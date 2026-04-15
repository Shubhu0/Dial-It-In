import React, { useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, Platform, PanResponder } from 'react-native'
import Svg, { Path, Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { theme } from '@/constants/theme'
import { getZoneLabel } from '@/lib/algorithms'

// ── Geometry constants ────────────────────────────────────────────────────────
const SIZE      = 280
const CX        = SIZE / 2
const CY        = SIZE / 2
const R         = 108
const TRACK_W   = 14
const KNOB_R    = 18
const START_DEG = 135
const SWEEP_DEG = 270

// ── Math helpers ──────────────────────────────────────────────────────────────
const toRad = (d: number) => (d * Math.PI) / 180

function polar(deg: number) {
  return {
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  }
}

function arcPath(startDeg: number, sweepDeg: number): string {
  if (sweepDeg <= 0.2) return ''
  const s = polar(startDeg)
  const e = polar(startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`
}

function touchToValue(touchX: number, touchY: number): number {
  const dx    = touchX - CX
  const dy    = touchY - CY
  let angle   = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angle < 0) angle += 360

  // Map angle → position within arc (135°→405°)
  let adj = angle - START_DEG
  if (adj < 0) adj += 360

  if (adj > SWEEP_DEG) {
    // In dead zone — clamp to nearest endpoint
    adj = (adj - SWEEP_DEG) < (360 - adj) ? SWEEP_DEG : 0
  }
  return Math.max(0, Math.min(100, (adj / SWEEP_DEG) * 100))
}

function valueToAngle(value: number): number {
  return START_DEG + (value / 100) * SWEEP_DEG
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function lerpColor(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bv = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bv})`
}

function tasteColor(pos: number): string {
  const sour    = [217, 124, 108]
  const balanced = [140, 186, 128]
  const bitter  = [198, 138,  58]
  const t       = pos / 100
  if (t <= 0.5) return lerpColor(sour,     balanced, t * 2)
  return              lerpColor(balanced,  bitter,   (t - 0.5) * 2)
}

// Zone tick positions
const ZONE_TICKS = [
  { value: 0,   label: '' },
  { value: 25,  label: 'Sour' },
  { value: 50,  label: '' },
  { value: 75,  label: 'Bitter' },
  { value: 100, label: '' },
]

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  value:    number
  onChange: (pos: number) => void
}

export function RadialTasteDial({ value, onChange }: Props) {
  // JS-side state for rendering SVG
  const [displayValue, setDisplayValue] = React.useState(value)
  const posRef = React.useRef(value)

  // Reanimated values for knob animations
  const knobScale  = useSharedValue(1)
  const glowOpacity = useSharedValue(0.3)
  const snapPulse  = useSharedValue(0)

  // Sync prop changes
  useEffect(() => {
    posRef.current = value
    setDisplayValue(value)
  }, [value])

  const commit = useCallback((v: number) => {
    posRef.current = v
    setDisplayValue(v)
    onChange(v)
  }, [onChange])

  // Magnetic snap to 50
  const snapCheck = useCallback((v: number) => {
    if (v >= 46 && v <= 54) {
      commit(50)
      snapPulse.value = withSpring(1, { damping: 4, stiffness: 300 }, () => {
        snapPulse.value = withTiming(0, { duration: 400 })
      })
    }
  }, [commit, snapPulse])

  // ── Gesture ────────────────────────────────────────────────────────────────
  // Use PanResponder on web (pointer events issue with gesture-handler in some
  // Expo web builds), gesture-handler on native.
  const useNativeGesture = Platform.OS !== 'web'

  // Native: react-native-gesture-handler
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet'
      knobScale.value   = withSpring(1.2, { damping: 10, stiffness: 300 })
      glowOpacity.value = withTiming(0.6, { duration: 150 })
    })
    .onUpdate((e) => {
      'worklet'
      const v = touchToValue(e.x, e.y)
      runOnJS(commit)(v)
    })
    .onEnd(() => {
      'worklet'
      knobScale.value   = withSpring(1,   { damping: 10, stiffness: 300 })
      glowOpacity.value = withTiming(0.3, { duration: 300 })
      runOnJS(snapCheck)(posRef.current)
    })

  // Web: PanResponder fallback
  const webPan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        knobScale.value   = withSpring(1.2, { damping: 10, stiffness: 300 })
        glowOpacity.value = withTiming(0.6, { duration: 150 })
      },
      onPanResponderMove: (_evt: any, gs: any) => {
        // locationX/Y relative to the view origin
        const v = touchToValue(
          _evt.nativeEvent.locationX,
          _evt.nativeEvent.locationY,
        )
        commit(v)
      },
      onPanResponderRelease: () => {
        knobScale.value   = withSpring(1,   { damping: 10, stiffness: 300 })
        glowOpacity.value = withTiming(0.3, { duration: 300 })
        snapCheck(posRef.current)
      },
    })
  ).current

  // ── Animated styles ────────────────────────────────────────────────────────
  const knobAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: knobScale.value }],
  }))

  const snapRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(snapPulse.value, [0, 0.5, 1], [0, 0.8, 0], Extrapolation.CLAMP),
    transform: [{
      scale: interpolate(snapPulse.value, [0, 1], [1, 1.6], Extrapolation.CLAMP),
    }],
  }))

  // ── Derived values ─────────────────────────────────────────────────────────
  const fillSweep   = Math.max(0.5, (displayValue / 100) * SWEEP_DEG)
  const fillColor   = tasteColor(displayValue)
  const knobAngle   = valueToAngle(displayValue)
  const knobPos     = polar(knobAngle)
  const trackPath   = arcPath(START_DEG, SWEEP_DEG)
  const fillPath    = arcPath(START_DEG, fillSweep)
  const isBalanced  = displayValue >= 46 && displayValue <= 54

  // ── Render ─────────────────────────────────────────────────────────────────
  const dialContent = (
    <View style={styles.dialWrapper}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={fillColor} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={fillColor} stopOpacity="0"   />
          </RadialGradient>
        </Defs>

        {/* Subtle background glow when balanced */}
        {isBalanced && (
          <Circle cx={CX} cy={CY} r={R - 10} fill="url(#glow)" />
        )}

        {/* Track */}
        <Path
          d={trackPath}
          stroke={theme.colors.divider}
          strokeWidth={TRACK_W}
          strokeLinecap="round"
          fill="none"
        />

        {/* Active fill */}
        {fillPath ? (
          <Path
            d={fillPath}
            stroke={fillColor}
            strokeWidth={TRACK_W}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}

        {/* Zone tick marks */}
        {ZONE_TICKS.map(({ value: v }) => {
          const tickAngle = valueToAngle(v)
          const inner = { x: CX + (R - TRACK_W / 2 - 2) * Math.cos(toRad(tickAngle)), y: CY + (R - TRACK_W / 2 - 2) * Math.sin(toRad(tickAngle)) }
          const outer = { x: CX + (R + TRACK_W / 2 + 2) * Math.cos(toRad(tickAngle)), y: CY + (R + TRACK_W / 2 + 2) * Math.sin(toRad(tickAngle)) }
          return (
            <Path
              key={v}
              d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
              stroke={theme.colors.bgSecondary}
              strokeWidth={2}
            />
          )
        })}

        {/* Knob glow ring */}
        <Circle
          cx={knobPos.x}
          cy={knobPos.y}
          r={KNOB_R + 10}
          fill={fillColor}
          opacity={0.22}
        />

        {/* Knob */}
        <Circle cx={knobPos.x} cy={knobPos.y} r={KNOB_R}    fill={fillColor} />
        <Circle cx={knobPos.x} cy={knobPos.y} r={KNOB_R - 5} fill="white" opacity={0.9} />
        <Circle cx={knobPos.x} cy={knobPos.y} r={KNOB_R}    stroke="white" strokeWidth={2.5} fill="none" />
      </Svg>

      {/* Center label */}
      <View style={styles.centerLabel} pointerEvents="none">
        {isBalanced ? (
          <>
            <Text style={[styles.zoneText, { color: theme.colors.balanced, fontSize: 22 }]}>✓</Text>
            <Text style={[styles.zoneText, { color: theme.colors.balanced }]}>Balanced</Text>
          </>
        ) : (
          <>
            <Text style={[styles.zoneText, { color: fillColor }]}>
              {getZoneLabel(displayValue)}
            </Text>
            <Text style={styles.posText}>{Math.round(displayValue)}</Text>
          </>
        )}
        <Text style={styles.tasteLabel}>taste</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Zone labels */}
      <View style={styles.topLabel}>
        {displayValue >= 46 && displayValue <= 54 && (
          <Text style={[styles.snapHint, { color: theme.colors.balanced }]}>snap ✓</Text>
        )}
      </View>

      {useNativeGesture ? (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={knobAnimStyle}>
            {dialContent}
          </Animated.View>
        </GestureDetector>
      ) : (
        <Animated.View style={knobAnimStyle} {...webPan.panHandlers}>
          {dialContent}
        </Animated.View>
      )}

      {/* Bottom zone tags */}
      <View style={styles.zoneRow}>
        <View style={[styles.zoneTag, displayValue < 45 && styles.zoneTagActive]}>
          <Text style={[styles.zoneTagText, displayValue < 45 && { color: theme.colors.sour }]}>
            Sour
          </Text>
        </View>
        <View style={[styles.zoneTag, isBalanced && styles.zoneTagActive]}>
          <Text style={[styles.zoneTagText, isBalanced && { color: theme.colors.balanced }]}>
            Balanced
          </Text>
        </View>
        <View style={[styles.zoneTag, displayValue > 55 && styles.zoneTagActive]}>
          <Text style={[styles.zoneTagText, displayValue > 55 && { color: theme.colors.bitter }]}>
            Bitter
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { alignItems: 'center', paddingVertical: 4 },
  topLabel:   { height: 20, justifyContent: 'center' },
  snapHint:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  dialWrapper: { width: SIZE, height: SIZE },
  centerLabel: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  zoneText:   { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  posText:    { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, lineHeight: 32 },
  tasteLabel: { fontSize: 11, color: theme.colors.textSecondary, letterSpacing: 0.8, marginTop: 2 },
  zoneRow:    {
    flexDirection:  'row',
    width:          SIZE,
    justifyContent: 'space-between',
    marginTop:      4,
    paddingHorizontal: 12,
  },
  zoneTag:     { flex: 1, alignItems: 'center', paddingVertical: 4 },
  zoneTagActive: {},
  zoneTagText: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '500' },
})
