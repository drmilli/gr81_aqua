import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Image, Platform, ScrollView, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { fetchLiveChannels, fetchLiveCategories } from '../services/provider';
import * as mylist from '../services/mylist';
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

// ── Live channel preview (self-contained player lifecycle) ───────────────────

function LivePreview({ channel, onPress }) {
  const url = channel?.hlsUrl || channel?.url || null;
  const [hasError, setHasError] = useState(false);

  const player = useVideoPlayer(
    url ? { uri: url, headers: { 'User-Agent': 'IPTVSmartersPlayer' } } : null,
    p => { p.volume = 0; p.loop = true; }
  );

  const { status } = useEvent(player, 'statusChange', { status: 'idle' });

  useEffect(() => {
    if (status === 'readyToPlay') {
      try { player.play(); } catch {}
    } else if (status === 'error') {
      setHasError(true);
    }
  }, [status]);

  return (
    <TouchableOpacity style={styles.previewArea} onPress={onPress} activeOpacity={0.85}>
      {!hasError ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      ) : channel?.logoUrl ? (
        <Image source={{ uri: channel.logoUrl }} style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} resizeMode="contain" />
      ) : (
        <NoSignal />
      )}
      <View style={styles.previewExpandBtn}>
        <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.85)" />
      </View>
      <View style={styles.previewLiveBadge}>
        <View style={styles.previewLiveDot} />
        <Text style={styles.previewLiveTxt}>LIVE</Text>
      </View>
    </TouchableOpacity>
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
            <Ionicons name={t.icon} size={15} color={t.id === 'live' ? '#ffffff' : '#888888'} style={{ marginRight: 6 }} />
            <Text style={[styles.navTabTxt, t.id === 'live' && styles.navTabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.globalSearch} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search-outline" size={14} color="#777777" style={{ marginRight: 6 }} />
        <Text style={styles.globalSearchTxt}>Search Global...</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => navigation.navigate('Settings')}
      >
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
        color={active ? '#00b8cc' : '#666666'}
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
  const [fetchError, setFetchError]   = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setFetchError('');
      (async () => {
        try {
          const [cats, channels] = await Promise.all([
            fetchLiveCategories(),
            fetchLiveChannels({ limit: 3000 }),
          ]);
          if (!alive) return;
          setApiCats(Array.isArray(cats) ? cats : []);
          const arr = Array.isArray(channels) ? channels : [];
          setAllChannels(arr);
          if (arr.length && !selectedChannel) setSelectedChannel(arr[0]);
        } catch (e) {
          if (alive) setFetchError(e?.message || 'Failed to load channels');
        }
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

  const channelName     = selectedChannel?.name || selectedChannel?.title || '';
  const channelCatName  = apiCats.find(c => String(c.id) === String(selectedChannel?.category))?.name || '';
  const channelNumber   = selectedChannel ? allChannels.findIndex(c => c.id === selectedChannel.id) + 1 : 0;

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
          ) : fetchError ? (
            <View style={styles.loadingBox}>
              <Ionicons name="wifi-outline" size={36} color="#444444" style={{ marginBottom: 12 }} />
              <Text style={[styles.loadingTxt, { textAlign: 'center', marginBottom: 16 }]}>
                {fetchError.includes('playlist') ? 'No playlist configured' : 'Could not load channels'}
              </Text>
              <TouchableOpacity
                style={styles.errorBtn}
                onPress={() => navigation.navigate('Playlist')}
              >
                <Text style={styles.errorBtnTxt}>Configure Playlist</Text>
              </TouchableOpacity>
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
          {selectedChannel ? (
            <LivePreview
              key={selectedChannel.id}
              channel={selectedChannel}
              onPress={() => navigation.navigate('Play', { item: selectedChannel })}
            />
          ) : (
            <View style={styles.previewArea}>
              <NoSignal />
            </View>
          )}

          {/* ── Channel info ── */}
          {selectedChannel ? (
            <View style={styles.chInfo}>
              {/* Logo + name row */}
              <View style={styles.chHeaderRow}>
                {selectedChannel.logoUrl ? (
                  <Image
                    source={{ uri: selectedChannel.logoUrl }}
                    style={styles.chLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.chLogo, styles.chLogoFallback]}>
                    <Ionicons name="tv-outline" size={20} color="#444444" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.chName} numberOfLines={2}>{channelName}</Text>
                  <View style={styles.chMetaRow}>
                    {!!channelNumber && (
                      <View style={styles.chNumBadge}>
                        <Text style={styles.chNumTxt}>CH {channelNumber}</Text>
                      </View>
                    )}
                    {!!channelCatName && (
                      <View style={styles.chCatBadge}>
                        <Text style={styles.chCatTxt}>{channelCatName}</Text>
                      </View>
                    )}
                    <View style={styles.chLiveBadge}>
                      <View style={styles.chLiveDot} />
                      <Text style={styles.chLiveTxt}>LIVE</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Watch Now button */}
              <TouchableOpacity
                style={styles.watchBtn}
                onPress={() => navigation.navigate('Play', { item: selectedChannel })}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={15} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.watchBtnTxt}>Watch Now</Text>
              </TouchableOpacity>

              {/* Action row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="time-outline" size={14} color="#aaaaaa" style={{ marginRight: 5 }} />
                  <Text style={styles.actionBtnTxt}>Catch up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="heart-outline" size={14} color="#aaaaaa" style={{ marginRight: 5 }} />
                  <Text style={styles.actionBtnTxt}>Favourite</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Search')}>
                  <Ionicons name="search-outline" size={14} color="#aaaaaa" style={{ marginRight: 5 }} />
                  <Text style={styles.actionBtnTxt}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.chEmpty}>
              <Ionicons name="tv-outline" size={28} color="#333333" style={{ marginBottom: 8 }} />
              <Text style={styles.chEmptyTxt}>Select a channel to preview</Text>
            </View>
          )}
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
    backgroundColor: 'rgba(0,0,0,0.58)',
  },

  // ── Top nav ────────────────────────────────────────────────────
  topNav: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    backgroundColor: '#0a0a0a',
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
    borderColor: '#2c2c2c',
    backgroundColor: '#151515',
  },
  navTabActive: {
    borderColor: '#00b8cc',
    backgroundColor: '#1e1e1e',
  },
  navTabTxt: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },
  navTabTxtActive: {
    color: '#ffffff',
  },
  globalSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  globalSearchTxt: {
    color: '#666666',
    fontSize: 13,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#151515',
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
    borderRightColor: '#222222',
    paddingTop: 10,
    paddingHorizontal: 10,
    backgroundColor: '#0a0a0a',
  },
  catSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  catSearchInput: {
    flex: 1,
    color: '#ffffff',
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
    backgroundColor: '#1e1e1e',
  },
  catName: {
    color: '#cccccc',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  catNameActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  catCount: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  catCountActive: {
    color: '#aaaaaa',
  },

  // ── Middle: channels ────────────────────────────────────────────
  midPanel: {
    width: 310,
    borderRightWidth: 1,
    borderRightColor: '#222222',
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: '#0a0a0a',
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
    backgroundColor: '#1e1e1e',
  },
  channelNum: {
    color: '#666666',
    fontSize: 12,
    width: 24,
    textAlign: 'right',
  },
  channelName: {
    flex: 1,
    color: '#cccccc',
    fontSize: 13,
  },
  channelNameActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingTxt: {
    color: '#666666',
    fontSize: 13,
  },
  errorBtn: {
    backgroundColor: '#00b8cc',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorBtnTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
    borderColor: '#2c2c2c',
    marginBottom: 12,
  },
  previewExpandBtn: {
    position: 'absolute',
    bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    padding: 5,
  },
  previewLiveBadge: {
    position: 'absolute',
    top: 8, left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  previewLiveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ff3b30',
  },
  previewLiveTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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

  // ── Channel info card ─────────────────────────────────────────────────────
  chInfo: {
    flex: 1,
    paddingTop: 14,
    gap: 14,
  },
  chHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  chLogo: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    flexShrink: 0,
  },
  chLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  chName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  chMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chNumBadge: {
    backgroundColor: '#1e1e1e',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  chNumTxt: {
    color: '#aaaaaa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chCatBadge: {
    backgroundColor: 'rgba(0,184,204,0.1)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,184,204,0.25)',
  },
  chCatTxt: {
    color: '#00b8cc',
    fontSize: 10,
    fontWeight: '600',
  },
  chLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  chLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ff3b30',
  },
  chLiveTxt: {
    color: '#ff3b30',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00b8cc',
    borderRadius: 10,
    paddingVertical: 12,
  },
  watchBtnTxt: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  actionBtnTxt: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: '600',
  },
  chEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  chEmptyTxt: {
    color: '#444444',
    fontSize: 12,
  },
});
