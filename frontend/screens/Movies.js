import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Image, Platform, useWindowDimensions, ScrollView, Modal, Pressable, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchVodCategories, fetchVodItems } from '../services/provider';
import FlameIcon from '../assets/public/icon.png';
import BG from '../assets/public/GR81_AQUA_bg.png';

// ── Category icon map ────────────────────────────────────────────────────────

function catIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('action') || n.includes('adventure')) return 'flash-outline';
  if (n.includes('animation'))    return 'color-palette-outline';
  if (n.includes('anime'))        return 'sparkles-outline';
  if (n.includes('comedy'))       return 'happy-outline';
  if (n.includes('crime'))        return 'finger-print-outline';
  if (n.includes('drama'))        return 'film-outline';
  if (n.includes('horror'))       return 'skull-outline';
  if (n.includes('romance') || n.includes('romantic')) return 'heart-circle-outline';
  if (n.includes('sci') || n.includes('fantasy')) return 'planet-outline';
  if (n.includes('thriller') || n.includes('mystery')) return 'alert-circle-outline';
  if (n.includes('documentary') || n.includes('doc')) return 'document-text-outline';
  if (n.includes('sport'))        return 'trophy-outline';
  if (n.includes('kids') || n.includes('family') || n.includes('children')) return 'balloon-outline';
  if (n.includes('music'))        return 'musical-notes-outline';
  if (n.includes('news'))         return 'newspaper-outline';
  return 'apps-outline';
}

// ── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { id: 'added',     label: 'Order by Added' },
  { id: 'name_asc',  label: 'Order by Name (A–Z)' },
  { id: 'name_desc', label: 'Order by Name (Z–A)' },
  { id: 'year',      label: 'Order by Year' },
];

// ── Top nav ──────────────────────────────────────────────────────────────────

function TopNav({ navigation }) {
  const tabs = [
    { id: 'home',   label: 'Home',    icon: 'home-outline',        onPress: () => navigation.navigate('Home') },
    { id: 'live',   label: 'Live TV', icon: 'tv-outline',          onPress: () => navigation.navigate('TV') },
    { id: 'movies', label: 'Movies',  icon: 'play-circle-outline', onPress: () => {} },
    { id: 'series', label: 'Series',  icon: 'film-outline',        onPress: () => navigation.navigate('Series') },
  ];
  return (
    <View style={styles.topNav}>
      <View style={styles.navTabs}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.navTab, t.id === 'movies' && styles.navTabActive]}
            onPress={t.onPress}
          >
            <Ionicons name={t.icon} size={15} color={t.id === 'movies' ? '#ffffff' : '#888888'} style={{ marginRight: 6 }} />
            <Text style={[styles.navTabTxt, t.id === 'movies' && styles.navTabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.globalSearch} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search-outline" size={14} color="#777777" style={{ marginRight: 6 }} />
        <Text style={styles.globalSearchTxt}>Search Global...</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={18} color="#aaaaaa" />
      </TouchableOpacity>
      <View style={styles.logoWrap}>
        <Image source={FlameIcon} style={styles.navFlame} resizeMode="contain" />
        <Text style={styles.navLogoTxt}>
          <Text style={{ color: '#ffffff' }}>GR81</Text>
          <Text style={{ color: '#00b8cc' }}> AQUA</Text>
        </Text>
      </View>
    </View>
  );
}

// ── Category row ─────────────────────────────────────────────────────────────

function CatRow({ item, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.catRow, active && styles.catRowActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={item.icon}
        size={15}
        color={active ? '#00b8cc' : '#666666'}
        style={{ marginRight: 10 }}
      />
      <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={1}>
        {item.name}
      </Text>
      {item.count != null && (
        <Text style={[styles.catCount, active && styles.catCountActive]}>
          {item.count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Movie card ───────────────────────────────────────────────────────────────

function MovieCard({ item, cardWidth, onPress }) {
  const [imgFailed, setImgFailed] = useState(false);
  const posterUri  = item?.posterUrl || null;
  const title      = item?.title || item?.name || '';
  const year       = item?.year ? ` · ${item.year}` : '';
  const cardHeight = Math.round((cardWidth * 3) / 2);

  return (
    <TouchableOpacity style={[styles.card, { width: cardWidth }]} onPress={onPress} activeOpacity={0.8}>
      {posterUri && !imgFailed ? (
        <Image
          source={{ uri: posterUri }}
          style={[styles.poster, { width: cardWidth, height: cardHeight }]}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View style={[styles.poster, styles.posterFallback, { width: cardWidth, height: cardHeight }]}>
          <Ionicons name="film-outline" size={28} color="#2c2c2c" />
        </View>
      )}
      <Text style={styles.cardLabel} numberOfLines={1}>{title}{year}</Text>
    </TouchableOpacity>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Movies({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();

  const [allItems, setAllItems]           = useState([]);
  const [apiCats, setApiCats]             = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('__recent__');
  const [catSearch, setCatSearch]         = useState('');
  const [sortBy, setSortBy]               = useState('added');
  const [showSort, setShowSort]           = useState(false);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setFetchError('');
      (async () => {
        try {
          const [cats, items] = await Promise.all([
            fetchVodCategories(),
            fetchVodItems({ limit: 1000 }),
          ]);
          if (!alive) return;
          setApiCats(Array.isArray(cats) ? cats : []);
          setAllItems(Array.isArray(items) ? items : []);
        } catch (e) {
          if (alive) setFetchError(e?.message || 'Failed to load movies');
        }
        if (alive) setLoading(false);
      })();
      return () => { alive = false; };
    }, [])
  );

  // Count items per category
  const countMap = useMemo(() => {
    const m = {};
    for (const item of allItems) {
      const k = String(item.genre || item.category || item.category_id || '');
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [allItems]);

  // Full category list
  const categories = useMemo(() => [
    { id: '__recent__', name: 'Recently Viewed', icon: 'time-outline',  count: 0 },
    { id: '__all__',    name: 'All',             icon: 'grid-outline',  count: allItems.length },
    { id: '__fav__',    name: 'Favorite',        icon: 'heart-outline', count: 0 },
    ...apiCats.map(c => ({
      id:    String(c.id),
      name:  c.name,
      icon:  catIcon(c.name),
      count: countMap[String(c.id)] || 0,
    })),
  ], [apiCats, allItems, countMap]);

  const visibleCats = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories;
  }, [categories, catSearch]);

  const filteredItems = useMemo(() => {
    if (selectedCatId === '__all__' || selectedCatId.startsWith('__')) return allItems;
    return allItems.filter(i => String(i.genre || i.category || i.category_id || '') === selectedCatId);
  }, [allItems, selectedCatId]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    if (sortBy === 'name_asc')  return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sortBy === 'name_desc') return arr.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    if (sortBy === 'year')      return arr.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    return arr;
  }, [filteredItems, sortBy]);

  // Responsive grid
  const SIDEBAR_W = 295;
  const GRID_PAD  = 20;
  const GAP       = 8;
  const contentW  = screenWidth - SIDEBAR_W - GRID_PAD * 2;
  const numCols   = Math.max(2, Math.floor(contentW / 150));
  const cardWidth = Math.floor((contentW - GAP * (numCols - 1)) / numCols);

  const currentSortLabel = SORT_OPTIONS.find(o => o.id === sortBy)?.label || 'Order by Added';

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.bg} />
      <TopNav navigation={navigation} />

      <View style={styles.columns}>

        {/* ── Left: Categories ── */}
        <View style={styles.leftPanel}>
          <View style={styles.catSearchWrap}>
            <Ionicons name="search-outline" size={13} color="#3a5878" style={{ marginRight: 7 }} />
            <TextInput
              style={styles.catSearchInput}
              placeholder="Search movies"
              placeholderTextColor="#666666"
              value={catSearch}
              onChangeText={setCatSearch}
              selectionColor="#00b8cc"
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {visibleCats.map(cat => (
              <CatRow
                key={cat.id}
                item={cat}
                active={selectedCatId === cat.id}
                onPress={() => setSelectedCatId(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Right: Grid ── */}
        <View style={styles.rightPanel}>
          <View style={styles.sortBar}>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(true)}>
              <Text style={styles.sortBtnTxt}>{currentSortLabel}</Text>
              <Ionicons name="chevron-down" size={14} color="#aaaaaa" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingTxt}>Loading movies...</Text>
            </View>
          ) : fetchError ? (
            <View style={styles.loadingBox}>
              <Ionicons name="film-outline" size={36} color="#444444" style={{ marginBottom: 12 }} />
              <Text style={[styles.loadingTxt, { textAlign: 'center', marginBottom: 16 }]}>
                {fetchError.includes('playlist') ? 'No playlist configured' : 'Could not load movies'}
              </Text>
              <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.navigate('Playlist')}>
                <Text style={styles.errorBtnTxt}>Configure Playlist</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              key={numCols}
              data={sortedItems}
              keyExtractor={(item, i) => String(item.id || item.stream_id || i)}
              numColumns={numCols}
              columnWrapperStyle={numCols > 1 ? { gap: GAP } : undefined}
              contentContainerStyle={{ gap: GAP, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <MovieCard
                  item={item}
                  cardWidth={cardWidth}
                  onPress={() => navigation.navigate('MovieDetail', { movie: item })}
                />
              )}
            />
          )}
        </View>
      </View>

      {/* ── Sort dropdown ── */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSort(false)} />
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.sortOption, sortBy === opt.id && styles.sortOptionActive]}
              onPress={() => { setSortBy(opt.id); setShowSort(false); }}
            >
              <Text style={[styles.sortOptionTxt, sortBy === opt.id && styles.sortOptionTxtActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.id && <Ionicons name="checkmark" size={16} color="#00b8cc" />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </ImageBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)' },

  // Top nav
  topNav: {
    height: 58, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#222222',
    backgroundColor: '#0a0a0a',
  },
  navTabs: { flexDirection: 'row', gap: 8 },
  navTab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
    borderColor: '#2c2c2c', backgroundColor: '#151515',
  },
  navTabActive:    { borderColor: '#00b8cc', backgroundColor: '#1e1e1e' },
  navTabTxt:       { color: '#888888', fontSize: 13, fontWeight: '600' },
  navTabTxtActive: { color: '#ffffff' },
  globalSearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#2c2c2c',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9,
  },
  globalSearchTxt: { color: '#666666', fontSize: 13 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 8,
    borderWidth: 1, borderColor: '#2c2c2c',
    backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center',
  },
  logoWrap:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 6 },
  navFlame:    { width: 22, height: 32 },
  navLogoTxt:  { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  // Columns
  columns: { flex: 1, flexDirection: 'row' },

  // Left panel
  leftPanel: {
    width: 295, borderRightWidth: 1, borderRightColor: '#222222',
    paddingTop: 10, paddingHorizontal: 10, backgroundColor: '#0a0a0a',
  },
  catSearchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#2c2c2c',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
  },
  catSearchInput: { flex: 1, color: '#ffffff', fontSize: 13, padding: 0 },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 8, borderWidth: 1, borderColor: 'transparent', marginBottom: 3,
  },
  catRowActive:   { borderColor: '#00b8cc', backgroundColor: '#1e1e1e' },
  catName:        { color: '#cccccc', fontSize: 13, flex: 1, marginRight: 8 },
  catNameActive:  { color: '#ffffff', fontWeight: '600' },
  catCount:       { color: '#666666', fontSize: 12, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  catCountActive: { color: '#aaaaaa' },

  // Right panel
  rightPanel: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  sortBar:    { flexDirection: 'row', marginBottom: 14 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#2c2c2c',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9,
  },
  sortBtnTxt: { color: '#cccccc', fontSize: 13, fontWeight: '500' },

  // Movie card
  card:           { marginBottom: 4 },
  poster:         { borderRadius: 8, backgroundColor: '#151515' },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  cardLabel:      { color: '#aaaaaa', fontSize: 11, marginTop: 5, paddingHorizontal: 2 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  loadingTxt: { color: '#666666', fontSize: 13 },
  errorBtn: { backgroundColor: '#00b8cc', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  errorBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Sort modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sortMenu: {
    position: 'absolute', top: 76, left: 315,
    backgroundColor: '#151515', borderRadius: 10,
    borderWidth: 1, borderColor: '#2c2c2c',
    overflow: 'hidden', minWidth: 220,
  },
  sortOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#222222',
  },
  sortOptionActive:   { backgroundColor: '#1e1e1e' },
  sortOptionTxt:      { color: '#cccccc', fontSize: 13 },
  sortOptionTxtActive: { color: '#ffffff', fontWeight: '600' },
});
