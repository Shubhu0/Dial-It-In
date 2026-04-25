import React from 'react'
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg'

interface FlavorValues {
  fruit?:  number
  floral?: number
  sweet?:  number
  body?:   number
  bitter?: number
  acid?:   number
}

interface Props {
  flavor:    FlavorValues
  size?:     number
  darkMode?: boolean
}

const AXES = [
  { key: 'fruit',  label: 'FRUIT'  },
  { key: 'floral', label: 'FLORAL' },
  { key: 'sweet',  label: 'SWEET'  },
  { key: 'body',   label: 'BODY'   },
  { key: 'bitter', label: 'BITTER' },
  { key: 'acid',   label: 'ACID'   },
]

export function FlavorRadar({ flavor, size = 200, darkMode = false }: Props) {
  const cx = size / 2
  const cy = size / 2
  const R  = size * 0.36
  const lR = size * 0.47

  const guideStroke = darkMode ? 'rgba(255,240,210,0.22)' : 'rgba(29,25,21,0.12)'
  const spokeStroke = darkMode ? 'rgba(255,240,210,0.18)' : 'rgba(29,25,21,0.10)'
  const fillColor   = darkMode ? 'rgba(255,240,210,0.32)' : 'rgba(179,98,42,0.16)'
  const fillStroke  = darkMode ? 'rgba(255,240,210,0.9)'  : '#B3622A'
  const labelFill   = darkMode ? 'rgba(255,240,210,0.75)' : '#8A8378'

  function pt(i: number, r: number) {
    const a = Math.PI * 2 * i / AXES.length - Math.PI / 2
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  }

  function hexPoints(r: number) {
    return AXES.map((_, i) => {
      const p = pt(i, r)
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    }).join(' ')
  }

  const dataPoints = AXES.map((a, i) => {
    const val = flavor[a.key as keyof FlavorValues] ?? 0.5
    const p   = pt(i, R * Math.max(0.05, Math.min(1, val)))
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ')

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Guide hexagons at 33%, 66%, 100% */}
      {[0.33, 0.66, 1].map(r => (
        <Polygon key={r} points={hexPoints(R * r)} fill="none" stroke={guideStroke} strokeWidth={1} />
      ))}

      {/* Axis spokes */}
      {AXES.map((_, i) => {
        const outer = pt(i, R)
        return <Line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke={spokeStroke} strokeWidth={1} />
      })}

      {/* Filled polygon */}
      <Polygon
        points={dataPoints}
        fill={fillColor}
        stroke={fillStroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />

      {/* Axis labels */}
      {AXES.map((a, i) => {
        const p = pt(i, lR)
        return (
          <SvgText
            key={a.key}
            x={p.x} y={p.y}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize={8}
            fontFamily="JetBrainsMono_400Regular"
            letterSpacing={1}
            fill={labelFill}
          >
            {a.label}
          </SvgText>
        )
      })}
    </Svg>
  )
}
