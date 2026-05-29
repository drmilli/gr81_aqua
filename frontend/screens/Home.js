import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ImageBackground, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchVodItems, fetchLiveChannels } from '../services/provider';
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
        color={active ? '#e8f4ff' : '#5a7d9a'}
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
  const [activeMenu, setActiveMenu] = useState('live');

  // Live clock — update every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch featured content on focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const profile = await getProfile();
          let items = [];
          if (profile?.type === 'xtream') {
            items = await fetchVodItems({ limit: 20 });
          } else {
            items = await fetchLiveChannels({ limit: 20 });
          }
          if (!alive) return;
          const arr = Array.isArray(items) ? items : [];
          const withImage = arr.filter(i => i?.posterUrl || i?.logoUrl);
          const pool = withImage.length ? withImage : arr;
          const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 8))] || null;
          setFeatured(pick);
        } catch {}
      })();
      return () => { alive = false; };
    }, [])
  );

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

  // Featured metadata
  const backdropUri = featured?.posterUrl || featured?.logoUrl || null;
  const featuredTitle = featured?.title || featured?.name || '';
  const featuredDesc = featured?.description || featured?.plot || '';
  const featuredGenre = featured?.genre || featured?.category || '';
  const featuredYear = featured?.year ? String(featured.year) : '';
  const featuredDuration = featured?.duration || featured?.runtime || '';

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
          <Ionicons name="time-outline" size={17} color="#7aaac8" style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.clockTime}>{formatTime(now)}</Text>
            <Text style={styles.clockDate}>{formatDate(now)}</Text>
          </View>
        </View>

        {/* Nav items */}
        <View style={styles.menu}>
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
        </View>

        {/* Settings + Refresh */}
        <View style={styles.sidebarBottom}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={17} color="#7aaac8" />
            <Text style={styles.bottomBtnTxt}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => setNow(new Date())}
          >
            <Ionicons name="refresh-outline" size={17} color="#7aaac8" />
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
            <Ionicons name="search-outline" size={15} color="#5a7d9a" style={{ marginRight: 8 }} />
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
              <Text style={styles.featuredTitle}>{featuredTitle}</Text>
              {!!featuredDesc && (
                <Text style={styles.featuredDesc} numberOfLines={6}>
                  {featuredDesc}
                </Text>
              )}
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
                <View style={styles.tagOutline}>
                  <Text style={styles.tagOutlineTxt}>HD</Text>
                </View>
              </View>
            </View>

            {/* Poster thumbnail */}
            {!!backdropUri && (
              <Image
                source={{ uri: backdropUri }}
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
            <Ionicons name="calendar-outline" size={13} color="#7aaac8" style={{ marginRight: 6 }} />
            <Text style={styles.planTxt}>
              Plan expires on:{' '}
              <Text style={styles.planDate}>30 May 2027</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.versionBadge}>
            <Ionicons name="mail-outline" size={13} color="#7aaac8" style={{ marginRight: 5 }} />
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
    backgroundColor: '#060e1a',
  },

  // Backdrop overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 22, 0.72)',
  },

  // ── Sidebar ──────────────────────────────────────────────────────
  sidebar: {
    width: SIDEBAR_W,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    zIndex: 2,
  },

  // Clock
  clockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3d5c',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(8,20,38,0.6)',
    marginBottom: 18,
  },
  clockTime: {
    color: '#e8f4ff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clockDate: {
    color: '#5a7d9a',
    fontSize: 11,
    marginTop: 1,
  },

  // Menu
  menu: {
    flex: 1,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(8,20,38,0.5)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  menuItemActive: {
    backgroundColor: 'rgba(14,36,68,0.85)',
    borderColor: '#1e3d5c',
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
    color: '#5a7d9a',
    fontSize: 14,
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#e8f4ff',
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
    backgroundColor: 'rgba(8,20,38,0.5)',
    borderWidth: 1,
    borderColor: '#1e3d5c',
  },
  bottomBtnTxt: {
    color: '#7aaac8',
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
    backgroundColor: 'rgba(8,20,38,0.7)',
    borderWidth: 1,
    borderColor: '#1e3d5c',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  searchPlaceholder: {
    color: '#4a6a88',
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
    backgroundColor: 'rgba(8,18,36,0.82)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a3352',
    padding: 22,
    gap: 20,
    maxWidth: 580,
    width: '80%',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    color: '#e8f4ff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textDecorationLine: 'underline',
    textDecorationColor: '#1e5cb0',
  },
  featuredDesc: {
    color: '#9fb8d0',
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
    color: '#9fb8d0',
    fontSize: 12,
  },
  tagOutline: {
    borderWidth: 1,
    borderColor: '#9fb8d0',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagOutlineTxt: {
    color: '#9fb8d0',
    fontSize: 11,
    fontWeight: '600',
  },
  featuredPoster: {
    width: 130,
    height: 170,
    borderRadius: 8,
    backgroundColor: '#0a1e38',
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
    backgroundColor: 'rgba(8,20,38,0.7)',
    borderWidth: 1,
    borderColor: '#1e3d5c',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  planTxt: {
    color: '#7aaac8',
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
    backgroundColor: 'rgba(8,20,38,0.7)',
    borderWidth: 1,
    borderColor: '#1e3d5c',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  versionTxt: {
    color: '#7aaac8',
    fontSize: 12,
    fontWeight: '600',
  },
});
