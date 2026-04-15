import React from 'react'
import { View, Text, StyleSheet, PanResponder } from 'react-native'
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { theme } from '@/constants/theme'

const CX = 120
const CY = 120
const R  = 94
const START_DEG = 135
const SWEEP_DEG = 270
const TRACK_W   = 11
const KNOB_R    = 15
const SIZE      = 240

function degToRad(d: number) { return (d * Math.PI) / 180 }

function polarToXY(deg: number) {
  return {
    x: CX + R * Math.cos(degToRad(deg)),
    y: CY + R * Math.sin(degToRad(deg)),
  }
}

function arcPath(startDeg: number, sweepDeg: number): string {
  const start   = polarToXY(startDeg)
  const end     = polarToXY(startDeg + sweepDeg)
  const large   = sweepDeg > 180 ? 1 : 0
  // Prevent degenerate path when sweep is ~360
  if (Math.abs(sweepDeg) >= 359.9) {
    const mid = polarToXY(startDeg + 180)
    return [
      `M ${start.x} ${start.y}`,
      `A ${R} ${R} 0 1 1 ${mid.x} ${mid.y}`,
      `A ${R} ${R} 0 1 1 ${start.x} ${start.y}`,
    ].join(' ')
  }
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`
}

function xyToPos(x: number, y: number): number {
  const dx = x - CX
  const dy = y - CY
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angle < 0) angle += 360
  let adj = angle - START_DEG
  if (adj < 0) adj += 360
  if (adj > SWEEP_DEG) {
    adj = (adj - SWEEP_DEG) < (360 - adj) ? SWEEP_DEG : 0
  }
  return Math.max(0, Math.min(100, (adj / SWEEP_DEG) * 100))
}

function interpolateColor(t: number): string {
  const sour   = [217, 124, 108]
  const bal    = [140, 186, 128]
  const bitter = [107, 79,  58]
  const [a, b, u] = t <= 0.5
    ? [sour,   bal,    t * 2]
    : [bal,    bitter, (t - 0.5) * 2]
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * u)
  return `rgb(${lerp(a[0], b[0])},${lerp(a[1], b[1])},${lerp(a[2], b[2])})`
}

function getZoneLabel(pos: number): string {
  if (pos <  20) return 'Very Sour'
  if (pos <  45) return 'Sour'
  if (pos <= 55) return 'Balanced'
  if (pos <= 80) return 'Bitter'
  return 'Very Bitter'
}

export function RadialTasteDial({ value, onChange }: { value: number; onChange: (pos: number) => void }) {
  const [currentPos, setCurrentPos] = React.useState(value)
  const posRef = React.useRef(value)

  function updatePos(newPos: number) {
    posRef.current = newPos
    setCurrentPos(newPos)
    onChange(newPos)
  }

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        const raw = xyToPos(locationX, locationY)
        const resistance = raw < 10 || raw > 90 ? 0.4 : 1
        const newPos = Math.max(0, Math.min(100,
          raw * resistance + posRef.current * (1 - resistance)
        ))
        updatePos(newPos)
      },
      onPanResponderRelease: () => {
        if (posRef.current >= 47 && posRef.current <= 53) {
          updatePos(50)
        }
      },
    })
  ).current

  const fillSweep   = (currentPos / 100) * SWEEP_DEG
  const fillColor   = interpolateColor(currentPos / 100)
  const knob        = polarToXY(START_DEG + (currentPos / 100) * SWEEP_DEG)
  const trackPath   = arcPath(START_DEG, SWEEP_DEG)
  // Only draw fill arc if there's something to draw
  const fillArcPath = fillSweep > 0.5 ? arcPath(START_DEG, fillSweep) : null

  return (
    <View style={styles.container}>
      <View style={styles.dialWrapper} {...panResponder.panHandlers}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0"   stopColor="rgb(217,124,108)" />
              <Stop offset="0.5" stopColor="rgb(140,186,128)" />
              <Stop offset="1"   stopColor="rgb(107,79,58)"   />
            </LinearGradient>
          </Defs>

          {/* Background track */}
          <Path
            d={trackPath}
            stroke={theme.colors.divider}
            strokeWidth={TRACK_W}
            strokeLinecap="round"
            fill="none"
          />

          {/* Filled portion */}
          {fillArcPath && (
            <Path
              d={fillArcPath}
              stroke={fillColor}
              strokeWidth={TRACK_W}
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Knob glow */}
          <Circle
            cx={knob.x}
            cy={knob.y}
            r={KNOB_R + 7}
            fill={fillColor}
            opacity={0.25}
          />
          {/* Knob */}
          <Circle cx={knob.x} cy={knob.y} r={KNOB_R} fill={fillColor} />
          <Circle cx={knob.x} cy={knob.y} r={KNOB_R} stroke="white" strokeWidth={2.5} fill="none" />
        </Svg>

        {/* Center label */}
        <View style={styles.centerText} pointerEvents="none">
          <Text style={[styles.zoneName, { color: fillColor }]}>{getZoneLabel(currentPos)}</Text>
          <Text style={styles.tasteLabel}>taste</Text>
        </View>
      </View>

      <View style={styles.zoneRow}>
        <Text style={[styles.zoneTag, currentPos < 45 && styles.zoneTagActive]}>Sour</Text>
        <Text style={[styles.zoneTag, currentPos >= 45 && currentPos <= 55 && styles.zoneTagActive]}>Balanced</Text>
        <Text style={[styles.zoneTag, currentPos > 55 && styles.zoneTagActive]}>Bitter</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { alignItems: 'center' },
  dialWrapper: { width: SIZE, height: SIZE },
  centerText: {
    position:       'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  zoneName:      { fontSize: 18, fontWeight: '700' },
  tasteLabel:    { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  zoneRow:       { flexDirection: 'row', width: SIZE, marginTop: 8 },
  zoneTag:       { flex: 1, fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },
  zoneTagActive: { color: theme.colors.textPrimary, fontWeight: '700' },
})
