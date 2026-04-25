import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import Slider from '@react-native-community/slider'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'

interface Props {
  label:       string
  value:       number
  min:         number
  max:         number
  step?:       number
  unit:        string
  badge?:      string
  description?: string
  onChangeEnd: (v: number) => void
}

export function BrewSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  badge,
  description,
  onChangeEnd,
}: Props) {
  const [local, setLocal] = React.useState(value)
  const valueScale = useSharedValue(1)

  React.useEffect(() => { setLocal(value) }, [value])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }))

  function handleChange(v: number) {
    setLocal(v)
    valueScale.value = withSpring(1.08, { damping: 8, stiffness: 400 }, () => {
      valueScale.value = withSpring(1, { damping: 10, stiffness: 300 })
    })
  }

  const pct = (local - min) / (max - min)

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.paramLabel}>{label.toUpperCase()}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <View style={styles.valueGroup}>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <Animated.View style={animStyle}>
            <Text style={styles.valueText}>
              {typeof local === 'number' && !Number.isInteger(local)
                ? local.toFixed(1)
                : local}
              <Text style={styles.unitText}>{unit}</Text>
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Mini track indicator */}
      <View style={styles.trackBg}>
        <View style={[styles.trackFill, { width: `${pct * 100}%` }]} />
      </View>

      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={local}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor={theme.colors.accent}
        onValueChange={handleChange}
        onSlidingComplete={onChangeEnd}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 0,
    paddingTop:        2,
    paddingBottom:     0,
  },
  topRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  paramLabel: {
    fontFamily:    fonts.mono,
    fontSize:      11,
    fontWeight:    '600',
    color:         theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  description: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
  valueGroup:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: theme.colors.accentMuted,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  badgeText: { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.accentDark, fontWeight: '600' },
  valueText: { fontFamily: fonts.mono, fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
  unitText:  { fontFamily: fonts.mono, fontSize: 13, fontWeight: '400', color: theme.colors.textSecondary },

  trackBg: {
    height:          4,
    backgroundColor: theme.colors.divider,
    borderRadius:    theme.radius.full,
    overflow:        'hidden',
    marginBottom:    2,
  },
  trackFill: {
    height:          4,
    backgroundColor: theme.colors.accent,
    borderRadius:    theme.radius.full,
  },
  slider: { marginHorizontal: -8, height: 32 },
})
