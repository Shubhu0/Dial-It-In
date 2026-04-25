import React, { useState, useEffect, useCallback } from 'react'
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
  appTheme:      string
  notifications: boolean
}

const DEFAULT_PREFS: UserPrefs = {
  machine:       'Lelit Bianca',
  grinder:       'Niche Zero',
  scale:         'Acaia Lunar',
  basket:        'VST 18g',
  units:         'g · °C',
  defaultMethod: 'Espresso',
  appTheme:      'Light',
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
      <View style={m.overlay}>
        <Pressable style={m.backdrop} onPress={onClose} />
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
  const { appTheme, setAppTheme } = useAppTheme()

  const [prefs,     setPrefs]     = useState<UserPrefs>(DEFAULT_PREFS)
  const [userName,  setUserName]  = useState('Maya Osei')
  const [userEmail, setUserEmail] = useState('')

  // Modal state
  const [editingField, setEditingField] = useState<{ key: keyof UserPrefs; label: string; placeholder: string } | null>(null)
  const [pickerField,  setPickerField]  = useState<{ key: keyof UserPrefs; label: string; options: string[] } | null>(null)

  // Load saved prefs + user info
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(raw => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }) } catch {}
      }
    })
    if (!isGuest) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
          if (name) setUserName(name)
          setUserEmail(user.email ?? '')
        }
      })
    }
  }, [isGuest])

  const savePrefs = useCallback(async (updated: UserPrefs) => {
    setPrefs(updated)
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  }, [])

  function updatePref<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    savePrefs({ ...prefs, [key]: value })
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  function handleSignOut() {
    Alert.alert(
      isGuest ? 'Exit guest mode' : 'Sign out',
      isGuest ? 'Your local data will be cleared.' : 'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isGuest ? 'Exit' : 'Sign out',
          style: 'destructive',
          onPress: () => {
            if (isGuest) setGuestMode(false)
            else supabase.auth.signOut()
          },
        },
      ],
    )
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
    Alert.alert(
      next ? 'Notifications enabled' : 'Notifications disabled',
      next ? 'You\'ll get nudges and brew reminders.' : 'You won\'t receive any notifications.',
      [{ text: 'OK' }],
    )
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

  // Theme is managed via ThemeContext (not UserPrefs) so it applies live
  const themeOptions: { value: AppTheme; label: string }[] = [
    { value: 'light', label: 'Light (Paper)' },
    { value: 'sepia', label: 'Sepia'         },
    { value: 'dark',  label: 'Dark'          },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <Text style={s.title}>You</Text>

        {/* Avatar card */}
        <View style={s.avatarCard}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={s.avatarInfo}>
            <Text style={s.avatarName}>{userName}</Text>
            <Text style={s.avatarSub}>
              {isGuest
                ? 'Guest mode · data stored locally'
                : `${userProfile.totalBrews} shots · ${beans.length} bag${beans.length !== 1 ? 's' : ''}`}
            </Text>
            {userEmail ? <Text style={s.avatarEmail}>{userEmail}</Text> : null}
          </View>
        </View>

        {/* ── Your kit ─────────────────────────────────────────────── */}
        <View>
          <Text style={s.sectionTitle}>Your kit</Text>
          <View style={s.rowList}>
            {kitItems.map((item, i) => (
              <Pressable
                key={item.key}
                style={[s.rowItem, i < kitItems.length - 1 && s.rowBorder]}
                onPress={() => setEditingField(item)}
              >
                <Text style={s.rowLabel}>{item.label}</Text>
                <View style={s.rowRight}>
                  <Text style={s.rowValue}>{prefs[item.key] as string}</Text>
                  <ChevronRight size={14} stroke={theme.colors.textTertiary} strokeWidth={1.8} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <View>
          <Text style={s.sectionTitle}>Preferences</Text>
          <View style={s.rowList}>
            {prefItems.map((pref, i) => (
              <Pressable
                key={pref.key}
                style={[s.rowItem, s.rowBorder]}
                onPress={() => setPickerField(pref)}
              >
                <Text style={s.rowLabel}>{pref.label}</Text>
                <View style={s.rowRight}>
                  <Text style={s.rowValueAccent}>{prefs[pref.key] as string}</Text>
                  <ChevronRight size={14} stroke={theme.colors.textTertiary} strokeWidth={1.8} />
                </View>
              </Pressable>
            ))}

            {/* Theme — inline picker row, wired to ThemeContext */}
            <View style={[s.rowItem, s.rowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
              <Text style={s.rowLabel}>Theme</Text>
              <View style={s.themeChips}>
                {themeOptions.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[s.themeChip, appTheme === opt.value && s.themeChipActive]}
                    onPress={() => setAppTheme(opt.value)}
                  >
                    {appTheme === opt.value && <Check size={11} stroke={theme.colors.bgPrimary} strokeWidth={2.5} />}
                    <Text style={[s.themeChipText, appTheme === opt.value && s.themeChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notifications toggle */}
            <Pressable style={s.rowItem} onPress={handleNotifications}>
              <Text style={s.rowLabel}>Notifications</Text>
              <View style={s.rowRight}>
                <View style={[s.togglePill, prefs.notifications && s.togglePillOn]}>
                  <View style={[s.toggleThumb, prefs.notifications && s.toggleThumbOn]} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Export my data ───────────────────────────────────────── */}
        <View style={s.exportCard}>
          <View style={s.exportLeft}>
            <Text style={s.exportTitle}>Export my data</Text>
            <Text style={s.exportSub}>
              CSV or JSON · {userProfile.totalBrews} shot{userProfile.totalBrews !== 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable style={s.exportBtn} onPress={handleExport}>
            <Download size={14} stroke="#FFF" strokeWidth={2} />
            <Text style={s.exportBtnText}>Export</Text>
          </Pressable>
        </View>

        {/* ── Sign out ─────────────────────────────────────────────── */}
        <Pressable style={s.signOutBtn} onPress={handleSignOut}>
          <LogOut size={16} stroke={theme.colors.error} strokeWidth={1.8} />
          <Text style={s.signOutText}>
            {isGuest ? 'Exit guest mode' : 'Sign out'}
          </Text>
        </Pressable>

        <Text style={s.versionText}>Dial It In · v2.4.0</Text>

        <View style={{ height: 120 }} />
      </ScrollView>

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

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, gap: 20 },

  // Direction A: Fraunces serif title
  title: { fontFamily: fonts.serif, fontSize: 28, color: theme.colors.textPrimary, letterSpacing: -0.5 },

  // Avatar card — flat, rule border (Direction A: no rounded xl, no shadow)
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.bgSecondary,
    padding: 16, borderWidth: 1, borderColor: theme.colors.divider,
  },
  avatar: {
    width: 62, height: 62, borderRadius: 31,   // 31px circle (spec)
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: { fontFamily: fonts.serifItalic, fontSize: 28, color: theme.colors.bgPrimary },
  avatarInfo:    { flex: 1, gap: 2 },
  avatarName:    { fontFamily: fonts.serif, fontSize: 22, color: theme.colors.textPrimary, letterSpacing: -0.3 },
  avatarSub:     { fontFamily: fonts.body, fontSize: 12, color: theme.colors.textSecondary },
  avatarEmail:   { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },

  // Section header — mono caps (Direction A style)
  sectionTitle: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.2, marginBottom: 4 },

  // Row list — flat, 1px rule borders (no rounded corners)
  rowList: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  rowItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  rowBorder:     { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  rowLabel:      { fontFamily: fonts.body, fontSize: 14, color: theme.colors.textSecondary },
  rowRight:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:      { fontFamily: fonts.body, fontSize: 14, color: theme.colors.textPrimary },
  rowValueAccent:{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.accentDark },

  // Theme chips
  themeChips:        { flexDirection: 'row', gap: 8 },
  themeChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.bgPrimary },
  themeChipActive:   { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  themeChipText:     { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 0.1 },
  themeChipTextActive: { color: theme.colors.bgPrimary, fontWeight: '600' },

  // Toggle switch
  togglePill:    { width: 44, height: 26, borderRadius: 13, backgroundColor: theme.colors.divider, padding: 2, justifyContent: 'center' },
  togglePillOn:  { backgroundColor: theme.colors.positive },
  toggleThumb:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', ...theme.shadow.xs },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Export card — flat, Direction A
  exportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.bgSecondary,
    padding: 16, borderWidth: 1, borderColor: theme.colors.divider,
  },
  exportLeft:    { flex: 1, gap: 3 },
  exportTitle:   { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  exportSub:     { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.1 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: theme.colors.textPrimary,   // flat ink button (Direction A)
  },
  exportBtnText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600', color: theme.colors.bgPrimary, letterSpacing: 0.1 },

  // Sign out — flat, rule border
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 46,
    borderWidth: 1, borderColor: theme.colors.divider,
    backgroundColor: theme.colors.bgSecondary,
  },
  signOutText: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.error, letterSpacing: 0.1 },
  versionText: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, textAlign: 'center', letterSpacing: 0.2 },
})

// ── Modal styles ──────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.40)' },
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
