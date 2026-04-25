import '../global.css'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ThemeProvider } from '@/lib/app-theme'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { useFonts } from 'expo-font'
// Direction A fonts
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
} from '@expo-google-fonts/fraunces'
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader'
// Mono (unchanged)
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  })

  const [session, setSession] = useState<Session | null>(null)
  const [ready,   setReady]   = useState(false)
  const router   = useRouter()
  const segments = useSegments()
  const isGuest  = useStore(s => s.isGuest)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!ready) return
    const onAuthScreen    = segments[0] === 'auth'
    const isAuthenticated = !!session || isGuest
    if (!isAuthenticated && !onAuthScreen) router.replace('/auth')
    else if (isAuthenticated && onAuthScreen) router.replace('/(tabs)')
  }, [session, ready, segments, isGuest])

  if (!ready || !fontsLoaded) return null

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  )
}
