import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { Method } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'

const METHODS: { id: Method; label: string }[] = [
  { id: 'espresso',     label: 'Espresso'     },
  { id: 'pour_over',   label: 'Pour over'    },
  { id: 'aeropress',   label: 'AeroPress'    },
  { id: 'french_press', label: 'French press' },
]

interface Props {
  selected: Method
  onSelect: (m: Method) => void
}

export function MethodTabs({ selected, onSelect }: Props) {
  return (
    <View style={s.container}>
      {METHODS.map(({ id, label }) => {
        const active = id === selected
        return (
          <Pressable
            key={id}
            style={[s.tab, active && s.tabActive]}
            onPress={() => onSelect(id)}
          >
            <Text style={[s.label, active && s.labelActive]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flexDirection:   'row',
    backgroundColor: theme.colors.surface,
    borderRadius:    theme.radius.lg,
    padding:         4,
    gap:             3,
    borderWidth:     1,
    borderColor:     theme.colors.divider,
  },
  tab: {
    flex:            1,
    paddingVertical: 9,
    borderRadius:    theme.radius.md,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tabActive:    { backgroundColor: theme.colors.textPrimary },
  label:        { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.textSecondary, letterSpacing: 0.2 },
  labelActive:  { color: '#FFFFFF', fontWeight: '600' },
})
