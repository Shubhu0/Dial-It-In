import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Slider from '@react-native-community/slider'
import { theme } from '@/constants/theme'

interface Props {
  label:   string
  value:   number
  min:     number
  max:     number
  step?:   number
  unit:    string
  badge?:  string
  onChangeEnd: (v: number) => void
}

export function BrewParamSlider({ label, value, min, max, step = 1, unit, badge, onChangeEnd }: Props) {
  const [local, setLocal] = React.useState(value)

  React.useEffect(() => { setLocal(value) }, [value])

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.paramName}>{label.toUpperCase()}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>{local}{unit}</Text>
          {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
        </View>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={local}
        minimumTrackTintColor={theme.colors.accent}
        maximumTrackTintColor={theme.colors.divider}
        thumbTintColor={theme.colors.accent}
        onValueChange={setLocal}
        onSlidingComplete={onChangeEnd}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.md,
    paddingHorizontal: theme.spacing.base,
    paddingTop:      theme.spacing.compact,
    paddingBottom:   4,
  },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paramName: { fontSize: theme.font.sizes.xs, color: theme.colors.textSecondary, letterSpacing: 1 },
  valueRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { fontSize: 19, fontWeight: '700', color: theme.colors.textPrimary },
  badge: {
    backgroundColor: theme.colors.bgPrimary,
    borderRadius:    theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  badgeText: { fontSize: 10, color: theme.colors.textSecondary },
  slider:    { marginTop: 4, marginHorizontal: -4 },
})
