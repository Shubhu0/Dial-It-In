import React, { useEffect, useState } from 'react'
import {
  View, Text, Pressable, FlatList,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Plus, Search, X } from 'lucide-react-native'
import { useStore } from '@/lib/store'
import { Bean } from '@/lib/types'
import { theme } from '@/constants/theme'
import { fonts } from '@/constants/fonts'
import { BagArt } from '@/components/BagArt'

function StatusTag({ dialed }: { dialed: boolean }) {
  return (
    <View style={[st.tag, { borderColor: dialed ? theme.colors.positive : theme.colors.accent }]}>
      <Text style={[st.tagText, { color: dialed ? theme.colors.positive : theme.colors.accent }]}>
        {dialed ? 'DIALED' : 'NEW'}
      </Text>
    </View>
  )
}
const st = StyleSheet.create({
  tag:     { borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 0.15 },
})

export default function BeansScreen() {
  const router  = useRouter()
  const { beans, fetchBeans, setBean, applyBestBrew, selectedBean, recentBrews } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen,  setSearchOpen]  = useState(false)

  useEffect(() => { fetchBeans() }, [])

  const filteredBeans = searchQuery.trim()
    ? beans.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.roaster?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.origin?.toLowerCase().includes(searchQuery.toLowerCase()))
    : beans

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.grain} pointerEvents="none" />

      {/* Header */}
      {searchOpen ? (
        <View style={s.searchRow}>
          <Search size={14} stroke={theme.colors.textTertiary} strokeWidth={1.6} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search beans…"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus autoCapitalize="none"
          />
          <Pressable hitSlop={8} onPress={() => { setSearchOpen(false); setSearchQuery('') }}>
            <X size={14} stroke={theme.colors.textTertiary} strokeWidth={2} />
          </Pressable>
        </View>
      ) : (
        <View style={s.header}>
          <View>
            <Text style={s.title}>The Shelf</Text>
            <Text style={s.subtitle}>
              {searchQuery.trim()
                ? `${filteredBeans.length} of ${beans.length} bags`
                : `${beans.length} bag${beans.length !== 1 ? 's' : ''} · ${
                    beans.filter(b => b.grind_setting).length
                  } dialled`}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Pressable hitSlop={8} onPress={() => setSearchOpen(true)}>
              <Search size={18} stroke={theme.colors.textTertiary} strokeWidth={1.6} />
            </Pressable>
            <Pressable style={s.addBtn} onPress={() => router.push('/bean/new')} hitSlop={8}>
              <Plus size={16} stroke={theme.colors.bgPrimary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      )}
      <View style={s.hairline} />

      {/* List */}
      {filteredBeans.length === 0 ? (
        <View style={s.emptyState}>
          <BagArt roastLevel="medium" width={58} height={74} borderRadius={3} />
          <Text style={s.emptyTitle}>
            {searchQuery ? `No results for "${searchQuery}"` : 'Your shelf is empty'}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery ? 'Try a different name or roaster' : 'Scan a bag, upload a photo, or type it in'}
          </Text>
          {!searchQuery && (
            <Pressable style={s.emptyBtn} onPress={() => router.push('/bean/new')}>
              <Text style={s.emptyBtnText}>+ ADD FIRST BEAN</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBeans}
          keyExtractor={b => b.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.rowDivider} />}
          renderItem={({ item: bean }) => {
            const isActive  = selectedBean?.id === bean.id
            const isDialed  = !!bean.grind_setting
            const notesArr  = bean.notes
              ? bean.notes.split(',').map(n => n.trim()).filter(Boolean).slice(0, 3)
              : []
            const pullCount = recentBrews.filter(b => b.bean_id === bean.id).length

            return (
              <Pressable
                style={[s.beanRow, isActive && s.beanRowActive]}
                onPress={() => router.push(`/bean/${bean.id}`)}
              >
                {/* Bag art — 72×94 with gradient */}
                <BagArt
                  roastLevel={bean.roast_level}
                  roasterName={bean.roaster}
                  width={72}
                  height={92}
                  borderRadius={3}
                />

                <View style={s.beanInfo}>
                  {/* Name + status */}
                  <View style={s.beanTopRow}>
                    <Text style={s.beanName} numberOfLines={1}>{bean.name}</Text>
                    <StatusTag dialed={isDialed} />
                  </View>

                  {/* Origin italic */}
                  <Text style={s.beanOrigin} numberOfLines={1}>
                    {[bean.origin?.split(',')[0], bean.roaster].filter(Boolean).join(' · ')}
                  </Text>

                  {/* Roast level + date */}
                  {(bean.roast_level || bean.roast_date) && (
                    <Text style={s.beanMeta} numberOfLines={1}>
                      {[
                        bean.roast_level
                          ? bean.roast_level.charAt(0).toUpperCase() + bean.roast_level.slice(1)
                          : null,
                        bean.roast_date
                          ? 'Roasted ' + new Date(bean.roast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}

                  {/* Note chips — hairline outline (Direction A) */}
                  {notesArr.length > 0 && (
                    <View style={s.noteChips}>
                      {notesArr.map(n => (
                        <View key={n} style={s.noteChip}>
                          <Text style={s.noteChipText}>{n}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Progress bar + pull count */}
                  <View style={s.progressRow}>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: isDialed ? '80%' : '30%' }]} />
                    </View>
                    <Text style={s.progressLabel}>
                      {pullCount} pull{pullCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )
          }}
        />
      )}

      {/* FAB */}
      <Pressable style={s.fab} onPress={() => router.push('/bean/new')}>
        <Plus size={22} stroke={theme.colors.bgPrimary} strokeWidth={2} />
      </Pressable>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.colors.bgPrimary },
  grain: { position: 'absolute', inset: 0, backgroundColor: 'rgba(90,60,20,0.025)', pointerEvents: 'none' } as any,

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 22, paddingVertical: 10,
    backgroundColor: theme.colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: theme.colors.textPrimary,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: theme.colors.textPrimary },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10,
  },
  title:       { fontFamily: fonts.serif, fontSize: 28, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  subtitle:    { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.textTertiary, letterSpacing: 0.1, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4 },
  addBtn: {
    width: 32, height: 32, backgroundColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  hairline: { height: 1, backgroundColor: theme.colors.divider },

  listContent: { paddingBottom: 120 },
  rowDivider:  { height: 1, backgroundColor: theme.colors.dividerSoft },

  // Bean row — flat, no card shadow (Direction A)
  beanRow: {
    flexDirection: 'row', gap: 14, paddingHorizontal: 22, paddingVertical: 14,
    backgroundColor: theme.colors.bgPrimary,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
    alignItems: 'flex-start',
  },
  beanRowActive: { borderLeftColor: theme.colors.accent, backgroundColor: theme.colors.bgSecondary },

  beanInfo:   { flex: 1, gap: 4, paddingTop: 2 },
  beanTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  beanName:   { fontFamily: fonts.serif, fontSize: 17, color: theme.colors.textPrimary, flex: 1, letterSpacing: -0.2 },
  beanOrigin: { fontFamily: fonts.bodyItalic, fontSize: 12, color: theme.colors.textSecondary },
  beanMeta:   { fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary, letterSpacing: 0.1 },

  // Note chips — hairline outline, italic serif (Direction A)
  noteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  noteChip: {
    borderWidth: 1, borderColor: theme.colors.divider,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  noteChipText: { fontFamily: fonts.bodyItalic, fontSize: 11, color: theme.colors.textSecondary },

  // Progress bar — 2px, accent fill (Direction A: track = rule)
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressBg:   { flex: 1, height: 2, backgroundColor: theme.colors.divider, overflow: 'hidden' },
  progressFill: { height: 2, backgroundColor: theme.colors.accent },
  progressLabel:{ fontFamily: fonts.mono, fontSize: 9, color: theme.colors.textTertiary },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: theme.colors.textPrimary, textAlign: 'center' },
  emptyHint:  { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 32 },
  emptyBtn:   { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.accent },
  emptyBtnText: { fontFamily: fonts.mono, fontSize: 10, color: theme.colors.accent, letterSpacing: 0.18 },

  fab: {
    position:        'absolute', right: 22, bottom: 20,
    width: 52, height: 52,
    backgroundColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#281400', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
})
