import { Tabs } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Gauge, TrendingUp } from 'lucide-react-native'
import { theme } from '@/constants/theme'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      screenOptions={{ headerShown: false }}
    />
  )
}

const LABELS: Record<string, string> = {
  index:    'Home',
  dial:     'Dial',
  progress: 'Progress',
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? theme.colors.accent : theme.colors.textSecondary
  const size  = 22
  if (name === 'index')    return <Home       size={size} stroke={color} />
  if (name === 'dial')     return <Gauge      size={size} stroke={color} />
  if (name === 'progress') return <TrendingUp size={size} stroke={color} />
  return null
}

function CustomTabBar({ state, navigation, insets }: any) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 4 }]}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => navigation.navigate(route.name)}
          >
            <TabIcon name={route.name} focused={focused} />
            <Text style={[styles.label, focused && styles.labelActive]}>
              {LABELS[route.name]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection:        'row',
    backgroundColor:      '#FDF6ED',
    borderTopWidth:       1,
    borderTopColor:       theme.colors.divider,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingTop:           12,
    paddingHorizontal:    20,
    shadowColor:          '#3A2E2A',
    shadowOffset:         { width: 0, height: -2 },
    shadowOpacity:        0.06,
    shadowRadius:         8,
    elevation:            8,
  },
  tab:         { flex: 1, alignItems: 'center', gap: 3 },
  label:       { fontSize: 10, color: theme.colors.textSecondary },
  labelActive: { color: theme.colors.accent, fontWeight: '600' },
})
