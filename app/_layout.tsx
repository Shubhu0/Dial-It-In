import '../global.css'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready,   setReady]   = useState(false)
  const router   = useRouter()
  const segments = useSegments()

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

    const onAuthScreen = segments[0] === 'auth'

    if (!session && !onAuthScreen) {
      router.replace('/auth')
    } else if (session && onAuthScreen) {
      router.replace('/(tabs)')
    }
  }, [session, ready, segments])

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
