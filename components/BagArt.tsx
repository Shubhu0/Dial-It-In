import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { fonts } from '@/constants/fonts'

// Bean roast level → gradient colors (from tokens.md bean palette)
export const ROAST_GRADIENT: Record<string, [string, string]> = {
  light:         ['#6B3A1A', '#D48442'],
  medium:        ['#6B2C16', '#C35A2F'],
  'medium-dark': ['#4A1E0E', '#8A3A1C'],
  dark:          ['#2B140A', '#5A2A0C'],
}

export const DEFAULT_GRADIENT: [string, string] = ['#6B2C16', '#C35A2F']

interface BagArtProps {
  roastLevel?: string
  roasterName?: string
  width?:       number
  height?:      number
  borderRadius?: number
}

export function BagArt({
  roastLevel,
  roasterName,
  width        = 72,
  height       = 94,
  borderRadius = 8,
}: BagArtProps) {
  const [colorDark, colorLight] = ROAST_GRADIENT[roastLevel ?? 'medium'] ?? DEFAULT_GRADIENT

  return (
    <LinearGradient
      colors={[colorDark, colorLight]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[
        s.bag,
        { width, height, borderRadius },
      ]}
    >
      {/* Right-side inset shadow (simulates the bag's 3D depth) */}
      <View style={s.insetShadow} />
      {/* Inner cream frame */}
      <View style={[s.innerFrame, { borderRadius: borderRadius - 3 }]} />
      {/* Roaster name at bottom */}
      {roasterName ? (
        <Text style={s.roasterText} numberOfLines={1}>
          {roasterName.toUpperCase().slice(0, 6)}
        </Text>
      ) : null}
    </LinearGradient>
  )
}

const s = StyleSheet.create({
  bag: {
    flexShrink:      0,
    overflow:        'hidden',
    position:        'relative',
    justifyContent:  'flex-end',
    paddingBottom:   8,
    paddingHorizontal: 5,
  },
  insetShadow: {
    position:        'absolute',
    top:             0,
    right:           0,
    bottom:          0,
    width:           '35%',
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  innerFrame: {
    position:    'absolute',
    top:         7,
    left:        6,
    right:       6,
    bottom:      7,
    borderWidth: 1,
    borderColor: 'rgba(255,240,210,0.35)',
  },
  roasterText: {
    fontFamily:    fonts.mono,
    fontSize:      7,
    color:         'rgba(255,240,210,0.85)',
    letterSpacing: 0.8,
    textAlign:     'center',
    position:      'relative',
    zIndex:        1,
  },
})
