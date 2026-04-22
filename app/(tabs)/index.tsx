import React, { useEffect } from 'react'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Plus, TrendingUp, Coffee, ChevronRight, LogOut } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { Alert } from 'react-native'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { BeanChip, LastCoffeeCard, SessionCard } from '@/components/CoffeeCard'
import { ImprovementBadge } from '@/components/ProgressChart'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function trendIcon(trend: string) {
  if (trend === 'improving')  return '📈'
  if (trend === 'regressing') return '📉'
  return '→'
}

export default function HomeScreen() {
  const router = useRouter()
  const {
    recentBrews, fetchRecentBrews,
    selectedBean, setBean, applyBestBrew,
    beans, fetchBeans,
    userProfile,
  } = useStore()

  useEffect(() => {
    fetchRecentBrews()
    fetchBeans()
  }, [])

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  const lastBrew = recentBrews[0] ?? null

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting ──────────────────────────────────────────────────────── */}
        <View style={styles.greetRow}>
          <View style={styles.greetLeft}>
            <Image
              source={require('../../assets/favicon.png')}
              style={styles.logoIcon}
            />
            <View>
              <Text style={styles.greetSub}>{greeting()}</Text>
              <Text style={styles.greetName}>Dial It In</Text>
            </View>
          </View>
          <View style={styles.greetActions}>
            {userProfile.totalBrews > 0 && (
              <View style={styles.statsChip}>
                <Text style={styles.statsText}>{trendIcon(userProfile.trend)}</Text>
                <Text style={styles.statsLabel}>{userProfile.totalBrews} brews</Text>
              </View>
            )}
            <Pressable onPress={handleSignOut} style={styles.signOutBtn} hitSlop={8}>
              <LogOut size={16} stroke={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Hero card ──────────────────────────────────────────────────────── */}
        <LastCoffeeCard
          bean={selectedBean}
          lastBrew={lastBrew}
          onPress={() => selectedBean
            ? router.push(`/bean/${selectedBean.id}`)
            : router.push('/bean/new')}
        />

        {/* Improvement badge ──────────────────────────────────────────────── */}
        {userProfile.trajectory.length >= 2 && (
          <View style={styles.improvementRow}>
            <ImprovementBadge trajectory={userProfile.trajectory} />
            <Text style={styles.improvementHint}>
              {userProfile.trend === 'improving' ? "You're getting closer!" :
               userProfile.trend === 'stable'    ? "Consistent brews" :
               "Try adjusting your technique"}
            </Text>
          </View>
        )}

        {/* Your beans ─────────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your beans</Text>
          <Pressable onPress={() => router.push('/bean/new')} style={styles.addBtn}>
            <Plus size={14} stroke={theme.colors.accent} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

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
              <BeanChip
                bean={item}
                isSelected={selectedBean?.id === item.id}
                onPress={() => {
                  setBean(item)
                  applyBestBrew(item.id)
                  router.push('/(tabs)/dial')
                }}
              />
            )}
            contentContainerStyle={styles.listPad}
          />
        )}

        {/* Recent sessions ─────────────────────────────────────────────────── */}
        {recentBrews.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent sessions</Text>
              <Pressable onPress={() => router.push('/(tabs)/progress')} style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={12} stroke={theme.colors.accent} />
              </Pressable>
            </View>
            <FlatList
              data={recentBrews.slice(0, 6)}
              keyExtractor={(b) => b.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <SessionCard
                  brew={item}
                  onPress={() => router.push(`/brew/${item.id}`)}
                />
              )}
              contentContainerStyle={styles.listPad}
            />
          </>
        )}

        {/* Quick actions ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.qaGrid}>
          <Pressable style={[styles.qaCard, styles.qaCardPrimary]} onPress={() => router.push('/(tabs)/dial')}>
            <Coffee size={22} stroke="#FFF" />
            <Text style={[styles.qaTitle, { color: '#FFF' }]}>New brew</Text>
            <Text style={[styles.qaSub, { color: 'rgba(255,255,255,0.75)' }]}>Log a session</Text>
          </Pressable>
          <Pressable style={styles.qaCard} onPress={() => router.push('/(tabs)/progress')}>
            <TrendingUp size={22} stroke={theme.colors.accent} />
            <Text style={styles.qaTitle}>Progress</Text>
            <Text style={styles.qaSub}>View trajectory</Text>
          </Pressable>
        </View>

        {/* CTA add brew ───────────────────────────────────────────────────── */}
        <Pressable style={styles.addBrewCTA} onPress={() => router.push('/(tabs)/dial')}>
          <Plus size={20} stroke="#FFF" />
          <Text style={styles.addBrewCTAText}>Add Brew</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16, paddingTop: 8 },

  greetRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     8,
  },
  greetLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  logoIcon: {
    width:        44,
    height:       44,
    borderRadius: 10,
  },
  greetSub:     { fontSize: 14, color: theme.colors.textSecondary },
  greetName:    { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary },
  greetActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signOutBtn: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: theme.colors.card,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     theme.colors.divider,
  },
  statsChip: {
    backgroundColor: theme.colors.accentMuted,
    borderRadius:    theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical:    6,
    alignItems:      'center',
    gap: 2,
  },
  statsText:  { fontSize: 14 },
  statsLabel: { fontSize: 10, color: theme.colors.accentDark, fontWeight: '600' },

  improvementRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginTop:     -6,
  },
  improvementHint: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },

  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   -6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  addBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  addBtnText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
  seeAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 12, color: theme.colors.accent, fontWeight: '500' },

  listPad:    { paddingRight: 20 },

  emptyBeans: {
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.lg,
    borderWidth:     1.5,
    borderColor:     theme.colors.divider,
    borderStyle:     'dashed',
    padding:         16,
    alignItems:      'center',
  },
  emptyBeansText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },

  qaGrid:       { flexDirection: 'row', gap: 12 },
  qaCard: {
    flex:            1,
    backgroundColor: theme.colors.card,
    borderRadius:    theme.radius.xl,
    padding:         16,
    gap:             4,
    ...theme.shadow.sm,
  },
  qaCardPrimary: { backgroundColor: theme.colors.accentDark },
  qaTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 6 },
  qaSub:   { fontSize: 11, color: theme.colors.textSecondary },

  addBrewCTA: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    height:          54,
    borderRadius:    theme.radius.xl,
    backgroundColor: theme.colors.accent,
    ...theme.shadow.md,
  },
  addBrewCTAText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
