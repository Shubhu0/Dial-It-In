import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/constants/theme'
import { useStore } from '@/lib/store'

type Mode = 'signin' | 'signup'

export default function AuthScreen() {
  const router        = useRouter()
  const setGuestMode  = useStore(s => s.setGuestMode)

  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setSuccess(null)

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.session) {
          // Email confirmation is disabled — user is signed in immediately.
          // _layout.tsx onAuthStateChange will redirect to (tabs).
        } else {
          // Email confirmation is enabled — ask them to check their inbox.
          setSuccess('Account created! Check your email to confirm, then sign in.')
          setMode('signin')
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        // _layout.tsx onAuthStateChange will redirect to (tabs)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleGuestSignIn() {
    setGuestMode(true)
    // _layout.tsx route guard detects isGuest=true and redirects to (tabs)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>☕</Text>
            <Text style={styles.heroTitle}>Dial It In</Text>
            <Text style={styles.heroSub}>
              Track, learn, and perfect your brew
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Mode toggle */}
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}
                onPress={() => { setMode('signin'); setError(null); setSuccess(null) }}
              >
                <Text style={[styles.modeBtnText, mode === 'signin' && styles.modeBtnTextActive]}>
                  Sign in
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
                onPress={() => { setMode('signup'); setError(null); setSuccess(null) }}
              >
                <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
                  Create account
                </Text>
              </Pressable>
            </View>

            {/* Fields */}
            <View style={styles.fields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </View>
            </View>

            {/* Feedback */}
            {error   && <Text style={styles.errorText}>{error}</Text>}
            {success && <Text style={styles.successText}>{success}</Text>}

            {/* Primary button */}
            <Pressable
              style={[styles.primaryBtn, loading && styles.primaryBtnLoading]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.primaryBtnText}>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
              }
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest button */}
            <Pressable
              style={styles.guestBtn}
              onPress={handleGuestSignIn}
              disabled={loading}
            >
              <Text style={styles.guestBtnText}>Continue as guest</Text>
            </Pressable>

            <Text style={styles.guestNote}>
              Guest accounts are tied to this device. Create an account to sync across devices.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll: {
    flexGrow:        1,
    justifyContent:  'center',
    paddingHorizontal: 24,
    paddingVertical:   32,
  },

  // Hero
  hero:      { alignItems: 'center', marginBottom: 32 },
  heroIcon:  { fontSize: 52, marginBottom: 10 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  heroSub:   { fontSize: 15, color: theme.colors.textSecondary, marginTop: 4 },

  // Card
  card: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xxl,
    padding:         24,
    ...theme.shadow.md,
  },

  // Mode toggle
  modeRow: {
    flexDirection:   'row',
    backgroundColor: theme.colors.bgPrimary,
    borderRadius:    theme.radius.lg,
    padding:         4,
    marginBottom:    24,
  },
  modeBtn: {
    flex:            1,
    paddingVertical: 9,
    borderRadius:    theme.radius.md,
    alignItems:      'center',
  },
  modeBtnActive: {
    backgroundColor: theme.colors.card,
    ...theme.shadow.xs,
  },
  modeBtnText:       { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  modeBtnTextActive: { color: theme.colors.textPrimary, fontWeight: '700' },

  // Fields
  fields:     { gap: 14, marginBottom: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize:      10,
    fontWeight:    '700',
    color:         theme.colors.textSecondary,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: theme.colors.bgPrimary,
    borderRadius:    theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:        15,
    color:           theme.colors.textPrimary,
    borderWidth:     1.5,
    borderColor:     theme.colors.divider,
  },

  // Feedback
  errorText:   {
    fontSize:     13,
    color:        theme.colors.error,
    marginBottom: 12,
    lineHeight:   18,
  },
  successText: {
    fontSize:        13,
    color:           theme.colors.balanced,
    marginBottom:    12,
    lineHeight:      18,
    fontWeight:      '500',
  },

  // Primary button
  primaryBtn: {
    height:          52,
    borderRadius:    theme.radius.xl,
    backgroundColor: theme.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    ...theme.shadow.sm,
  },
  primaryBtnLoading: { backgroundColor: theme.colors.accentDark },
  primaryBtnText:    { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Divider
  dividerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  dividerText: { fontSize: 12, color: theme.colors.textTertiary },

  // Guest
  guestBtn: {
    height:          48,
    borderRadius:    theme.radius.xl,
    borderWidth:     1.5,
    borderColor:     theme.colors.divider,
    alignItems:      'center',
    justifyContent:  'center',
  },
  guestBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  guestNote: {
    fontSize:    11,
    color:       theme.colors.textTertiary,
    textAlign:   'center',
    marginTop:   12,
    lineHeight:  16,
  },
})
