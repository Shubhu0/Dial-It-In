import '../global.css'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready,   setReady]   = useState(false)
  const router   = useRouter()
  const segments = useSegments()
  const isGuest  = useStore(s => s.isGuest)

  // ── Bootstrap: restore existing session ────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setReady(true)
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Route guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return

    const onAuthScreen   = segments[0] === 'auth'
    const isAuthenticated = !!session || isGuest

    if (!isAuthenticated && !onAuthScreen) {
      router.replace('/auth')
    } else if (isAuthenticated && onAuthScreen) {
      router.replace('/(tabs)')
    }
  }, [session, ready, segments, isGuest])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
