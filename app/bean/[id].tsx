import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Coffee } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Bean, Brew } from '@/lib/types'
import { theme } from '@/constants/theme'

export default function BeanDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const router   = useRouter()
  const { setBean } = useStore()

  const [bean,  setLocalBean]  = useState<Bean | null>(null)
  const [brews, setBrews]      = useState<Brew[]>([])

  useEffect(() => {
    supabase.from('beans').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setLocalBean(data as Bean)
    })
    supabase.from('brews').select('*').eq('bean_id', id).order('created_at', { ascending: false }).then(({ data }) => {
      setBrews((data as Brew[]) ?? [])
    })
  }, [id])

  function handleSelectBean() {
    if (bean) {
      setBean(bean)
      router.push('/(tabs)/dial')
    }
  }

  const ROAST_COLORS: Record<string, string> = {
    light:        theme.colors.sour,
    medium:       theme.colors.accent,
    'medium-dark': theme.colors.accentDark,
    dark:         '#3A2010',
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Bean Detail</Text>
      </View>

      <FlatList
        data={brews}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={() => (
          <View style={styles.beanCard}>
            <View style={styles.beanIcon}>
              <Coffee size={28} stroke={ROAST_COLORS[bean?.roast_level ?? 'medium']} />
            </View>
            <View style={styles.beanInfo}>
              <Text style={styles.beanName}>{bean?.name ?? '…'}</Text>
              <Text style={styles.beanMeta}>
                {[bean?.roaster, bean?.origin].filter(Boolean).join(' · ')}
              </Text>
              {bean?.roast_level && (
                <Text style={[styles.roastBadge, { color: ROAST_COLORS[bean.roast_level] }]}>
                  {bean.roast_level}
                </Text>
              )}
            </View>
            <Pressable style={styles.dialBtn} onPress={handleSelectBean}>
              <Text style={styles.dialBtnText}>Dial In</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>No brews for this bean yet.</Text>
        )}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.brewRow}
            onPress={() => router.push(`/brew/${item.id}`)}
          >
            <Text style={styles.brewNum}>#{brews.length - index}</Text>
            <Text style={styles.brewMethod}>{item.method.replace('_', ' ')}</Text>
            <Text style={styles.brewDate}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    padding:         theme.spacing.standard,
    backgroundColor: theme.colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  list:        { padding: theme.spacing.standard },
  beanCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    20,
    padding:         theme.spacing.base,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    marginBottom:    20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  beanIcon: {
    width:           56,
    height:          56,
    borderRadius:    16,
    backgroundColor: theme.colors.bgPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  beanInfo:  { flex: 1 },
  beanName:  { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  beanMeta:  { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  roastBadge: { fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
  dialBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius:    theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  dialBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  empty:    { fontSize: 14, color: theme.colors.textSecondary },
  brewRow: {
    backgroundColor: theme.colors.card,
    borderRadius:    14,
    padding:         12,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    marginBottom:    8,
  },
  brewNum:    { fontSize: 13, fontWeight: '700', color: theme.colors.accent, width: 28 },
  brewMethod: { flex: 1, fontSize: 13, color: theme.colors.textPrimary, textTransform: 'capitalize' },
  brewDate:   { fontSize: 11, color: theme.colors.textSecondary },
})
