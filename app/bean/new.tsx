import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'expo-router'
import { ArrowLeft, Camera, Image as ImageIcon, ChevronRight, Lock } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { Bean } from '@/lib/types'

interface FormData {
  name:          string
  roaster:       string
  origin:        string
  roast_level:   'light' | 'medium' | 'medium-dark' | 'dark'
  roast_date:    string
  notes:         string
  grind_setting: string
}

const ROAST_LEVELS  = ['light', 'medium', 'medium-dark', 'dark'] as const
const GRIND_PRESETS = ['8', '10', '12', '14', '16', '18', '20', '22', '24', '28', '32', '38']

// Step 1 = photo + bean info, Step 2 = grind settings
type Step = 1 | 2

export default function NewBeanScreen() {
  const router   = useRouter()
  const { setBean, fetchBeans, beans } = useStore()

  const [step, setStep]               = useState<Step>(1)
  const [photo, setPhoto]             = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [showGate, setShowGate]       = useState(false)

  // Check on mount: guest with 1+ bean → show upgrade gate
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const isAnon = !user?.email  // anonymous users have no email
      if (isAnon && beans.length >= 1) {
        setShowGate(true)
      }
    })
  }, [])

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { roast_level: 'medium', grind_setting: '14' },
  })

  const beanName = watch('name')

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add a bean photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  async function pickFromCamera() {
    if (Platform.OS === 'web') {
      // On web, camera access goes through the image library with capture
      await pickFromLibrary()
      return
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a bean photo.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSubmitError('You need to be signed in to save a bean.')
        return
      }

      const { data: bean, error } = await supabase
        .from('beans')
        .insert({ ...data, user_id: user.id })
        .select()
        .single()

      if (error) { setSubmitError(error.message); return }
      if (bean) {
        setBean(bean as Bean)
        await fetchBeans()
        router.replace('/(tabs)/dial')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Upgrade gate ─────────────────────────────────────────────────────────
  if (showGate) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Add Bean</Text>
          </View>
        </View>

        <View style={styles.gateContainer}>
          <View style={styles.gateIconWrap}>
            <Lock size={32} stroke={theme.colors.accent} />
          </View>
          <Text style={styles.gateTitle}>Create a free account</Text>
          <Text style={styles.gateSub}>
            Guest accounts are limited to one bean. Sign up to add unlimited beans, sync across devices, and track your progress over time.
          </Text>

          <Pressable
            style={styles.gateSignUpBtn}
            onPress={() => {
              supabase.auth.signOut().then(() => router.replace('/auth'))
            }}
          >
            <Text style={styles.gateSignUpText}>Sign up — it's free</Text>
          </Pressable>

          <Pressable style={styles.gateCancelBtn} onPress={() => router.back()}>
            <Text style={styles.gateCancelText}>Maybe later</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => step === 2 ? setStep(1) : router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{step === 1 ? 'Add Bean' : 'Grind Settings'}</Text>
          <Text style={styles.headerSub}>Step {step} of 2</Text>
        </View>
        {/* Progress dots */}
        <View style={styles.stepDots}>
          <View style={[styles.dot, step >= 1 && styles.dotActive]} />
          <View style={[styles.dot, step >= 2 && styles.dotActive]} />
        </View>
      </View>

      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Photo picker */}
          {photo ? (
            <Pressable style={styles.photoPreviewWrap} onPress={pickFromLibrary}>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              <View style={styles.photoChangeOverlay}>
                <ImageIcon size={18} stroke="#FFF" />
                <Text style={styles.photoChangeText}>Change photo</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.photoRow}>
              <Pressable style={styles.photoBtn} onPress={pickFromCamera}>
                <Camera size={28} stroke={theme.colors.accent} />
                <Text style={styles.photoBtnTitle}>Camera</Text>
                <Text style={styles.photoBtnSub}>Take a photo of the bag</Text>
              </Pressable>
              <Pressable style={styles.photoBtn} onPress={pickFromLibrary}>
                <ImageIcon size={28} stroke={theme.colors.accent} />
                <Text style={styles.photoBtnTitle}>Library</Text>
                <Text style={styles.photoBtnSub}>Pick from your photos</Text>
              </Pressable>
            </View>
          )}

          <Field label="Bean name *" error={errors.name?.message}>
            <Controller
              name="name" control={control}
              rules={{ required: 'Name is required' }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ethiopia Yirgacheffe"
                  value={value} onChangeText={onChange}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            />
          </Field>

          <Field label="Roaster">
            <Controller
              name="roaster" control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Blue Bottle"
                  value={value} onChangeText={onChange}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            />
          </Field>

          <Field label="Origin">
            <Controller
              name="origin" control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ethiopia"
                  value={value} onChangeText={onChange}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            />
          </Field>

          <Field label="Roast level">
            <Controller
              name="roast_level" control={control}
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {ROAST_LEVELS.map((level) => (
                    <Pressable
                      key={level}
                      style={[styles.chip, value === level && styles.chipActive]}
                      onPress={() => onChange(level)}
                    >
                      <Text style={[styles.chipText, value === level && styles.chipTextActive]}>
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </Field>

          <Field label="Roast date">
            <Controller
              name="roast_date" control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={value} onChangeText={onChange}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            />
          </Field>

          <Field label="Notes">
            <Controller
              name="notes" control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Processing method, tasting notes…"
                  value={value} onChangeText={onChange}
                  multiline numberOfLines={3}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            />
          </Field>

          <Pressable
            style={[styles.nextBtn, !beanName && styles.nextBtnDisabled]}
            onPress={() => beanName && setStep(2)}
            disabled={!beanName}
          >
            <Text style={styles.nextBtnText}>Next — Grind Settings</Text>
            <ChevronRight size={18} stroke="#FFF" />
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.grindHint}>
            Set your starting grind for <Text style={{ fontWeight: '700' }}>{beanName}</Text>. You can always adjust when dialling in.
          </Text>

          <Field label="Grind setting">
            <Controller
              name="grind_setting" control={control}
              render={({ field: { onChange, value } }) => (
                <>
                  <View style={styles.chipRow}>
                    {GRIND_PRESETS.map((g) => (
                      <Pressable
                        key={g}
                        style={[styles.chip, styles.grindChip, value === g && styles.chipActive]}
                        onPress={() => onChange(g)}
                      >
                        <Text style={[styles.chipText, value === g && styles.chipTextActive]}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.grindOr}>or type a custom value</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Custom grind (e.g. 3.5 clicks)"
                    value={value}
                    onChangeText={onChange}
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </>
              )}
            />
          </Field>

          <View style={styles.grindGuide}>
            <Text style={styles.grindGuideTitle}>Grind guide</Text>
            {[
              { range: '8–12',  method: 'Espresso (fine)' },
              { range: '14–18', method: 'Pour over / Aeropress' },
              { range: '20–28', method: 'French press (coarse)' },
            ].map((g) => (
              <View key={g.range} style={styles.grindGuideRow}>
                <Text style={styles.grindGuideRange}>{g.range}</Text>
                <Text style={styles.grindGuideMethod}>{g.method}</Text>
              </View>
            ))}
          </View>

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          <Pressable
            style={[styles.nextBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Text style={styles.nextBtnText}>Save Bean & Dial In</Text>
                  <ChevronRight size={18} stroke="#FFF" />
                </>
            }
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    padding:         theme.spacing.standard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor:   theme.colors.bgSecondary,
  },
  backBtn:    { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  headerSub:   { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  stepDots:    { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.divider,
  },
  dotActive: { backgroundColor: theme.colors.accent },

  content: { padding: theme.spacing.standard, paddingBottom: 40 },

  photoRow: {
    flexDirection: 'row',
    gap:           12,
    marginBottom:  20,
  },
  photoBtn: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 28,
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.md,
    borderWidth:     1,
    borderColor:     theme.colors.divider,
  },
  photoBtnTitle: { fontSize: 14, color: theme.colors.accent, fontWeight: '700' },
  photoBtnSub:   { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 4 },
  photoPreviewWrap: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 180 },
  photoChangeOverlay: {
    position:        'absolute',
    bottom:          0, left: 0, right: 0,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoChangeText: { fontSize: 13, color: '#FFF', fontWeight: '600' },

  field:      { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 },
  fieldError: { fontSize: 11, color: theme.colors.sour, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.sm,
    padding:         12,
    fontSize:        15,
    color:           theme.colors.textPrimary,
    borderWidth:     1,
    borderColor:     theme.colors.divider,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  chipRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      theme.radius.full,
    backgroundColor:   theme.colors.bgSecondary,
    borderWidth:       1,
    borderColor:       theme.colors.divider,
  },
  grindChip:       { paddingHorizontal: 10, paddingVertical: 7 },
  chipActive:      { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText:        { fontSize: 13, color: theme.colors.textSecondary },
  chipTextActive:  { color: '#FFFFFF', fontWeight: '600' },

  grindHint: {
    fontSize:     14,
    color:        theme.colors.textSecondary,
    lineHeight:   20,
    marginBottom: 20,
  },
  grindOr: {
    fontSize:   12,
    color:      theme.colors.textSecondary,
    textAlign:  'center',
    marginVertical: 10,
  },
  grindGuide: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.md,
    padding:         theme.spacing.base,
    marginBottom:    20,
    gap:             8,
  },
  grindGuideTitle: {
    fontSize:     12,
    fontWeight:   '600',
    color:        theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  grindGuideRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grindGuideRange: { fontSize: 14, fontWeight: '700', color: theme.colors.accent, width: 56 },
  grindGuideMethod:{ fontSize: 13, color: theme.colors.textSecondary },

  errorText: { fontSize: 13, color: '#E05252', marginBottom: 10, lineHeight: 18 },

  nextBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    height:          52,
    borderRadius:    18,
    backgroundColor: theme.colors.accent,
    marginTop:       8,
  },
  nextBtnDisabled: { backgroundColor: theme.colors.divider },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Upgrade gate
  gateContainer: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 32,
    gap:             16,
  },
  gateIconWrap: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: theme.colors.accentMuted,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  gateTitle: {
    fontSize:    22,
    fontWeight:  '800',
    color:       theme.colors.textPrimary,
    textAlign:   'center',
    letterSpacing: -0.3,
  },
  gateSub: {
    fontSize:   14,
    color:      theme.colors.textSecondary,
    textAlign:  'center',
    lineHeight: 21,
  },
  gateSignUpBtn: {
    width:           '100%',
    height:          52,
    borderRadius:    theme.radius.xl,
    backgroundColor: theme.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       8,
    ...theme.shadow.md,
  },
  gateSignUpText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  gateCancelBtn:  {
    width:           '100%',
    height:          48,
    borderRadius:    theme.radius.xl,
    borderWidth:     1.5,
    borderColor:     theme.colors.divider,
    alignItems:      'center',
    justifyContent:  'center',
  },
  gateCancelText: { fontSize: 15, fontWeight: '500', color: theme.colors.textSecondary },
})
