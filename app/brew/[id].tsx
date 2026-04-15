import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { Brew } from '@/lib/types'
import { theme } from '@/constants/theme'
import { AISuggestionBox } from '@/components/AISuggestionBox'

const METHOD_LABELS: Record<string, string> = {
  espresso:     'Espresso',
  pour_over:    'Pour over',
  aeropress:    'AeroPress',
  french_press: 'French press',
}

function Param({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null
  return (
    <View style={styles.param}>
      <Text style={styles.paramLabel}>{label}</Text>
      <Text style={styles.paramValue}>{value}</Text>
    </View>
  )
}

export default function BrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [brew, setBrew] = useState<Brew | null>(null)

  useEffect(() => {
    supabase
      .from('brews')
      .select('*, beans(name, origin)')
      .eq('id', id)
      .single()
      .then(({ data }) => { if (data) setBrew(data as Brew) })
  }, [id])

  if (!brew) return null

  const pos = brew.taste_position ?? 50

  function tasteColor(p: number) {
    if (p < 45) return theme.colors.sour
    if (p <= 55) return theme.colors.balanced
    return theme.colors.accentDark
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{METHOD_LABELS[brew.method]}</Text>
        <Text style={styles.headerDate}>
          {brew.created_at ? new Date(brew.created_at).toLocaleDateString() : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Bean info */}
        <Text style={styles.beanName}>{(brew as any).beans?.name ?? '—'}</Text>
        <Text style={styles.beanOrigin}>{(brew as any).beans?.origin ?? ''}</Text>

        {/* Parameters */}
        <View style={styles.paramsCard}>
          <Text style={styles.sectionLabel}>Parameters</Text>
          <Param label="Dose"     value={brew.dose_g    ? `${brew.dose_g}g`    : undefined} />
          <Param label="Yield"    value={brew.yield_g   ? `${brew.yield_g}g`   : undefined} />
          <Param label="Time"     value={brew.time_s    ? `${brew.time_s}s`    : undefined} />
          <Param label="Grind"    value={brew.grind_setting} />
          <Param label="Water"    value={brew.water_g   ? `${brew.water_g}g`   : undefined} />
          <Param label="Temp"     value={brew.water_temp_c ? `${brew.water_temp_c}°C` : undefined} />
          <Param label="Brew time" value={brew.brew_time_s ? `${brew.brew_time_s}s` : undefined} />
        </View>

        {/* Taste */}
        <View style={styles.tasteRow}>
          <Text style={styles.sectionLabel}>Taste position</Text>
          <View style={[styles.tasteBadge, { backgroundColor: tasteColor(pos) + '22' }]}>
            <Text style={[styles.tasteBadgeText, { color: tasteColor(pos) }]}>
              {pos}/100
            </Text>
          </View>
        </View>

        {/* AI suggestion */}
        {brew.ai_suggestion && (
          <AISuggestionBox suggestion={brew.ai_suggestion} />
        )}
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  headerDate:  { fontSize: 12, color: theme.colors.textSecondary },
  content:     { padding: theme.spacing.standard, paddingBottom: 40 },
  beanName:    { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  beanOrigin:  { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 },
  paramsCard: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.md,
    padding:         theme.spacing.base,
    marginBottom:    16,
    gap:             8,
  },
  sectionLabel: {
    fontSize:     10,
    color:        theme.colors.textSecondary,
    letterSpacing: 1,
    fontWeight:   '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  param:      { flexDirection: 'row', justifyContent: 'space-between' },
  paramLabel: { fontSize: 13, color: theme.colors.textSecondary },
  paramValue: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  tasteRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  tasteBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tasteBadgeText: { fontSize: 13, fontWeight: '700' },
})
