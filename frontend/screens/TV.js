import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Image, Platform, ScrollView, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLiveChannels, fetchLiveCategories } from '../services/provider';
import FlameIcon from '../assets/public/icon.png';
import BG from '../assets/public/GR81_AQUA_bg.png';

// ── SMPTE color-bar "No Signal" ──────────────────────────────────────────────

const BARS = ['#c8c8c8', '#c8c800', '#00c8c8', '#00c800', '#c800c8', '#c80000', '#0000c8'];

function NoSignal() {
  return (
    <View style={styles.noSignalWrap}>
      <View style={styles.barsRow}>
        {BARS.map((c, i) => <View key={i} style={[styles.bar, { backgroundColor: c }]} />)}
      </View>
      <View style={styles.noSignalBadge}>
        <Text style={styles.noSignalTxt}>No Signal</Text>
      </View>
    </View>
  );
}

// ── Top navigation bar ───────────────────────────────────────────────────────

function TopNav({ navigation }) {
  const tabs = [
    { id: 'home',   label: 'Home',    icon: 'home-outline',        onPress: () => navigation.navigate('Home') },
    { id: 'live',   label: 'Live TV', icon: 'tv-outline',          onPress: () => {} },
    { id: 'movies', label: 'Movies',  icon: 'play-circle-outline', onPress: () => navigation.navigate('Movies') },
    { id: 'series', label: 'Series',  icon: 'film-outline',        onPress: () => navigation.navigate('Series') },
  ];
  return (
    <View style={styles.topNav}>
      <View style={styles.navTabs}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.navTab, t.id === 'live' && styles.navTabActive]}
            onPress={t.onPress}
          >
            <Ionicons name={t.icon} size={15} color={t.id === 'live' ? '#e8f4ff' : '#5a7d9a'} style={{ marginRight: 6 }} />
            <Text style={[styles.navTabTxt, t.id === 'live' && styles.navTabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.globalSearch} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search-outline" size={14} color="#4a6a88" style={{ marginRight: 6 }} />
        <Text style={styles.globalSearchTxt}>Search Global...</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={18} color="#7aaac8" />
      </TouchableOpacity>

      <View style={styles.logoWrap}>
        <Image source={FlameIcon} style={styles.navFlame} resizeMode="contain" />
        <Text style={styles.navLogoTxt}>
          <Text style={{ color: '#e8f4ff' }}>GR81</Text>
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

// ── Channel row ──────────────────────────────────────────────────────────────

function ChannelRow({ item, index, active, onPress, hasTVPreferredFocus }) {
  return (
    <TouchableOpacity
      style={[styles.channelRow, active && styles.channelRowActive]}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      activeOpacity={0.75}
    >
      <Text style={styles.channelNum}>{index + 1}</Text>
      <Ionicons
        name="play-circle-outline"
        size={14}
        color={active ? '#00b8cc' : '#3a5878'}
        style={{ marginHorizontal: 7 }}
      />
      <Text style={[styles.channelName, active && styles.channelNameActive]} numberOfLines={1}>
        {item.name || item.title}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TV({ navigation }) {
  const [allChannels, setAllChannels] = useState([]);
  const [apiCats, setApiCats]         = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('__all__');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [catSearch, setCatSearch]     = useState('');
  const [loading, setLoading]         = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      (async () => {
        try {
          const [cats, channels] = await Promise.all([
            fetchLiveCategories().catch(() => []),
            fetchLiveChannels({ limit: 3000 }).catch(() => []),
          ]);
          if (!alive) return;
          setApiCats(Array.isArray(cats) ? cats : []);
          const arr = Array.isArray(channels) ? channels : [];
          setAllChannels(arr);
          if (arr.length && !selectedChannel) setSelectedChannel(arr[0]);
        } catch {}
        if (alive) setLoading(false);
      })();
      return () => { alive = false; };
    }, [])
  );

  // Count channels per category
  const countMap = useMemo(() => {
    const m = {};
    for (const ch of allChannels) {
      const k = String(ch.category || ch.category_id || '');
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [allChannels]);

  // Full category list
  const categories = useMemo(() => [
    { id: '__recent__', name: 'Recently Viewed', count: 0 },
    { id: '__all__',    name: 'All',             count: allChannels.length },
    { id: '__fav__',    name: 'Favorite',        count: 0 },
    { id: '__lock__',   name: 'Lock',            count: 0 },
    ...apiCats.map(c => ({ id: String(c.id), name: c.name, count: countMap[String(c.id)] || 0 })),
  ], [apiCats, allChannels, countMap]);

  // Filtered by search
  const visibleCats = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  // Channels for selected category
  const visibleChannels = useMemo(() => {
    if (selectedCatId === '__all__' || selectedCatId.startsWith('__')) return allChannels;
    return allChannels.filter(ch => String(ch.category || ch.category_id || '') === selectedCatId);
  }, [allChannels, selectedCatId]);

  const channelName = selectedChannel?.name || selectedChannel?.title || '';

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.bg} />

      {/* Top nav */}
      <TopNav navigation={navigation} />

      {/* 3-column content */}
      <View style={styles.columns}>

        {/* ── Left: Categories ── */}
        <View style={styles.leftPanel}>
          <View style={styles.catSearchWrap}>
            <Ionicons name="search-outline" size={13} color="#3a5878" style={{ marginRight: 7 }} />
            <TextInput
              style={styles.catSearchInput}
              placeholder="Search Categories"
              placeholderTextColor="#3a5878"
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
                onPress={() => {
                  setSelectedCatId(cat.id);
                  setSelectedChannel(null);
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Middle: Channels ── */}
        <View style={styles.midPanel}>
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingTxt}>Loading channels...</Text>
            </View>
          ) : (
            <FlatList
              data={visibleChannels}
              keyExtractor={(item, i) => String(item.id || item.stream_id || i)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <ChannelRow
                  item={item}
                  index={index}
                  active={selectedChannel?.id === item.id}
                  onPress={() => setSelectedChannel(item)}
                  hasTVPreferredFocus={Platform.isTV && index === 0}
                />
              )}
            />
          )}
        </View>

        {/* ── Right: Preview + Info ── */}
        <View style={styles.rightPanel}>
          {/* Preview area */}
          <TouchableOpacity
            style={styles.previewArea}
            onPress={() => selectedChannel && navigation.navigate('Play', { item: selectedChannel })}
            activeOpacity={0.85}
          >
            <NoSignal />
          </TouchableOpacity>

          {/* Channel name */}
          {!!channelName && (
            <Text style={styles.previewChName} numberOfLines={2}>
              {channelName}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnTxt}>Catch up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnTxt}>Add to Favorite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.actionBtnTxt}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </ImageBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,10,20,0.75)',
  },

  // ── Top nav ────────────────────────────────────────────────────
  topNav: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0e2038',
    backgroundColor: '#07101e',
  },
  navTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a3352',
    backgroundColor: '#0a1828',
  },
  navTabActive: {
    borderColor: '#00b8cc',
    backgroundColor: '#0a1c34',
  },
  navTabTxt: {
    color: '#5a7d9a',
    fontSize: 13,
    fontWeight: '600',
  },
  navTabTxtActive: {
    color: '#e8f4ff',
  },
  globalSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1828',
    borderWidth: 1,
    borderColor: '#1a3352',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  globalSearchTxt: {
    color: '#3a5878',
    fontSize: 13,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a3352',
    backgroundColor: '#0a1828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 6,
  },
  navFlame: {
    width: 22,
    height: 32,
  },
  navLogoTxt: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Columns layout ──────────────────────────────────────────────
  columns: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Left: categories ────────────────────────────────────────────
  leftPanel: {
    width: 295,
    borderRightWidth: 1,
    borderRightColor: '#0e2038',
    paddingTop: 10,
    paddingHorizontal: 10,
    backgroundColor: '#07101e',
  },
  catSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1828',
    borderWidth: 1,
    borderColor: '#1a3352',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  catSearchInput: {
    flex: 1,
    color: '#e8f4ff',
    fontSize: 13,
    padding: 0,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 3,
  },
  catRowActive: {
    borderColor: '#00b8cc',
    backgroundColor: '#0a1c34',
  },
  catName: {
    color: '#9fb8d0',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  catNameActive: {
    color: '#e8f4ff',
    fontWeight: '600',
  },
  catCount: {
    color: '#3a5878',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  catCountActive: {
    color: '#7aaac8',
  },

  // ── Middle: channels ────────────────────────────────────────────
  midPanel: {
    width: 310,
    borderRightWidth: 1,
    borderRightColor: '#0e2038',
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: '#070f1c',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 3,
  },
  channelRowActive: {
    borderColor: '#00b8cc',
    backgroundColor: '#0a1c34',
  },
  channelNum: {
    color: '#3a5878',
    fontSize: 12,
    width: 24,
    textAlign: 'right',
  },
  channelName: {
    flex: 1,
    color: '#9fb8d0',
    fontSize: 13,
  },
  channelNameActive: {
    color: '#e8f4ff',
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTxt: {
    color: '#3a5878',
    fontSize: 13,
  },

  // ── Right: preview ──────────────────────────────────────────────
  rightPanel: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    justifyContent: 'flex-start',
  },
  previewArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#1a3352',
    marginBottom: 12,
  },

  // No signal
  noSignalWrap: {
    flex: 1,
    position: 'relative',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  bar: {
    flex: 1,
  },
  noSignalBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -18 }],
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  noSignalTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  // Preview info
  previewChName: {
    color: '#c0d8f0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 14,
    right: 16,
  },
  actionBtn: {
    backgroundColor: '#0a1828',
    borderWidth: 1,
    borderColor: '#1a3352',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionBtnTxt: {
    color: '#9fb8d0',
    fontSize: 12,
    fontWeight: '600',
  },
});
