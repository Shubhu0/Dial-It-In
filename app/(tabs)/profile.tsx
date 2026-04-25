import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ScrollView, View, Text, Pressable, TextInput,
  StyleSheet, SafeAreaView, Alert, Modal,
  KeyboardAvoidingView, Platform, Share,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronRight, LogOut, Download, X, Check, Bell, BellOff } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { useAppTheme, AppTheme } from '@/lib/app-theme'

// ── persistence key ───────────────────────────────────────────────────────────
const PREFS_KEY = 'user_preferences_v1'

interface UserPrefs {
  machine:       string
  grinder:       string
  scale:         string
  basket:        string
  units:         string
  defaultMethod: string
  notifications: boolean
}

const DEFAULT_PREFS: UserPrefs = {
  machine:       'Lelit Bianca',
  grinder:       'Niche Zero',
  scale:         'Acaia Lunar',
  basket:        'VST 18g',
  units:         'g · °C',
  defaultMethod: 'Espresso',
  notifications: true,
}

// ── Edit text modal ───────────────────────────────────────────────────────────
function EditModal({
  visible, label, value, placeholder, onSave, onClose,
}: {
  visible: boolean; label: string; value: string
  placeholder: string; onSave: (v: string) => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (visible) setDraft(value) }, [visible, value])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <View style={m.sheetHeader}>
            <Text style={m.sheetTitle}>Edit {label}</Text>
            <Pressable onPress={onClose} hitSlop={8}><X size={20} stroke={theme.colors.textSecondary} strokeWidth={2} /></Pressable>
          </View>
          <TextInput
            style={m.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => { onSave(draft.trim() || value); onClose() }}
          />
          <View style={m.sheetBtns}>
            <Pressable style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={m.saveBtn} onPress={() => { onSave(draft.trim() || value); onClose() }}>
              <Check size={14} stroke="#FFF" strokeWidth={2.5} />
              <Text style={m.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Options picker modal ──────────────────────────────────────────────────────
function PickerModal({
  visible, label, value, options, onSave, onClose,
}: {
  visible: boolean; label: string; value: string
  options: string[]; onSave: (v: string) => void; onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop as separate layer so it never overlaps option rows */}
      <Pressable style={m.backdrop} onPress={onClose} />
      <View style={m.pickerContainer}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <View style={m.sheetHeader}>
            <Text style={m.sheetTitle}>{label}</Text>
            <Pressable onPress={onClose} hitSlop={8}><X size={20} stroke={theme.colors.textSecondary} strokeWidth={2} /></Pressable>
          </View>
          {options.map((opt, i) => (
            <Pressable
              key={opt}
              style={[m.optRow, i < options.length - 1 && m.optBorder]}
              onPress={() => { onSave(opt); onClose() }}
            >
              <Text style={[m.optText, opt === value && m.optTextActive]}>{opt}</Text>
              {opt === value && <Check size={16} stroke={theme.colors.accent} strokeWidth={2.5} />}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter()
  const { recentBrews, beans, userProfile, isGuest, setGuestMode } = useStore()
  const { appTheme, setAppTheme, colors } = useAppTheme()

  const [prefs,        setPrefs]        = useState<UserPrefs>(DEFAULT_PREFS)
  const [userName,     setUserName]     = useState('')
  const [userEmail,    setUserEmail]    = useState('')
  const [editingName,  setEditingName]  = useState(false)

  // Modal state
  const [editingField, setEditingField] = useState<{ key: keyof UserPrefs; label: string; placeholder: string } | null>(null)
  const [pickerField,  setPickerField]  = useState<{ key: keyof UserPrefs; label: string; options: string[] } | null>(null)

  // Dynamic styles — recreated only when theme colors change
  const d = useMemo(() => StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.bgPrimary },
    content:     { paddingHorizontal: 22, paddingTop: 16, gap: 20 },
    title:       { fontFamily: fonts.serif, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5 },
    avatarCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.bgSecondary, padding: 16, borderWidth: 1, borderColor: colors.divider },
    avatar:      { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarInitial: { fontFamily: fonts.serifItalic, fontSize: 28, color: colors.bgPrimary },
    avatarName:  { fontFamily: fonts.serif, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.3 },
    avatarSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
    avatarEmail: { fontFamily: fonts.mono, fontSize: 10, color: colors.textTertiary, marginTop: 2 },
    sectionTitle:{ fontFamily: fonts.mono, fontSize: 10, color: colors.textTertiary, letterSpacing: 0.2, marginBottom: 4 },
    rowList:     { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.divider },
    rowItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    rowBorder:   { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowLabel:    { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
    rowRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowValue:    { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
    rowValueAccent: { fontFamily: fonts.body, fontSize: 14, color: colors.accentDark },
    themeChips:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    themeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.bgPrimary },
    themeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    themeChipText: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.1 },
    themeChipTextActive: { color: colors.bgPrimary },
    togglePill:  { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.divider, padding: 2, justifyContent: 'center' },
    togglePillOn:{ backgroundColor: colors.positive },
    exportCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.bgSecondary, padding: 16, borderWidth: 1, borderColor: colors.divider },
    exportTitle: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    exportSub:   { fontFamily: fonts.mono, fontSize: 10, color: colors.textTertiary, letterSpacing: 0.1 },
    exportBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.textPrimary },
    exportBtnText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600', color: colors.bgPrimary, letterSpacing: 0.1 },
    signOutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.bgSecondary },
    versionText: { fontFamily: fonts.mono, fontSize: 10, color: colors.textTertiary, textAlign: 'center', letterSpacing: 0.2 },
  }), [colors])

  // Load saved prefs + user info
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          setPrefs({ ...DEFAULT_PREFS, ...parsed })
          // Guest name stored in prefs
          if (isGuest && parsed.displayName) setUserName(parsed.displayName)
        } catch {}
      }
    })
    if (!isGuest) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
          // Fall back to capitalised email prefix when no display name is set
          const fallback = user.email
            ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : ''
          setUserName(name || fallback)
          setUserEmail(user.email ?? '')
        }
      })
    }
  }, [isGuest])

  async function handleSaveName(newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) return
    setUserName(trimmed)
    if (isGuest) {
      const updated = { ...prefs, displayName: trimmed } as any
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated))
    } else {
      await supabase.auth.updateUser({ data: { full_name: trimmed } })
    }
  }

  const savePrefs = useCallback(async (updated: UserPrefs) => {
    setPrefs(updated)
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  }, [])

  function updatePref<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    savePrefs({ ...prefs, [key]: value })
  }

  // ── Sign out / exit guest ───────────────────────────────────────────────────
  function handleSignOut() {
    if (isGuest) {
      // Skip Alert for guest exit — Alert.alert multi-button callbacks are unreliable on web
      setGuestMode(false)
      router.replace('/auth')
      return
    }
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    Alert.alert('Export your data', 'Choose format:', [
      {
        text: 'CSV',
        onPress: () => {
          const csv = [
            'date,method,dose_g,yield_g,time_s,grind,taste_position',
            ...recentBrews.map(b =>
              [
                b.created_at?.split('T')[0] ?? '',
                b.method,
                b.dose_g ?? '',
                b.yield_g ?? '',
                b.time_s ?? '',
                b.grind_setting ?? '',
                b.taste_position ?? '',
              ].join(',')
            ),
          ].join('\n')
          Share.share({ message: csv, title: 'Dial It In — brew data.csv' })
        },
      },
      {
        text: 'JSON',
        onPress: () => {
          Share.share({
            message: JSON.stringify({ brews: recentBrews, beans }, null, 2),
            title: 'Dial It In — data.json',
          })
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  // ── Notifications ────────────────────────────────────────────────────────────
  function handleNotifications() {
    const next = !prefs.notifications
    updatePref('notifications', next)
  }

  const kitItems = [
    { key: 'machine' as const, label: 'Machine', placeholder: 'e.g. Lelit Bianca' },
    { key: 'grinder' as const, label: 'Grinder', placeholder: 'e.g. Niche Zero'   },
    { key: 'scale'   as const, label: 'Scale',   placeholder: 'e.g. Acaia Lunar'  },
    { key: 'basket'  as const, label: 'Basket',  placeholder: 'e.g. VST 18g'      },
  ]

  const prefItems = [
    { key: 'units'         as const, label: 'Units',          options: ['g · °C', 'oz · °F', 'g · °F'] },
    { key: 'defaultMethod' as const, label: 'Default method', options: ['Espresso', 'Pour Over', 'AeroPress', 'French Press'] },
  ]

  const themeOptions: { value: AppTheme; label: string }[] = [
    { value: 'light', label: 'Light'  },
    { value: 'sepia', label: 'Sepia'  },
    { value: 'dark',  label: 'Dark'   },
  ]

  return (
    <SafeAreaView style={d.safe}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={d.content} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <Text style={d.title}>You</Text>

        {/* Avatar card — tap to edit name */}
        <Pressable style={d.avatarCard} onPress={() => setEditingName(true)}>
          <View style={d.avatar}>
            <Text style={d.avatarInitial}>
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {userName ? (
              <Text style={d.avatarName}>{userName}</Text>
            ) : (
              <Text style={[d.avatarName, { color: colors.textTertiary }]}>
                Tap to set your name
              </Text>
            )}
            <Text style={d.avatarSub}>
              {isGuest
                ? 'Guest mode · data stored locally'
                : `${userProfile.totalBrews} shots · ${beans.length} bag${beans.length !== 1 ? 's' : ''}`}
            </Text>
            {userEmail ? <Text style={d.avatarEmail}>{userEmail}</Text> : null}
          </View>
          <ChevronRight size={14} stroke={colors.textTertiary} strokeWidth={1.8} />
        </Pressable>

        {/* ── Your kit ─────────────────────────────────────────────── */}
        <View>
          <Text style={d.sectionTitle}>YOUR KIT</Text>
          <View style={d.rowList}>
            {kitItems.map((item, i) => (
              <Pressable
                key={item.key}
                style={[d.rowItem, i < kitItems.length - 1 && d.rowBorder]}
                onPress={() => setEditingField(item)}
              >
                <Text style={d.rowLabel}>{item.label}</Text>
                <View style={d.rowRight}>
                  <Text style={d.rowValue}>{prefs[item.key] as string}</Text>
                  <ChevronRight size={14} stroke={colors.textTertiary} strokeWidth={1.8} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <View>
          <Text style={d.sectionTitle}>PREFERENCES</Text>
          <View style={d.rowList}>
            {prefItems.map((pref, i) => (
              <Pressable
                key={pref.key}
                style={[d.rowItem, d.rowBorder]}
                onPress={() => setPickerField(pref)}
              >
                <Text style={d.rowLabel}>{pref.label}</Text>
                <View style={d.rowRight}>
                  <Text style={d.rowValueAccent}>{prefs[pref.key] as string}</Text>
                  <ChevronRight size={14} stroke={colors.textTertiary} strokeWidth={1.8} />
                </View>
              </Pressable>
            ))}

            {/* Theme — inline chips wired directly to ThemeContext */}
            <View style={[d.rowItem, d.rowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
              <Text style={d.rowLabel}>Theme</Text>
              <View style={d.themeChips}>
                {themeOptions.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[d.themeChip, appTheme === opt.value && d.themeChipActive]}
                    onPress={() => setAppTheme(opt.value)}
                  >
                    {appTheme === opt.value && (
                      <Check size={11} stroke={colors.bgPrimary} strokeWidth={2.5} />
                    )}
                    <Text style={[d.themeChipText, appTheme === opt.value && d.themeChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notifications toggle */}
            <Pressable style={d.rowItem} onPress={handleNotifications}>
              <Text style={d.rowLabel}>Notifications</Text>
              <View style={d.rowRight}>
                <View style={[d.togglePill, prefs.notifications && d.togglePillOn]}>
                  <View style={[
                    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
                    prefs.notifications && { alignSelf: 'flex-end' },
                  ]} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Export my data ───────────────────────────────────────── */}
        <View style={d.exportCard}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={d.exportTitle}>Export my data</Text>
            <Text style={d.exportSub}>
              CSV or JSON · {userProfile.totalBrews} shot{userProfile.totalBrews !== 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable style={d.exportBtn} onPress={handleExport}>
            <Download size={14} stroke={colors.bgPrimary} strokeWidth={2} />
            <Text style={d.exportBtnText}>Export</Text>
          </Pressable>
        </View>

        {/* ── Sign out / Exit guest ─────────────────────────────────── */}
        <Pressable style={d.signOutBtn} onPress={handleSignOut}>
          <LogOut size={16} stroke={theme.colors.error} strokeWidth={1.8} />
          <Text style={[d.versionText, { color: theme.colors.error, fontSize: 12, letterSpacing: 0 }]}>
            {isGuest ? 'Exit guest mode' : 'Sign out'}
          </Text>
        </Pressable>

        <Text style={d.versionText}>Dial It In · v2.4.0</Text>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Name edit modal ─────────────────────────────────────── */}
      <EditModal
        visible={editingName}
        label="your name"
        value={userName}
        placeholder="e.g. Alex Nguyen"
        onSave={handleSaveName}
        onClose={() => setEditingName(false)}
      />

      {/* ── Edit text modal (kit items) ──────────────────────────── */}
      {editingField && (
        <EditModal
          visible
          label={editingField.label}
          value={prefs[editingField.key] as string}
          placeholder={editingField.placeholder}
          onSave={v => updatePref(editingField.key, v)}
          onClose={() => setEditingField(null)}
        />
      )}

      {/* ── Options picker modal (preferences) ──────────────────── */}
      {pickerField && (
        <PickerModal
          visible
          label={pickerField.label}
          value={prefs[pickerField.key] as string}
          options={pickerField.options}
          onSave={v => updatePref(pickerField.key, v)}
          onClose={() => setPickerField(null)}
        />
      )}
    </SafeAreaView>
  )
}

// ── Static styles (layout / non-color) ───────────────────────────────────────
const s = StyleSheet.create({
  avatarInfo: { flex: 1, gap: 2 },
})

// ── Modal styles ──────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  // Backdrop is absolute and rendered as a SIBLING before the sheet container,
  // so the sheet (rendered after) sits on top and receives all touches.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.40)' },
  // pickerContainer lets the sheet float at the bottom without the backdrop interfering
  pickerContainer: { justifyContent: 'flex-end', flex: 1 },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingBottom: 40, paddingTop: 12, gap: 14,
    ...theme.shadow.lg,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.divider, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle:  { fontFamily: fonts.serif, fontSize: 22, color: theme.colors.textPrimary, fontStyle: 'italic' },
  input: {
    backgroundColor: theme.colors.bgPrimary, borderRadius: theme.radius.lg,
    borderWidth: 1.5, borderColor: theme.colors.accent,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: theme.colors.textPrimary,
  },
  sheetBtns:  { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, height: 48, borderRadius: theme.radius.xl, borderWidth: 1.5, borderColor: theme.colors.divider, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  saveBtn:    { flex: 2, height: 48, borderRadius: theme.radius.xl, backgroundColor: theme.colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveText:   { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', color: '#FFF' },
  optRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  optBorder:     { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  optText:       { fontSize: 15, color: theme.colors.textSecondary },
  optTextActive: { color: theme.colors.accent, fontWeight: '600' },
})
