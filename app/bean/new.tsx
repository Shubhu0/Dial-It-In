import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, Image,
  Animated, Easing,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, Camera, Upload, Type, Check } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { Bean } from '@/lib/types'

type Mode = 'scan' | 'upload' | 'type'

const ROAST_LEVELS = [
  { id: 'light',       label: 'Light'       },
  { id: 'medium',      label: 'Medium'      },
  { id: 'medium-dark', label: 'Medium-dark' },
  { id: 'dark',        label: 'Dark'        },
] as const

const ROAST_BG: Record<string, string> = {
  light:         '#6B3A1A',
  medium:        '#6B2C16',
  'medium-dark': '#4A1E0E',
  dark:          '#2B140A',
}

const NOTE_PRESETS = ['Blueberry', 'Jasmine', 'Honey', 'Cocoa', 'Citrus', 'Floral', 'Fruity', 'Sweet']

export default function NewBeanScreen() {
  const router = useRouter()
  const { addBeanLocally, setBean, fetchBeans, isGuest } = useStore()

  const [mode,        setMode]        = useState<Mode>('type')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [capturedImg, setCapturedImg] = useState<string | null>(null)
  const [scanning,    setScanning]    = useState(false)

  async function openCamera() {
    setScanning(true)
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Camera permission needed',
          'Please allow camera access in Settings to scan bean bags.',
          [{ text: 'OK' }],
        )
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      })
      if (!result.canceled && result.assets[0]) {
        setCapturedImg(result.assets[0].uri)
        // Auto-switch to type mode with a prompt to fill in detected details
        Alert.alert(
          'Photo captured!',
          'Fill in the bean details from the bag label below.',
          [{ text: 'Got it', onPress: () => setMode('type') }],
        )
      }
    } finally {
      setScanning(false)
    }
  }

  async function openPhotoPicker() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Photo library permission needed', 'Please allow access in Settings.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      })
      if (!result.canceled && result.assets[0]) {
        setCapturedImg(result.assets[0].uri)
        Alert.alert(
          'Photo selected!',
          'Fill in the bean details from the bag label below.',
          [{ text: 'Got it', onPress: () => setMode('type') }],
        )
      }
    } catch {}
  }

  // Form fields
  const [name,       setName]       = useState('')
  const [roaster,    setRoaster]    = useState('')
  const [origin,     setOrigin]     = useState('')
  const [roastLevel, setRoastLevel] = useState<typeof ROAST_LEVELS[number]['id']>('medium')
  const [roastDate,  setRoastDate]  = useState('')
  const [bagSize,    setBagSize]    = useState('250g')
  const [notes,      setNotes]      = useState<string[]>([])
  const [grind,      setGrind]      = useState('')

  function toggleNote(n: string) {
    setNotes(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  async function handleSave() {
    if (!name.trim()) { setError('Bean name is required.'); return }
    setSaving(true); setError(null)
    try {
      const beanData = {
        name:          name.trim(),
        roaster:       roaster.trim() || null,
        origin:        origin.trim()  || null,
        roast_level:   roastLevel,
        roast_date:    roastDate || null,
        notes:         notes.join(', ') || null,
        grind_setting: grind || null,
      }

      if (isGuest) {
        const localBean: Bean = {
          id:         `local_${Date.now()}`,
          user_id:    'guest',
          ...beanData,
          created_at: new Date().toISOString(),
        } as Bean
        addBeanLocally(localBean)
        setBean(localBean)
        router.back()
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired — please sign in again.')
      const { data, error: err } = await supabase
        .from('beans').insert({ user_id: user.id, ...beanData }).select().single()
      if (err) throw err
      await fetchBeans()
      if (data) setBean(data as Bean)
      router.back()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save bean.')
    } finally {
      setSaving(false)
    }
  }

  const isScanMode   = mode === 'scan'
  const isUploadMode = mode === 'upload'
  const isTypeMode   = mode === 'type'

  // Animated scan line — loops top→bottom
  const scanAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!isScanMode || capturedImg) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [isScanMode, capturedImg])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <ArrowLeft size={20} stroke={theme.colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>New bean</Text>
        <Text style={s.step}>STEP 1/2</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Segmented control */}
        <View style={s.segment}>
          {[
            { id: 'scan'   as Mode, label: 'Scan',   Icon: Camera },
            { id: 'upload' as Mode, label: 'Upload', Icon: Upload },
            { id: 'type'   as Mode, label: 'Type',   Icon: Type   },
          ].map(({ id, label, Icon }) => (
            <Pressable
              key={id}
              style={[s.segTab, mode === id && s.segTabActive]}
              onPress={() => setMode(id)}
            >
              <Icon size={14} stroke={mode === id ? '#FFF' : theme.colors.textSecondary} strokeWidth={2} />
              <Text style={[s.segLabel, mode === id && s.segLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Mode body */}
        {isScanMode && (
          <Pressable
            style={s.scanBox}
            onPress={openCamera}
            disabled={scanning}
          >
            {capturedImg ? (
              <Image source={{ uri: capturedImg }} style={s.capturedImage} resizeMode="cover" />
            ) : (
              <View style={s.viewfinder}>
                {/* Corner brackets */}
                {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
                  <View
                    key={v + h}
                    style={[
                      s.bracket,
                      v === 'top'    ? { top: 20 }    : { bottom: 20 },
                      h === 'left'   ? { left: 20 }   : { right: 20 },
                      {
                        borderTopWidth:    v === 'top'    ? 2 : 0,
                        borderBottomWidth: v === 'bottom' ? 2 : 0,
                        borderLeftWidth:   h === 'left'   ? 2 : 0,
                        borderRightWidth:  h === 'right'  ? 2 : 0,
                      },
                    ]}
                  />
                ))}
                <View style={s.scanCenterContent}>
                  {scanning ? (
                    <ActivityIndicator color={theme.colors.accent} size="large" />
                  ) : (
                    <>
                      <Camera size={36} stroke="rgba(255,240,210,0.65)" strokeWidth={1.5} />
                      <Text style={s.scanPrompt}>Tap to open camera</Text>
                      <Text style={s.scanSub}>Point at the bag label</Text>
                    </>
                  )}
                </View>
                {/* Animated scan line */}
                {!scanning && (
                  <Animated.View
                    style={[
                      s.scanLine,
                      {
                        transform: [{
                          translateY: scanAnim.interpolate({
                            inputRange:  [0, 1],
                            outputRange: [0, 200],
                          }),
                        }],
                      },
                    ]}
                  />
                )}
                <Text style={s.scanningText}>SCANNING…</Text>
              </View>
            )}
            {capturedImg && (
              <View style={s.detectedRow}>
                <View>
                  <Text style={s.detectedLabel}>PHOTO CAPTURED</Text>
                  <Text style={s.detectedValue}>Fill in details below →</Text>
                </View>
                <Pressable onPress={() => { setCapturedImg(null) }}>
                  <Text style={s.retakeText}>Retake</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}

        {isUploadMode && (
          <View style={s.uploadBox}>
            {capturedImg ? (
              <>
                <Image source={{ uri: capturedImg }} style={[s.capturedImage, { borderRadius: 12 }]} resizeMode="cover" />
                <Pressable style={s.chooseBtn} onPress={() => setCapturedImg(null)}>
                  <Text style={s.chooseBtnText}>Choose different photo</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={s.uploadIcon}>
                  <Upload size={26} stroke={theme.colors.accent} strokeWidth={1.8} />
                </View>
                <Text style={s.uploadTitle}>Drop a photo here</Text>
                <Text style={s.uploadSub}>JPG, HEIC, or PNG — we'll parse the label</Text>
                <Pressable style={s.chooseBtn} onPress={openPhotoPicker}>
                  <Text style={s.chooseBtnText}>Choose photo</Text>
                </Pressable>
              </>
            )}
            {/* Recent photos strip */}
            <View style={s.recentPhotos}>
              {['#6b2c16', '#8a3a0f', '#5a1d10', '#3e1b0d'].map((c, i) => (
                <View key={i} style={[s.recentPhoto, { backgroundColor: c }]} />
              ))}
            </View>
          </View>
        )}

        {isTypeMode && (
          <View style={s.formCard}>
            {[
              { label: 'NAME',       value: name,       onChange: setName,    placeholder: 'Konga Natural',           required: true  },
              { label: 'ROASTER',    value: roaster,    onChange: setRoaster, placeholder: 'Sey Coffee',              required: false },
              { label: 'ORIGIN',     value: origin,     onChange: setOrigin,  placeholder: 'Yirgacheffe, Ethiopia',   required: false },
              { label: 'ROAST DATE', value: roastDate,  onChange: setRoastDate, placeholder: 'Apr 08, 2026',          required: false },
              { label: 'BAG SIZE',   value: bagSize,    onChange: setBagSize, placeholder: '250g',                    required: false },
              { label: 'GRIND',      value: grind,      onChange: setGrind,   placeholder: '14',                      required: false },
            ].map(({ label, value, onChange, placeholder, required }, i, arr) => (
              <View key={label} style={[s.formRow, i < arr.length - 1 && s.formRowBorder]}>
                <Text style={s.formLabel}>{label}{required ? ' *' : ''}</Text>
                <TextInput
                  style={s.formInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder={placeholder}
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            ))}

            {/* Roast level picker */}
            <View style={[s.formRow, s.formRowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
              <Text style={s.formLabel}>ROAST LEVEL</Text>
              <View style={s.roastRow}>
                {ROAST_LEVELS.map(r => (
                  <Pressable
                    key={r.id}
                    style={[s.roastPill, roastLevel === r.id && s.roastPillActive]}
                    onPress={() => setRoastLevel(r.id)}
                  >
                    <Text style={[s.roastPillText, roastLevel === r.id && s.roastPillTextActive]}>
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Tasting notes */}
        <View>
          <Text style={s.sectionLabel}>NOTES (optional)</Text>
          <View style={s.notesRow}>
            {NOTE_PRESETS.map(n => (
              <Pressable
                key={n}
                style={[s.noteChip, notes.includes(n) && s.noteChipActive]}
                onPress={() => toggleNote(n)}
              >
                <Text style={[s.noteChipText, notes.includes(n) && s.noteChipTextActive]}>{n}</Text>
              </Pressable>
            ))}
            <View style={s.noteChipDashed}>
              <Text style={s.noteChipDashedText}>+ custom</Text>
            </View>
          </View>
        </View>

        {error && <Text style={s.errorText}>{error}</Text>}

        {/* Save button */}
        <Pressable
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Check size={16} stroke="#FFF" strokeWidth={2.5} />
              <Text style={s.saveBtnText}>Add to library</Text>
            </>
          )}
        </Pressable>

        {/* Previously dialed */}
        <Text style={s.libraryTitle}>Your library</Text>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    ...theme.shadow.xs,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title:   { fontFamily: fonts.serif, fontSize: 22, color: theme.colors.textPrimary, flex: 1, fontStyle: 'italic' },
  step:    { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.1 },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40, gap: 16 },

  // Segment
  segment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, padding: 4, gap: 3,
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  segTab:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: theme.radius.md },
  segTabActive:  { backgroundColor: theme.colors.textPrimary },
  segLabel:      { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.textSecondary },
  segLabelActive:{ color: '#FFF', fontWeight: '600' },

  // Scan
  scanBox: {
    borderRadius: theme.radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  capturedImage: { width: '100%', height: 280 },
  viewfinder: {
    aspectRatio: 4/5, backgroundColor: '#140F0A',
    position: 'relative', alignItems: 'center', justifyContent: 'center',
  },
  scanCenterContent: { alignItems: 'center', gap: 10, zIndex: 2 },
  scanPrompt:  { fontFamily: fonts.serif, fontSize: 18, color: 'rgba(255,240,210,0.9)', fontStyle: 'italic' },
  scanSub:     { fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,240,210,0.55)', letterSpacing: 0.1 },
  bracket:     { position: 'absolute', width: 24, height: 24, borderColor: theme.colors.accent, borderRadius: 2, zIndex: 3 },
  scanningText:{ position: 'absolute', top: 14, left: 16, fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,240,210,0.75)', letterSpacing: 0.2, zIndex: 3 },
  scanLine: {
    position:        'absolute',
    top:             20,
    left:            '10%',
    right:           '10%',
    height:          2,
    backgroundColor: theme.colors.accent,
    zIndex:          4,
    shadowColor:     theme.colors.accent,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.9,
    shadowRadius:    8,
    elevation:       4,
  },
  detectedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, backgroundColor: theme.colors.surface,
  },
  detectedLabel: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.15, marginBottom: 3 },
  detectedValue: { fontFamily: fonts.serif, fontSize: 15, color: theme.colors.textPrimary },
  retakeText:    { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.accent, fontWeight: '600' },

  // Upload
  uploadBox: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: 28, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.divider, borderStyle: 'dashed',
  },
  uploadIcon:  { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontFamily: fonts.serif, fontSize: 18, color: theme.colors.textPrimary, fontStyle: 'italic', marginTop: 4 },
  uploadSub:   { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  chooseBtn:   { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.textPrimary, borderRadius: theme.radius.lg },
  chooseBtnText: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '600', color: '#FFF' },
  recentPhotos:{ flexDirection: 'row', gap: 8, marginTop: 12 },
  recentPhoto: { width: 56, height: 56, borderRadius: 10 },

  // Form
  formCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.divider,
  },
  formRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  formRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  formLabel:     { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 0.8, width: 80, flexShrink: 0 },
  formInput:     { flex: 1, fontSize: 14, color: theme.colors.textPrimary, textAlign: 'right' },
  roastRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roastPill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.bgPrimary },
  roastPillActive:    { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },
  roastPillText:      { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.textSecondary },
  roastPillTextActive:{ color: '#FFF', fontWeight: '600' },

  // Notes
  sectionLabel: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 1, marginBottom: 8 },
  notesRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider },
  noteChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  noteChipText:   { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.textSecondary },
  noteChipTextActive: { color: '#FFF', fontWeight: '600' },
  noteChipDashed: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.divider, borderStyle: 'dashed' },
  noteChipDashedText: { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.textTertiary },

  errorText: { fontFamily: fonts.mono, fontSize: 12, color: theme.colors.error },

  saveBtn: {
    height: 52, borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.textPrimary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, ...theme.shadow.md,
  },
  saveBtnText: { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  libraryTitle: { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary, fontStyle: 'italic' },
})
