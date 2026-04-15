import React from 'react'
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import { Method } from '@/lib/types'
import { theme } from '@/constants/theme'

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {METHODS.map(({ id, label }) => {
        const active = id === selected
        return (
          <Pressable
            key={id}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onSelect(id)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.standard, gap: 8, paddingVertical: 4 },
  tab: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderWidth:     1,
    borderColor:     theme.colors.divider,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
    borderColor:     theme.colors.accent,
  },
  label:       { fontSize: theme.font.sizes.sm, color: theme.colors.textSecondary, fontWeight: '500' },
  labelActive: { color: '#FFFFFF' },
})
