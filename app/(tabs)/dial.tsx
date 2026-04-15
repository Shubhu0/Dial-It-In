import React, { useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, Coffee } from 'lucide-react-native'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { MethodTabs } from '@/components/MethodTabs'
import { BrewParamSlider } from '@/components/BrewParamSlider'
import { RadialTasteDial } from '@/components/RadialTasteDial'
import { AISuggestionBox } from '@/components/AISuggestionBox'
import { DialTipBox } from '@/components/DialTipBox'
import { getDialTip, getZone } from '@/lib/dialingAlgorithm'

export default function DialScreen() {
  const router = useRouter()
  const {
    selectedBean,
    selectedMethod,
    currentParams,
    lastSuggestion,
    recentBrews,
    setMethod,
    updateParam,
    setTastePosition,
    saveBrew,
  } = useStore()

  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showLocal, setShowLocal] = useState(false)

  const isEspresso = selectedMethod === 'espresso'

  const dialTip = getDialTip(currentParams.taste_position, selectedMethod)
  const dialZone = getZone(currentParams.taste_position)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setShowLocal(true)
    try {
      await saveBrew()
    } catch (e: any) {
      setSaveError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const ratio = isEspresso && currentParams.dose_g > 0
    ? `1:${(currentParams.yield_g / currentParams.dose_g).toFixed(1)}`
    : undefined

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.beanDot}>
          <Coffee size={18} stroke={theme.colors.accent} />
        </View>
        <View>
          <Text style={styles.beanName}>{selectedBean?.name ?? 'No bean'}</Text>
          <Text style={styles.beanOrigin}>{selectedBean?.origin ?? 'Select a bean'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Method tabs */}
        <MethodTabs selected={selectedMethod} onSelect={setMethod} />

        {/* Brew params */}
        <View style={styles.paramsSection}>
          <BrewParamSlider
            label="Dose"
            value={currentParams.dose_g}
            min={12} max={22} step={0.5} unit="g"
            onChangeEnd={(v) => updateParam('dose_g', v)}
          />

          {isEspresso ? (
            <>
              <BrewParamSlider
                label="Yield"
                value={currentParams.yield_g}
                min={20} max={54} step={1} unit="g"
                badge={ratio}
                onChangeEnd={(v) => updateParam('yield_g', v)}
              />
              <BrewParamSlider
                label="Time"
                value={currentParams.time_s}
                min={18} max={45} step={1} unit="s"
                onChangeEnd={(v) => updateParam('time_s', v)}
              />
            </>
          ) : (
            <>
              <BrewParamSlider
                label="Water"
                value={currentParams.water_g ?? 250}
                min={150} max={350} step={10} unit="g"
                onChangeEnd={(v) => updateParam('water_g', v)}
              />
              <BrewParamSlider
                label="Brew time"
                value={currentParams.brew_time_s ?? 180}
                min={60} max={480} step={15} unit="s"
                onChangeEnd={(v) => updateParam('brew_time_s', v)}
              />
            </>
          )}
        </View>

        {/* Taste dial */}
        <View style={styles.dialSection}>
          <Text style={styles.sectionLabel}>TASTE DIAL</Text>
          <RadialTasteDial
            value={currentParams.taste_position}
            onChange={setTastePosition}
          />
        </View>

        {/* Live dial tip — always visible */}
        <View style={styles.suggestionWrapper}>
          <DialTipBox tip={dialTip} zone={dialZone} />
        </View>

        {/* AI suggestion — shown after save */}
        {showLocal && lastSuggestion && (
          <View style={styles.suggestionWrapper}>
            <AISuggestionBox
              suggestion={saving ? null : lastSuggestion}
              loading={saving}
            />
          </View>
        )}
        {saving && (
          <View style={styles.suggestionWrapper}>
            <AISuggestionBox suggestion={null} loading />
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        {saveError ? (
          <Text style={styles.saveError}>{saveError}</Text>
        ) : null}
        {!selectedBean ? (
          <Text style={styles.saveHint}>Select a bean first to save a brew</Text>
        ) : null}
        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnLoading, !selectedBean && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !selectedBean}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.saveBtnText}>Save Brew</Text>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.standard,
    paddingVertical:   12,
    gap:             12,
  },
  backBtn:    { padding: 4 },
  beanDot: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: theme.colors.bgPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  beanName:   { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  beanOrigin: { fontSize: 12, color: theme.colors.textSecondary },
  scroll:     { flex: 1 },
  content:    { paddingBottom: 20 },
  paramsSection: { padding: theme.spacing.compact, paddingHorizontal: theme.spacing.standard, gap: 8, marginTop: 4 },
  dialSection: {
    alignItems:   'center',
    paddingTop:   theme.spacing.base,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize:     10,
    color:        theme.colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
    fontWeight:   '600',
  },
  suggestionWrapper: { paddingHorizontal: theme.spacing.standard },
  footer: {
    paddingHorizontal: theme.spacing.standard,
    paddingBottom:     16,
    backgroundColor:   theme.colors.bgPrimary,
  },
  saveBtn: {
    height:          52,
    borderRadius:    18,
    backgroundColor: theme.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
  },
  saveBtnLoading:  { backgroundColor: theme.colors.accentDark },
  saveBtnDisabled: { backgroundColor: theme.colors.divider },
  saveBtnText:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  saveError:       { fontSize: 12, color: theme.colors.sour, marginBottom: 6, textAlign: 'center' },
  saveHint:        { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6, textAlign: 'center' },
})
