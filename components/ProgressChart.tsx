import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg'
import { theme } from '@/constants/theme'

interface Props {
  trajectory: number[]   // taste values, chronological
  width?:     number
  height?:    number
}

export function ProgressChart({ trajectory, width = 300, height = 120 }: Props) {
  if (trajectory.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Log more brews to see your trajectory</Text>
      </View>
    )
  }

  const PAD   = { top: 12, bottom: 24, left: 8, right: 8 }
  const W     = width  - PAD.left - PAD.right
  const H     = height - PAD.top  - PAD.bottom
  const last8 = trajectory.slice(-8)
  const n     = last8.length

  function xPos(i: number) { return PAD.left + (i / (n - 1)) * W }
  function yPos(v: number) { return PAD.top  + ((100 - v) / 100) * H }

  // Build smooth SVG path
  const points = last8.map((v, i) => ({ x: xPos(i), y: yPos(v) }))
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i - 1].x + points[i].x) / 2
    d += ` C ${cp1x} ${points[i - 1].y} ${cp1x} ${points[i].y} ${points[i].x} ${points[i].y}`
  }

  // Color each point
  function pointColor(v: number) {
    if (v < 45)  return theme.colors.sour
    if (v > 55)  return theme.colors.bitter
    return theme.colors.balanced
  }

  // Balance line at y=50
  const balanceY = yPos(50)

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Balance guide */}
        <Line
          x1={PAD.left}      y1={balanceY}
          x2={width - PAD.right} y2={balanceY}
          stroke={theme.colors.balanced}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Trend line */}
        <Path
          d={d}
          stroke={theme.colors.accent}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, i) => (
          <React.Fragment key={i}>
            <Circle cx={pt.x} cy={pt.y} r={5}   fill={pointColor(last8[i])} />
            <Circle cx={pt.x} cy={pt.y} r={3}   fill="white" />
          </React.Fragment>
        ))}

        {/* Balance label */}
        <SvgText
          x={width - PAD.right - 2}
          y={balanceY - 4}
          fontSize="9"
          fill={theme.colors.balanced}
          textAnchor="end"
        >
          balanced
        </SvgText>
      </Svg>
    </View>
  )
}

// ── Improvement delta badge ───────────────────────────────────────────────────

interface DeltaProps {
  trajectory: number[]
}

export function ImprovementBadge({ trajectory }: DeltaProps) {
  if (trajectory.length < 2) return null

  const prev    = Math.abs(trajectory[trajectory.length - 2] - 50)
  const curr    = Math.abs(trajectory[trajectory.length - 1] - 50)
  const improved = curr < prev
  const pct      = Math.round(Math.abs(curr - prev))

  return (
    <View style={[styles.badge, { backgroundColor: improved ? theme.colors.balancedLight : theme.colors.sourLight }]}>
      <Text style={[styles.badgeText, { color: improved ? theme.colors.accentDark : theme.colors.sour }]}>
        {improved ? `↑ ${pct} closer` : `↓ ${pct} off`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  {},
  empty: {
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   theme.radius.md,
    backgroundColor: theme.colors.bgSecondary,
  },
  emptyText: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },
  badge: {
    alignSelf:       'flex-start',
    borderRadius:    theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical:    4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
})
