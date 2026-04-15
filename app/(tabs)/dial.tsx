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
import { BrewSlider } from '@/components/BrewSlider'
import { RadialTasteDial } from '@/components/RadialTasteDial'
import { LiveTipBox, SavedSuggestionBox } from '@/components/SuggestionBox'
import {
  getDialTip, getZone, getCoachingMessage, isOscillating,
  optimizeNextDial,
} from '@/lib/algorithms'

export default function DialScreen() {
  const router = useRouter()
  const {
    selectedBean, selectedMethod,
    currentParams, lastSuggestion,
    recentBrews, userProfile,
    setMethod, updateParam, setTastePosition,
    saveBrew,
  } = useStore()

  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [showSaved, setShowSaved]   = useState(false)

  const isEspresso = selectedMethod === 'espresso'

  // Live coaching
  const dialTip       = getDialTip(currentParams.taste_position, selectedMethod)
  const dialZone      = getZone(currentParams.taste_position)
  const coachMsg      = getCoachingMessage(currentParams.taste_position, userProfile)
  const beanBrews     = selectedBean
    ? recentBrews.filter((b) => b.bean_id === selectedBean.id)
    : []
  const trajectory    = beanBrews.map((b) => b.taste_position ?? 50).reverse()
  const oscillating   = isOscillating(trajectory)

  // Espresso ratio badge
  const ratio = isEspresso && currentParams.dose_g > 0
    ? `1:${(currentParams.yield_g / currentParams.dose_g).toFixed(1)}`
    : undefined

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setShowSaved(true)
    try {
      await saveBrew()
    } catch (e: any) {
      setSaveError(e?.message ?? 'Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <View style={[styles.beanIcon, { backgroundColor: theme.colors.accentMuted }]}>
          <Coffee size={18} stroke={theme.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.beanName} numberOfLines={1}>
            {selectedBean?.name ?? 'No bean selected'}
          </Text>
          <Text style={styles.beanOrigin}>
            {selectedBean?.origin ?? 'Select a bean from Home'}
          </Text>
        </View>
        {selectedBean?.roast_level && (
          <View style={styles.roastChip}>
            <Text style={styles.roastChipText}>{selectedBean.roast_level}</Text>
          </View>
        )}
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
          <BrewSlider
            label="Dose"
            value={currentParams.dose_g}
            min={12} max={22} step={0.5} unit="g"
            description="Ground coffee"
            onChangeEnd={(v) => updateParam('dose_g', v)}
          />

          {isEspresso ? (
            <>
              <BrewSlider
                label="Yield"
                value={currentParams.yield_g}
                min={20} max={60} step={1} unit="g"
                badge={ratio}
                description="Liquid espresso output"
                onChangeEnd={(v) => updateParam('yield_g', v)}
              />
              <BrewSlider
                label="Time"
                value={currentParams.time_s}
                min={18} max={50} step={1} unit="s"
                description="Shot pull time"
                onChangeEnd={(v) => updateParam('time_s', v)}
              />
            </>
          ) : (
            <>
              <BrewSlider
                label="Water"
                value={currentParams.water_g ?? 250}
                min={150} max={400} step={10} unit="g"
                description="Total water volume"
                onChangeEnd={(v) => updateParam('water_g', v)}
              />
              <BrewSlider
                label="Brew time"
                value={currentParams.brew_time_s ?? 180}
                min={60} max={480} step={15} unit="s"
                description="Total extraction time"
                onChangeEnd={(v) => updateParam('brew_time_s', v)}
              />
            </>
          )}
        </View>

        {/* Taste dial */}
        <View style={styles.dialSection}>
          <Text style={styles.dialSectionLabel}>TASTE DIAL</Text>
          <Text style={styles.dialSectionHint}>
            Drag to where this brew tastes
          </Text>
          <RadialTasteDial
            value={currentParams.taste_position}
            onChange={setTastePosition}
          />
        </View>

        {/* Oscillation warning */}
        {oscillating && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚡ You've been oscillating — try a smaller adjustment this time
            </Text>
          </View>
        )}

        {/* Live coaching message */}
        <View style={styles.coachRow}>
          <Text style={styles.coachMsg}>{coachMsg}</Text>
        </View>

        {/* Live tip (always shown) */}
        <View style={styles.tipSection}>
          <LiveTipBox tip={dialTip} zone={dialZone} />
        </View>

        {/* Saved suggestion (shown after save) */}
        {showSaved && (
          <View style={styles.tipSection}>
            <SavedSuggestionBox
              suggestion={saving ? null : lastSuggestion}
              loading={saving}
            />
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {saveError ? (
          <Text style={styles.saveError}>{saveError}</Text>
        ) : null}
        {!selectedBean ? (
          <Text style={styles.saveHint}>Select a bean on Home to save a brew</Text>
        ) : null}
        <Pressable
          style={[
            styles.saveBtn,
            saving           && styles.saveBtnLoading,
            !selectedBean    && styles.saveBtnDisabled,
          ]}
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
  safe:  { flex: 1, backgroundColor: theme.colors.bgPrimary },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap:               10,
    ...theme.shadow.xs,
  },
  backBtn:    { padding: 4 },
  beanIcon: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beanName:   { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  beanOrigin: { fontSize: 11, color: theme.colors.textSecondary },
  roastChip:  {
    backgroundColor: theme.colors.accentMuted,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  roastChipText: { fontSize: 10, color: theme.colors.accentDark, fontWeight: '600' },

  scroll:  { flex: 1 },
  content: { paddingBottom: 20 },

  paramsSection: {
    paddingHorizontal: 16,
    paddingTop:        12,
    gap:               8,
  },

  dialSection: {
    alignItems:    'center',
    paddingTop:    20,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  dialSectionLabel: {
    fontSize:      10,
    fontWeight:    '700',
    color:         theme.colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom:  2,
  },
  dialSectionHint: {
    fontSize:     12,
    color:        theme.colors.textSecondary,
    marginBottom: 12,
  },

  warningBanner: {
    marginHorizontal: 16,
    backgroundColor:  theme.colors.sourLight,
    borderRadius:     theme.radius.md,
    padding:          10,
    marginTop:        4,
  },
  warningText: { fontSize: 12, color: theme.colors.accentDark, fontWeight: '500' },

  coachRow: { paddingHorizontal: 16, marginTop: 6 },
  coachMsg: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },

  tipSection: { paddingHorizontal: 16, marginTop: 10 },

  footer: {
    paddingHorizontal: 16,
    paddingBottom:     20,
    paddingTop:        8,
    backgroundColor:   theme.colors.bgPrimary,
    borderTopWidth:    1,
    borderTopColor:    theme.colors.divider,
  },
  saveBtn: {
    height:          54,
    borderRadius:    theme.radius.xl,
    backgroundColor: theme.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    ...theme.shadow.md,
  },
  saveBtnLoading:  { backgroundColor: theme.colors.accentDark },
  saveBtnDisabled: { backgroundColor: theme.colors.divider, shadowOpacity: 0 },
  saveBtnText:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  saveError:       { fontSize: 12, color: theme.colors.error, marginBottom: 6, textAlign: 'center' },
  saveHint:        { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6, textAlign: 'center' },
})
