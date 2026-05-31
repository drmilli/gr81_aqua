import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ImageBackground, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchVodItems, fetchLiveChannels, fetchVodInfo, clearCache } from '../services/provider';
import { getProfile } from '../services/session';
import * as mylist from '../services/mylist';
import LogoImg from '../assets/public/logo.png';
import BrandBG from '../assets/public/GR81_AQUA_bg.png';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Sidebar item ─────────────────────────────────────────────────────────────

function SidebarItem({ label, iconName, active, onPress, hasTVPreferredFocus }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, active && styles.menuItemActive]}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      activeOpacity={0.75}
    >
      {/* Active left-bar accent */}
      <View style={[styles.activeBar, active && styles.activeBarVisible]} />
      <Ionicons
        name={iconName}
        size={19}
        color={active ? '#ffffff' : '#888888'}
        style={styles.menuIcon}
      />
      <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Home({ navigation }) {
  const [now, setNow] = useState(new Date());
  const [featured, setFeatured] = useState(null);
  const [featuredInfo, setFeaturedInfo] = useState(null);
  const [activeMenu, setActiveMenu] = useState('live');

  // Live clock — update every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadFeatured = useCallback(async () => {
    try {
      const profile = await getProfile();
      let items = [];
      if (profile?.type === 'xtream') {
        items = await fetchVodItems({ limit: 20 });
      } else {
        items = await fetchLiveChannels({ limit: 20 });
      }
      const arr = Array.isArray(items) ? items : [];
      const withImage = arr.filter(i => i?.posterUrl || i?.logoUrl);
      const pool = withImage.length ? withImage : arr;
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 8))] || null;
      setFeatured(pick);
      setFeaturedInfo(null);
      if (pick?.stream_id && pick?.type === 'vod') {
        const info = await fetchVodInfo(pick.stream_id).catch(() => null);
        if (info) setFeaturedInfo(info);
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    loadFeatured().finally(() => { if (!alive) { setFeatured(null); setFeaturedInfo(null); } });
    return () => { alive = false; };
  }, [loadFeatured]));

  // Sidebar menu definition
  const menuItems = [
    {
      id: 'live', label: 'Live TV', icon: 'tv-outline',
      onPress: () => { setActiveMenu('live'); navigation.navigate('TV'); },
    },
    {
      id: 'movies', label: 'Movies', icon: 'film-outline',
      onPress: () => { setActiveMenu('movies'); navigation.navigate('Movies'); },
    },
    {
      id: 'series', label: 'Series', icon: 'videocam-outline',
      onPress: () => { setActiveMenu('series'); navigation.navigate('Series'); },
    },
    {
      id: 'favourites', label: 'Favourites', icon: 'heart-outline',
      onPress: () => { setActiveMenu('favourites'); navigation.navigate('MyList'); },
    },
    {
      id: 'extras', label: 'Extras', icon: 'grid-outline',
      onPress: () => { setActiveMenu('extras'); navigation.navigate('Search'); },
    },
    {
      id: 'playlist', label: 'Change playlist', icon: 'person-circle-outline',
      onPress: () => navigation.navigate('Playlist'),
    },
  ];

  // Featured metadata — prefer rich info from fetchVodInfo, fall back to list-level fields
  const backdropUri =
    (Array.isArray(featuredInfo?.backdrop_path) ? featuredInfo.backdrop_path[0] : featuredInfo?.backdrop_path) ||
    featuredInfo?.cover_big || featuredInfo?.movie_image ||
    featured?.posterUrl || featured?.logoUrl || null;
  const posterUri = featuredInfo?.cover_big || featuredInfo?.movie_image || featured?.posterUrl || featured?.logoUrl || null;
  const featuredTitle = featured?.title || featured?.name || '';
  const featuredDesc = featuredInfo?.plot || featuredInfo?.description || featured?.plot || featured?.description || '';
  const featuredGenre = featuredInfo?.genre || featured?.genre || '';
  const featuredYear = String(featuredInfo?.releasedate || featured?.year || '').slice(0, 4);
  const featuredDuration = featuredInfo?.duration || featured?.duration || featured?.runtime || '';
  const featuredRating = featuredInfo?.rating ? `★ ${parseFloat(featuredInfo.rating).toFixed(1)}` : '';

  return (
    <View style={styles.root}>

      {/* ── Brand background (always visible) ── */}
      <ImageBackground source={BrandBG} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* ── Featured content backdrop (blurred over brand bg) ── */}
      {backdropUri ? (
        <ImageBackground
          source={{ uri: backdropUri }}
          style={StyleSheet.absoluteFill}
          blurRadius={Platform.isTV ? 3 : 5}
          resizeMode="cover"
        />
      ) : null}
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* ── Left sidebar ── */}
      <View style={styles.sidebar}>

        {/* Clock */}
        <View style={styles.clockBox}>
          <Ionicons name="time-outline" size={17} color="#aaaaaa" style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.clockTime}>{formatTime(now)}</Text>
            <Text style={styles.clockDate}>{formatDate(now)}</Text>
          </View>
        </View>

        {/* Nav items */}
        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
          {menuItems.map((item, i) => (
            <SidebarItem
              key={item.id}
              label={item.label}
              iconName={item.icon}
              active={activeMenu === item.id}
              onPress={item.onPress}
              hasTVPreferredFocus={Platform.isTV && i === 0}
            />
          ))}
        </ScrollView>

        {/* Settings + Refresh */}
        <View style={styles.sidebarBottom}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={17} color="#aaaaaa" />
            <Text style={styles.bottomBtnTxt}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={async () => { setNow(new Date()); await clearCache(); loadFeatured(); }}
          >
            <Ionicons name="refresh-outline" size={17} color="#aaaaaa" />
            <Text style={styles.bottomBtnTxt}>Refresh</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* ── Main area ── */}
      <View style={styles.main}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={15} color="#888888" style={{ marginRight: 8 }} />
            <Text style={styles.searchPlaceholder}>
              Search movies, TV shows, live TV and more....
            </Text>
          </TouchableOpacity>
          <Image source={LogoImg} style={styles.headerLogo} resizeMode="contain" />
        </View>

        {/* Featured content card */}
        {!!featuredTitle && (
          <View style={styles.featuredCard}>
            {/* Info side */}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle} numberOfLines={2}>{featuredTitle}</Text>

              {!!featuredDesc && (
                <Text style={styles.featuredDesc} numberOfLines={4}>
                  {featuredDesc}
                </Text>
              )}

              {/* Tags row */}
              <View style={styles.tagsRow}>
                {!!featuredGenre && (
                  <View style={styles.tagPrimary}>
                    <Text style={styles.tagPrimaryTxt}>{featuredGenre}</Text>
                  </View>
                )}
                {!!featuredYear && (
                  <Text style={styles.tagPlain}>{featuredYear}</Text>
                )}
                {!!featuredDuration && (
                  <Text style={styles.tagPlain}>{featuredDuration}</Text>
                )}
                {!!featuredRating && (
                  <Text style={styles.tagRating}>{featuredRating}</Text>
                )}
                <View style={styles.tagOutline}>
                  <Text style={styles.tagOutlineTxt}>HD</Text>
                </View>
              </View>

              {/* Play button */}
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => featured && navigation.navigate('MovieDetail', { movie: featured })}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={14} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.playBtnTxt}>Watch Now</Text>
              </TouchableOpacity>
            </View>

            {/* Poster thumbnail */}
            {!!(posterUri || backdropUri) && (
              <Image
                source={{ uri: posterUri || backdropUri }}
                style={styles.featuredPoster}
                resizeMode="cover"
              />
            )}
          </View>
        )}

        {/* Bottom status bar */}
        <View style={styles.statusBar}>
          <TouchableOpacity
            style={styles.planBadge}
            onPress={() => navigation.navigate('Playlist')}
          >
            <Ionicons name="calendar-outline" size={13} color="#aaaaaa" style={{ marginRight: 6 }} />
            <Text style={styles.planTxt}>
              Plan expires on:{' '}
              <Text style={styles.planDate}>30 May 2027</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.versionBadge}>
            <Ionicons name="mail-outline" size={13} color="#aaaaaa" style={{ marginRight: 5 }} />
            <Text style={styles.versionTxt}>v1.0</Text>
          </View>
        </View>

      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const SIDEBAR_W = 265;

const styles = StyleSheet.create({

  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
  },

  // Backdrop overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },

  // ── Sidebar ──────────────────────────────────────────────────────
  sidebar: {
    width: SIDEBAR_W,
    flexShrink: 0,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 14,
    zIndex: 2,
  },

  // Clock
  clockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(18,18,18,0.75)',
    marginBottom: 18,
  },
  clockTime: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clockDate: {
    color: '#aaaaaa',
    fontSize: 11,
    marginTop: 1,
  },

  // Menu
  menu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(18,18,18,0.5)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: 'rgba(35,35,35,0.9)',
    borderColor: '#3a3a3a',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  activeBarVisible: {
    backgroundColor: '#00b8cc',
  },
  menuIcon: {
    marginRight: 12,
    marginLeft: 6,
  },
  menuLabel: {
    color: '#aaaaaa',
    fontSize: 14,
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Bottom buttons
  sidebarBottom: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(18,18,18,0.5)',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  bottomBtnTxt: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Main ──────────────────────────────────────────────────────────
  main: {
    flex: 1,
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 16,
    paddingLeft: 16,
    justifyContent: 'space-between',
    zIndex: 2,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.75)',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  searchPlaceholder: {
    color: '#888888',
    fontSize: 13,
  },
  headerLogo: {
    width: 120,
    height: 44,
  },

  // Featured card
  featuredCard: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,15,15,0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    padding: 22,
    gap: 20,
    maxWidth: 580,
    width: '80%',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textDecorationLine: 'underline',
    textDecorationColor: '#00b8cc',
  },
  featuredDesc: {
    color: '#cccccc',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPrimary: {
    borderWidth: 1,
    borderColor: '#00b8cc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagPrimaryTxt: {
    color: '#00b8cc',
    fontSize: 11,
    fontWeight: '600',
  },
  tagPlain: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  tagRating: {
    color: '#f5c518',
    fontSize: 12,
    fontWeight: '700',
  },
  tagOutline: {
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagOutlineTxt: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: '600',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#00b8cc',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 14,
  },
  playBtnTxt: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  featuredPoster: {
    width: 130,
    height: 185,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.75)',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  planTxt: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  planDate: {
    color: '#00b8cc',
    fontWeight: '700',
  },
  versionBadge: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.75)',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  versionTxt: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: '600',
  },
});
