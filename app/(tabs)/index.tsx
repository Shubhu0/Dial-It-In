import React, { useEffect, useState } from 'react'
import {
  ScrollView, View, Text, Pressable,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Search, X, ChevronRight, Plus } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { BagArt } from '@/components/BagArt'

// ── helpers ───────────────────────────────────────────────────────────────────

function datestamp() {
  const d   = new Date()
  const wd  = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const mo  = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const dy  = d.getDate()
  const hr  = d.getHours()
  const mn  = String(d.getMinutes()).padStart(2, '0')
  const ap  = hr < 12 ? 'a' : 'p'
  const h12 = hr % 12 || 12
  return `${wd} · ${mo} ${dy} · ${h12}:${mn}${ap}`
}

function greetingWord() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function tasteColor(pos: number) {
  if (pos < 45) return theme.colors.sour
  if (pos > 55) return theme.colors.bitter
  return theme.colors.balanced
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()
  const {
    recentBrews, fetchRecentBrews,
    selectedBean, setBean, applyBestBrew,
    beans, fetchBeans,
    userProfile, isGuest,
  } = useStore()

  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName,    setUserName]    = useState('Maya')

  useEffect(() => {
    fetchRecentBrews(); fetchBeans()
    if (!isGuest) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const raw = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email?.split('@')[0]
            || 'there'
          setUserName(raw.charAt(0).toUpperCase() + raw.slice(1))
        }
      })
    }
  }, [isGuest])

  const filteredBeans = searchQuery.trim()
    ? beans.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.roaster?.toLowerCase().includes(searchQuery.toLowerCase()))
    : beans

  const filteredBrews = searchQuery.trim()
    ? recentBrews.filter(b =>
        b.beans?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentBrews

  const lastBrew   = recentBrews[0] ?? null
  const todayCount = recentBrews.filter(b =>
    new Date(b.created_at ?? '').toDateString() === new Date().toDateString()
  ).length

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Paper grain overlay */}
        <View style={s.grain} pointerEvents="none" />

        {/* ── Top bar ──────────────────────────────────────────────── */}
        {searchOpen ? (
          <View style={s.searchRow}>
            <Search size={14} stroke={theme.colors.textTertiary} strokeWidth={1.6} />
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search beans or brews…"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus autoCapitalize="none"
            />
            <Pressable hitSlop={8} onPress={() => { setSearchOpen(false); setSearchQuery('') }}>
              <X size={14} stroke={theme.colors.textTertiary} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <View style={s.topBar}>
            <View>
              <Text style={s.datestamp}>{datestamp()}</Text>
              <Text style={s.greeting}>
                {'Good ' + greetingWord() + ','}
              </Text>
              <Text style={s.greetingName}>
                <Text style={s.greetingItalic}>{userName}.</Text>
              </Text>
            </View>
            <Pressable onPress={() => setSearchOpen(true)} hitSlop={8}>
              <Search size={18} stroke={theme.colors.textTertiary} strokeWidth={1.6} />
            </Pressable>
          </View>
        )}

        {/* ── Now Dialing card ──────────────────────────────────────── */}
        <View>
          {/* Section header — mono caps with flanking hairlines */}
          <View style={s.sectionStamp}>
            <View style={s.stampLine} />
            <Text style={s.sectionStampText}>NOW DIALING</Text>
            <View style={s.stampLine} />
          </View>

          {selectedBean ? (
            <View style={s.nowDialingCard}>
              <Pressable style={s.cardTop} onPress={() => router.push(`/bean/${selectedBean.id}`)}>
                <BagArt roastLevel={selectedBean.roast_level} roasterName={selectedBean.roaster} width={58} height={74} borderRadius={3} />
                <View style={s.cardInfo}>
                  <Text style={s.cardBeanName} numberOfLines={1}>{selectedBean.name}</Text>
                  <Text style={s.cardBeanOrigin} numberOfLines={1}>
                    {selectedBean.origin?.split(',')[0] ?? selectedBean.roaster ?? ''}
                  </Text>
                  {/* Dial params row */}
                  {lastBrew && (
                    <Text style={s.dialParams}>
                      D{lastBrew.dose_g ?? '–'} · Y{lastBrew.yield_g ?? '–'} · {lastBrew.time_s ?? '–'}s · G{lastBrew.grind_setting ?? '–'}
                    </Text>
                  )}
                </View>
              </Pressable>

              {/* Pull shot CTA — full width, ink bg, mono caps */}
              <Pressable style={s.pullBtn} onPress={() => router.push('/(tabs)/dial')}>
                <Text style={s.pullBtnText}>PULL A SHOT →</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={s.emptyCard} onPress={() => router.push('/(tabs)/beans')}>
              <Text style={s.emptyTitle}>No bean selected</Text>
              <Text style={s.emptyHint}>Head to Beans and activate one</Text>
            </Pressable>
          )}
        </View>

        {/* ── Today's page ─────────────────────────────────────────── */}
        {filteredBrews.length > 0 && (
          <View>
            <View style={s.sectionStamp}>
              <View style={s.stampLine} />
              <Text style={s.sectionStampText}>TODAY'S PAGE</Text>
              <View style={s.stampLine} />
            </View>

            <View style={s.todayList}>
              {/* Table header */}
              <View style={[s.todayRow, s.todayRowHeader]}>
                <Text style={[s.todayCol, { width: 36 }]}>#</Text>
                <Text style={[s.todayCol, { width: 52 }]}>TIME</Text>
                <Text style={[s.todayCol, { flex: 1 }]}>BEAN</Text>
                <Text style={[s.todayCol, { width: 60, textAlign: 'right' }]}>RATING</Text>
              </View>
              {filteredBrews.slice(0, 4).map((brew, i) => {
                const pos   = brew.taste_position ?? 50
                const color = tasteColor(pos)
                const time  = brew.created_at
                  ? new Date(brew.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : ''
                const num = String(filteredBrews.length - i).padStart(3, '0')
                return (
                  <Pressable
                    key={brew.id}
                    style={[s.todayRow, i > 0 && s.todayRowBorder]}
                    onPress={() => router.push(`/brew/${brew.id}`)}
                  >
                    <Text style={[s.todayCol, { width: 36, color: theme.colors.accent }]}>▷{num}</Text>
                    <Text style={[s.todayCol, { width: 52 }]}>{time}</Text>
                    <Text style={[s.todayCol, { flex: 1 }]} numberOfLines={1}>
                      {brew.beans?.name ?? '—'}
                    </Text>
                    <View style={[s.todayCol, { width: 60, flexDirection: 'row', justifyContent: 'flex-end' }]}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <Text key={j} style={{ fontSize: 11, color: j < (brew.rating ?? 4) ? theme.colors.accent : theme.colors.divider }}>
                          ★
                        </Text>
                      ))}
                    </View>
                  </Pressable>
                )
              })}
              {filteredBrews.length > 4 && (
                <Pressable style={s.seeMoreRow} onPress={() => router.push('/(tabs)/log')}>
                  <Text style={s.seeMoreText}>See all {filteredBrews.length} entries →</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── Your beans chip rail ──────────────────────────────────── */}
        {filteredBeans.length > 0 && (
          <View>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Your beans</Text>
              <Pressable onPress={() => router.push('/(tabs)/beans')}>
                <Text style={s.sectionLink}>See all</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.beanRail}>
              {filteredBeans.map(bean => {
                const isActive = selectedBean?.id === bean.id
                return (
                  <Pressable
                    key={bean.id}
                    style={[s.beanChip, isActive && s.beanChipActive]}
                    onPress={() => { setBean(bean); applyBestBrew(bean.id) }}
                  >
                    <BagArt roastLevel={bean.roast_level} roasterName={bean.roaster} width={28} height={36} borderRadius={2} />
                    <View style={{ maxWidth: 100 }}>
                      <Text style={[s.chipName, isActive && { color: theme.colors.accent }]} numberOfLines={1}>
                        {bean.name}
                      </Text>
                      <Text style={s.chipSub} numberOfLines={1}>
                        {bean.origin?.split(',')[0] ?? bean.roaster ?? ''}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, gap: 22, position: 'relative' },

  // Paper grain
  grain: {
    position:        'absolute',
    top:             0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(90,60,20,0.025)',
    pointerEvents:   'none',
  } as any,

  // Top bar
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  datestamp:   { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.18 },
  greeting:    { fontFamily: fonts.serif, fontSize: 30, color: theme.colors.textPrimary, letterSpacing: -0.5, lineHeight: 34, marginTop: 2 },
  greetingName:{ fontFamily: fonts.serif, fontSize: 30, color: theme.colors.textPrimary, letterSpacing: -0.5, lineHeight: 34 },
  greetingItalic: { fontFamily: fonts.serifItalic, color: theme.colors.textSecondary },

  // Search row
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.textPrimary,
    paddingBottom: 6,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: theme.colors.textPrimary },

  // Section stamp — mono caps with hairlines
  sectionStamp: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stampLine:    { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  sectionStampText: { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.accent, letterSpacing: 0.25 },

  // Now Dialing card — flat, rule border
  nowDialingCard: { borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.bgSecondary },
  cardTop: { flexDirection: 'row', padding: 16, gap: 14, alignItems: 'flex-start' },
  cardInfo:       { flex: 1, gap: 5 },
  cardBeanName:   { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary, letterSpacing: -0.3 },
  cardBeanOrigin: { fontFamily: fonts.bodyItalic, fontSize: 13, color: theme.colors.textSecondary },
  dialParams:     { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.08, marginTop: 4 },

  // Pull CTA — flat, ink bg, mono caps
  pullBtn: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
    flexDirection: 'row', gap: 6,
  },
  pullBtnText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '600', color: theme.colors.bgPrimary, letterSpacing: 0.2 },

  emptyCard: {
    borderWidth: 1, borderColor: theme.colors.divider,
    padding: 28, alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.bgSecondary,
  },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 18, color: theme.colors.textPrimary },
  emptyHint:  { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textSecondary },

  // Today's page — ruled table
  todayList: { borderWidth: 1, borderColor: theme.colors.divider },
  todayRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  todayRowHeader: { backgroundColor: theme.colors.bgPrimary, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  todayRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.dividerSoft },
  todayCol: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 0.05 },
  seeMoreRow: { borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingHorizontal: 12, paddingVertical: 8 },
  seeMoreText:{ fontFamily: fonts.mono, fontSize: 10, color: theme.colors.accentDark },

  // Section row
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary, letterSpacing: -0.3 },
  sectionLink:  { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.accentDark },

  // Bean chip rail
  beanRail: { gap: 0, paddingBottom: 2 },
  beanChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, borderColor: theme.colors.divider,
    paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8,
  },
  beanChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.bgPrimary },
  chipName: { fontFamily: fonts.serif, fontSize: 13, color: theme.colors.textPrimary },
  chipSub:  { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, marginTop: 1 },
})
