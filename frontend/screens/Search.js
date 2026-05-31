import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Platform, ImageBackground, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchVodCategories, fetchVodItems,
  fetchSeriesCategories, fetchSeriesItems,
  fetchLiveChannels,
} from '../services/provider';
import BG from '../assets/public/GR81_AQUA_bg.png';

const FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'vod',    label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'live',   label: 'Live TV' },
];

function TypeBadge({ type }) {
  const isLive = type === 'live';
  const isSeries = type === 'series';
  const label = isLive ? 'LIVE' : isSeries ? 'SERIES' : 'MOVIE';
  return (
    <View style={[styles.badge, isLive && styles.badgeLive, isSeries && styles.badgeSeries]}>
      <Text style={[styles.badgeTxt, isLive && styles.badgeTxtLive]}>{label}</Text>
    </View>
  );
}

export default function Search({ navigation }) {
  const { width } = useWindowDimensions();
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter]     = useState('all');
  const debounceRef = useRef(null);

  const doSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const [vodCats, seriesCats] = await Promise.all([
        fetchVodCategories().catch(() => []),
        fetchSeriesCategories().catch(() => []),
      ]);
      const topVod    = (Array.isArray(vodCats)    ? vodCats    : []).slice(0, 10);
      const topSeries = (Array.isArray(seriesCats) ? seriesCats : []).slice(0, 6);

      const [vodChunks, seriesChunks, liveList] = await Promise.all([
        Promise.all(topVod.map(c    => fetchVodItems(   { categoryId: c.id, limit: 60 }).catch(() => []))),
        Promise.all(topSeries.map(c => fetchSeriesItems({ categoryId: c.id, limit: 40 }).catch(() => []))),
        fetchLiveChannels({ limit: 600 }).catch(() => []),
      ]);

      const lc = trimmed.toLowerCase();
      const all = [
        ...vodChunks.flat(),
        ...seriesChunks.flat(),
        ...(Array.isArray(liveList) ? liveList : []).map(c => ({ ...c, title: c.name || c.title, type: 'live' })),
      ];

      const seen = new Set();
      setResults(all.filter(i => {
        const key = String(i.id || i.title || i.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return (i.title || i.name || '').toLowerCase().includes(lc);
      }));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 450);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const countFor = (id) => {
    if (id === 'all') return results.length;
    return results.filter(i => i.type === id).length;
  };

  const visible = filter === 'all' ? results : results.filter(i => i.type === filter);

  // Responsive grid: ~160px min card width
  const GUTTER = 14;
  const GAP    = 10;
  const cols   = Math.max(3, Math.floor((width - GUTTER * 2 + GAP) / (160 + GAP)));
  const cardW  = Math.floor((width - GUTTER * 2 - GAP * (cols - 1)) / cols);
  const cardH  = Math.round(cardW * 1.5); // 2:3 poster ratio

  const onPress = (item) => {
    if (item.type === 'live') navigation.navigate('Play', { item });
    else navigation.navigate('MovieDetail', { movie: item });
  };

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.inputWrap}>
          <Ionicons name="search-outline" size={17} color="#777777" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Search movies, series, live TV..."
            placeholderTextColor="#555555"
            returnKeyType="search"
            autoCorrect={false}
            autoFocus={!Platform.isTV}
            selectionColor="#00b8cc"
          />
          {!!q && (
            <TouchableOpacity
              onPress={() => { setQ(''); setResults([]); setSearched(false); }}
              style={{ padding: 2 }}
            >
              <Ionicons name="close-circle" size={18} color="#666666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const cnt = searched ? countFor(f.id) : null;
          const active = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{f.label}</Text>
              {cnt !== null && cnt > 0 && (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[styles.countTxt, active && styles.countTxtActive]}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00b8cc" />
          <Text style={styles.stateLabel}>Searching...</Text>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={56} color="#222222" style={{ marginBottom: 18 }} />
          <Text style={styles.stateLabel}>Search your entire library</Text>
          <Text style={styles.stateSub}>Movies · Series · Live channels</Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={56} color="#222222" style={{ marginBottom: 18 }} />
          <Text style={styles.stateLabel}>No results for "{q}"</Text>
          {filter !== 'all' && (
            <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setFilter('all')}>
              <Text style={styles.clearFilterTxt}>Show all results</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          key={cols}
          data={visible}
          keyExtractor={(i, idx) => String(i.id || i._id || idx)}
          numColumns={cols}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { width: cardW }]}
              onPress={() => onPress(item)}
              activeOpacity={0.8}
            >
              {/* Poster */}
              {item.posterUrl || item.logoUrl ? (
                <Image
                  source={{ uri: item.posterUrl || item.logoUrl }}
                  style={[styles.cardImg, { width: cardW, height: item.type === 'live' ? cardW * 0.56 : cardH }]}
                  resizeMode={item.type === 'live' ? 'contain' : 'cover'}
                />
              ) : (
                <View style={[styles.cardImg, styles.cardImgEmpty, { width: cardW, height: item.type === 'live' ? cardW * 0.56 : cardH }]}>
                  <Ionicons
                    name={item.type === 'live' ? 'tv-outline' : item.type === 'series' ? 'videocam-outline' : 'film-outline'}
                    size={28}
                    color="#2a2a2a"
                  />
                </View>
              )}

              {/* Info */}
              <View style={styles.cardInfo}>
                <TypeBadge type={item.type} />
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title || item.name}</Text>
                {!!(item.year || item.genre) && (
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {[item.year, item.genre].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 42, height: 42,
    borderRadius: 10,
    backgroundColor: '#151515',
    borderWidth: 1, borderColor: '#2c2c2c',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1, borderColor: '#2c2c2c',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  input: { flex: 1, color: '#ffffff', fontSize: 15, padding: 0 },

  // ── Filter row ───────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1, borderColor: '#2c2c2c',
    backgroundColor: '#111111',
  },
  filterTabActive: {
    borderColor: '#00b8cc',
    backgroundColor: 'rgba(0,184,204,0.1)',
  },
  filterTxt:       { color: '#888888', fontSize: 13, fontWeight: '600' },
  filterTxtActive: { color: '#00b8cc' },
  countBadge: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
    minWidth: 22, alignItems: 'center',
  },
  countBadgeActive: { backgroundColor: 'rgba(0,184,204,0.18)' },
  countTxt:         { color: '#666666', fontSize: 11, fontWeight: '700' },
  countTxtActive:   { color: '#00b8cc' },

  // ── Empty / loading states ───────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },
  stateLabel:     { color: '#aaaaaa', fontSize: 15, fontWeight: '600', marginBottom: 6 },
  stateSub:       { color: '#444444', fontSize: 13 },
  clearFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#151515',
    borderWidth: 1, borderColor: '#2c2c2c',
  },
  clearFilterTxt: { color: '#aaaaaa', fontSize: 13, fontWeight: '600' },

  // ── Result card ──────────────────────────────────────────────────
  card: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1, borderColor: '#1e1e1e',
    overflow: 'hidden',
    marginBottom: 0,
  },
  cardImg:      { backgroundColor: '#0a0a0a' },
  cardImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardInfo:     { padding: 8, gap: 3 },
  cardTitle:    { color: '#ffffff', fontSize: 12, fontWeight: '600', lineHeight: 16 },
  cardMeta:     { color: '#555555', fontSize: 11 },

  // ── Type badges ──────────────────────────────────────────────────
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    marginBottom: 4,
    backgroundColor: 'rgba(0,184,204,0.15)',
  },
  badgeLive:   { backgroundColor: 'rgba(231,76,60,0.2)' },
  badgeSeries: { backgroundColor: 'rgba(155,89,182,0.2)' },
  badgeTxt:    { color: '#00b8cc', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  badgeTxtLive: { color: '#e74c3c' },
});
