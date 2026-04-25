import { Tabs } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, BookOpen, Coffee, BarChart2, User } from 'lucide-react-native'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      tabBar={(props) => <FieldbookTabBar {...props} insets={insets} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home'  }} />
      <Tabs.Screen name="log"      options={{ title: 'Log'   }} />
      <Tabs.Screen name="beans"    options={{ title: 'Beans' }} />
      <Tabs.Screen name="progress" options={{ title: 'Stats' }} />
      <Tabs.Screen name="profile"  options={{ title: 'You'   }} />
      <Tabs.Screen name="dial"     options={{ href: null }}    />
    </Tabs>
  )
}

const TABS = [
  { name: 'index',    label: 'HOME',  Icon: Home      },
  { name: 'log',      label: 'LOG',   Icon: BookOpen  },
  { name: 'beans',    label: 'BEANS', Icon: Coffee    },
  { name: 'progress', label: 'STATS', Icon: BarChart2 },
  { name: 'profile',  label: 'YOU',   Icon: User      },
]

const HIDDEN_ROUTES = new Set(['dial'])

// Direction A: flat bottom tab bar — paper-2 bg, hairline top border,
// icon + mono caps label, active = accent tint
function FieldbookTabBar({ state, navigation, insets }: any) {
  const activeRoute = state.routes[state.index]?.name
  if (HIDDEN_ROUTES.has(activeRoute)) return null

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes
        .filter((r: any) => TABS.some(t => t.name === r.name))
        .map((route: any) => {
          const tabIdx  = state.routes.indexOf(route)
          const focused = state.index === tabIdx
          const tab     = TABS.find(t => t.name === route.name)!
          const { Icon, label } = tab
          const color   = focused ? theme.colors.accent : theme.colors.textTertiary

          return (
            <Pressable
              key={route.key}
              style={s.tab}
              onPress={() => navigation.navigate(route.name)}
              hitSlop={4}
            >
              <Icon size={18} stroke={color} strokeWidth={focused ? 2 : 1.6} />
              <Text style={[s.label, { color }]}>{label}</Text>
            </Pressable>
          )
        })}
    </View>
  )
}

const s = StyleSheet.create({
  // Direction A: flat, paper-2 background, hairline top border
  bar: {
    flexDirection:   'row',
    backgroundColor: theme.colors.bgSecondary,   // paper-2 = #EBE0C8
    borderTopWidth:  1,
    borderTopColor:  theme.colors.divider,        // rule = #D9CCAE
    paddingTop:      10,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            3,
    paddingVertical: 2,
  },
  // Mono caps label — Direction A style
  label: {
    fontFamily:    fonts.mono,
    fontSize:      9,
    fontWeight:    '600',
    letterSpacing: 0.08,
  },
})
