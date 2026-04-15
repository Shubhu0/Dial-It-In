import '../global.css'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setReady(true); return }
      // Try anonymous sign-in — if it fails (not enabled in Supabase dashboard)
      // we still show the app; auth errors surface per-action instead.
      supabase.auth.signInAnonymously().catch(() => {}).finally(() => setReady(true))
    })
  }, [])

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
