import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Coffee } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Bean } from '@/lib/types'
import { theme } from '@/constants/theme'

interface Props {
  bean?: Bean | null
}

export function LastCoffeeCard({ bean }: Props) {
  const router = useRouter()

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push('/(tabs)/dial')}
    >
      <View style={styles.iconWrapper}>
        <Coffee size={32} stroke={theme.colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{bean?.name ?? 'No bean selected'}</Text>
        <Text style={styles.subtitle}>
          {bean ? `${bean.roaster ?? ''} · ${bean.origin ?? ''}`.trim().replace(/^·\s*/, '') : 'Add a bean to get started'}
        </Text>
        <Text style={styles.cta}>Continue Dialing →</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    height:          140,
    backgroundColor: theme.colors.card,
    borderRadius:    22,
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: theme.spacing.base,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    14,
    elevation:       4,
  },
  iconWrapper: {
    width:           68,
    height:          68,
    borderRadius:    18,
    backgroundColor: theme.colors.bgPrimary,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     14,
  },
  info:     { flex: 1 },
  title:    { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  cta:      { fontSize: 13, color: theme.colors.accent, fontWeight: '600', marginTop: 8 },
})
