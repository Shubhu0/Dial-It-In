import React, { useEffect } from 'react'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { LastCoffeeCard } from '@/components/LastCoffeeCard'
import { SessionCard } from '@/components/SessionCard'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

export default function HomeScreen() {
  const router = useRouter()
  const { recentBrews, fetchRecentBrews, selectedBean, beans, fetchBeans } = useStore()

  useEffect(() => {
    fetchRecentBrews()
    fetchBeans()
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetSection}>
          <Text style={styles.greetSub}>{greeting()}</Text>
          <Text style={styles.greetName}>Shubh</Text>
          <Text style={styles.greetHint}>
            {recentBrews.length > 0
              ? `${recentBrews.length} brews logged`
              : 'Start your first brew session'}
          </Text>
        </View>

        {/* Last coffee card */}
        <LastCoffeeCard bean={selectedBean} />

        {/* Recent sessions */}
        {recentBrews.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Recent sessions</Text>
            <FlatList
              data={recentBrews}
              keyExtractor={(b) => b.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <SessionCard brew={item} />}
              contentContainerStyle={styles.sessionList}
            />
          </>
        )}

        {/* Your beans */}
        <Text style={styles.sectionHeader}>Your beans</Text>
        {beans.length === 0 ? (
          <Pressable style={styles.emptyBeans} onPress={() => router.push('/bean/new')}>
            <Text style={styles.emptyBeansText}>+ Add your first bean</Text>
          </Pressable>
        ) : (
          <FlatList
            data={beans}
            keyExtractor={(b) => b.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable style={styles.beanChip} onPress={() => router.push(`/bean/${item.id}`)}>
                <Text style={styles.beanChipName} numberOfLines={1}>{item.name}</Text>
                {item.origin ? <Text style={styles.beanChipSub}>{item.origin}</Text> : null}
              </Pressable>
            )}
            contentContainerStyle={styles.beanList}
          />
        )}

        {/* Quick actions */}
        <Text style={styles.sectionHeader}>Quick actions</Text>
        <View style={styles.qaRow}>
          <Pressable style={styles.qaBtn} onPress={() => router.push('/(tabs)/dial')}>
            <Text style={styles.qaBtnText}>New brew</Text>
          </Pressable>
          <Pressable style={styles.qaBtn} onPress={() => router.push('/(tabs)/progress')}>
            <Text style={styles.qaBtnText}>Progress</Text>
          </Pressable>
          <Pressable style={styles.qaBtn} onPress={() => router.push('/bean/new')}>
            <Text style={styles.qaBtnText}>Add bean</Text>
          </Pressable>
        </View>

        {/* Full-width Add Brew — appears at the bottom of scroll content */}
        <Pressable style={styles.addBrewBtn} onPress={() => router.push('/(tabs)/dial')}>
          <Plus size={20} stroke="#FFFFFF" />
          <Text style={styles.addBrewText}>Add Brew</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll:       { flex: 1 },
  content:      { paddingHorizontal: theme.spacing.standard, paddingBottom: 24 },
  greetSection: { paddingTop: 16, marginBottom: theme.spacing.base },
  greetSub:     { fontSize: 15, color: theme.colors.textSecondary },
  greetName:    { fontSize: 26, fontWeight: '700', color: theme.colors.textPrimary },
  greetHint:    { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  sectionHeader: {
    fontSize:   14,
    fontWeight: '600',
    color:      theme.colors.textPrimary,
    marginTop:  20,
    marginBottom: 10,
  },
  sessionList: { paddingRight: theme.spacing.standard },
  qaRow:       { flexDirection: 'row', gap: 8 },
  qaBtn: {
    flex:            1,
    height:          46,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     theme.colors.divider,
    alignItems:      'center',
    justifyContent:  'center',
  },
  qaBtnText: { fontSize: 12, fontWeight: '500', color: theme.colors.textPrimary },
  emptyBeans: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     theme.colors.divider,
    borderStyle:     'dashed',
    padding:         16,
    alignItems:      'center',
  },
  emptyBeansText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
  beanList:    { paddingRight: theme.spacing.standard },
  beanChip: {
    backgroundColor: theme.colors.card,
    borderRadius:    14,
    padding:         12,
    marginRight:     10,
    minWidth:        100,
    maxWidth:        140,
  },
  beanChipName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  beanChipSub:  { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  addBrewBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    height:          52,
    borderRadius:    16,
    backgroundColor: theme.colors.accent,
    marginTop:       24,
  },
  addBrewText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
