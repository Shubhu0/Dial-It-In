import React, { useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { theme } from '@/constants/theme'
import { useStore } from '@/lib/store'
import { fonts } from '@/constants/fonts'
import Svg, { Circle, Line } from 'react-native-svg'

type Mode = 'signin' | 'signup'

const SAFE_MESSAGES: Record<string, string> = {
  'Invalid login credentials':                'Incorrect email or password.',
  'Email not confirmed':                      'Please confirm your email before signing in.',
  'User already registered':                  'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
}

// DialMark — concentric rings + center dot + upward tick (Direction A: ink color)
function DialMarkSvg({ size = 52 }: { size?: number }) {
  const c = size / 2, r = c - 1
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r}         fill="none" stroke={theme.colors.textPrimary} strokeWidth={1.4} />
      <Circle cx={c} cy={c} r={r * 0.62}  fill="none" stroke={theme.colors.textPrimary} strokeWidth={1.0} opacity={0.55} />
      <Circle cx={c} cy={c} r={r * 0.18}  fill={theme.colors.textPrimary} />
      <Line x1={c} y1={2} x2={c} y2={c * 0.42}
        stroke={theme.colors.accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

export default function AuthScreen() {
  const setGuestMode = useStore(s => s.setGuestMode)
  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  async function handleSubmit() {
    setError(null); setSuccess(null)
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) { setSuccess('Account created! Check your email to confirm, then sign in.'); setMode('signin') }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
    } catch (e: any) {
      setError(SAFE_MESSAGES[e?.message] ?? 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Stamp corners */}
          <View style={s.stampRow}>
            <Text style={s.stamp}>Vol. 01</Text>
            <Text style={s.stamp}>N°42</Text>
          </View>

          {/* Hero */}
          <View style={s.hero}>
            <DialMarkSvg size={52} />
            <Text style={s.heroTitle}>
              Dial <Text style={s.heroItalic}>it</Text> In
            </Text>
            {/* Hairline divider */}
            <View style={s.hairline} />
            <Text style={s.heroTagline}>
              "A fieldbook for the shots that matter."
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={s.modeRow}>
            {(['signin', 'signup'] as Mode[]).map(m => (
              <Pressable
                key={m}
                style={[s.modeBtn, mode === m && s.modeBtnActive]}
                onPress={() => { setMode(m); setError(null); setSuccess(null) }}
              >
                <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Fields — underline only (Direction A) */}
          <View style={s.fields}>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textTertiary}
                value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address" autoComplete="email"
              />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={s.input}
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                placeholderTextColor={theme.colors.textTertiary}
                value={password} onChangeText={setPassword}
                secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </View>
          </View>

          {error   && <Text style={s.errorText}>{error}</Text>}
          {success && <Text style={s.successText}>{success}</Text>}

          {/* Primary CTA — ink bg, mono caps */}
          <Pressable
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={theme.colors.bgPrimary} />
              : <Text style={s.primaryBtnText}>
                  {mode === 'signin' ? 'OPEN THE FIELDBOOK →' : 'CREATE ACCOUNT →'}
                </Text>}
          </Pressable>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>OR</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Guest */}
          <Pressable style={s.guestBtn} onPress={() => setGuestMode(true)} disabled={loading}>
            <Text style={s.guestBtnText}>Continue as guest</Text>
          </Pressable>

          <Text style={s.footer}>
            {mode === 'signin' ? 'New around here? ' : 'Already have a fieldbook? '}
            <Text style={s.footerLink} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}>
              {mode === 'signin' ? 'Start your first page' : 'Sign in'}
            </Text>
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 40, gap: 24 },

  // Stamp corners (mono caps, corners)
  stampRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stamp:    { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.25 },

  // Hero
  hero:       { alignItems: 'center', gap: 14 },
  heroTitle: {
    fontFamily:    fonts.serif,
    fontSize:      56,
    lineHeight:    54,
    letterSpacing: -1.5,
    color:         theme.colors.textPrimary,
    fontWeight:    '400',
    marginTop:     10,
  },
  heroItalic: { fontFamily: fonts.serifItalic, color: theme.colors.accent },
  hairline:   { width: 88, height: 1, backgroundColor: theme.colors.divider },
  heroTagline:{ fontFamily: fonts.bodyItalic, fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Mode toggle — flat, rule border
  modeRow: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.divider },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.bgPrimary },
  modeBtnActive:     { backgroundColor: theme.colors.textPrimary },
  modeBtnText:       { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 0.1 },
  modeBtnTextActive: { color: theme.colors.bgPrimary },

  // Fields — underline only (Direction A spec)
  fields:     { gap: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.18 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.textPrimary,
    paddingBottom:     6,
    fontSize:          16,
    fontFamily:        fonts.body,
    color:             theme.colors.textPrimary,
    backgroundColor:   'transparent',
  },

  errorText:   { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.error,    lineHeight: 16 },
  successText: { fontFamily: fonts.mono, fontSize: 11, color: theme.colors.balanced, lineHeight: 16 },

  // Primary button — ink bg, mono caps, radius 2 (Direction A)
  primaryBtn: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical:   15,
    borderRadius:      2,
    alignItems:        'center',
    justifyContent:    'center',
  },
  primaryBtnText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '600', color: theme.colors.bgPrimary, letterSpacing: 0.18 },

  // Divider
  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  dividerText: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.2 },

  // Guest button — outline, flat
  guestBtn: {
    borderWidth: 1, borderColor: theme.colors.divider,
    paddingVertical: 13, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  guestBtnText: { fontFamily: fonts.body, fontSize: 14, color: theme.colors.textSecondary },

  footer:     { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  footerLink: { color: theme.colors.accentDark, textDecorationLine: 'underline' as const },
})
