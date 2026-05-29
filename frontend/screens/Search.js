import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchVodCategories, fetchVodItems, fetchSeriesCategories, fetchSeriesItems, fetchLiveChannels } from '../services/provider';
import { getProfile } from '../services/session';
import theme from '../theme';

export default function Search({ navigation }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const profile = await getProfile();
      const [vodCats, seriesCats] = await Promise.all([
        fetchVodCategories().catch(() => []),
        fetchSeriesCategories().catch(() => []),
      ]);

      const topVod = (Array.isArray(vodCats) ? vodCats : []).slice(0, 10);
      const topSeries = (Array.isArray(seriesCats) ? seriesCats : []).slice(0, 5);

      const [vodChunks, seriesChunks, liveChannels] = await Promise.all([
        Promise.all(topVod.map(c => fetchVodItems({ categoryId: c.id, limit: 50 }).catch(() => []))),
        Promise.all(topSeries.map(c => fetchSeriesItems({ categoryId: c.id, limit: 30 }).catch(() => []))),
        profile?.type === 'm3u'
          ? fetchLiveChannels({ limit: 500 }).catch(() => [])
          : Promise.resolve([]),
      ]);

      const lc = trimmed.toLowerCase();
      const allItems = [
        ...vodChunks.flat(),
        ...seriesChunks.flat(),
        ...(Array.isArray(liveChannels) ? liveChannels : []).map(c => ({
          ...c,
          title: c.name || c.title,
        })),
      ];

      const seen = new Set();
      const filtered = allItems.filter(i => {
        const key = String(i.id || i.title || i.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return (i.title || i.name || '').toLowerCase().includes(lc);
      });

      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 500);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const onPress = (item) => {
    if (item.type === 'live') {
      navigation.navigate('Play', { item });
    } else if (item.type === 'series') {
      navigation.navigate('MovieDetail', { movie: item });
    } else {
      navigation.navigate('MovieDetail', { movie: item });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color={theme.colors.subtext} />
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Movies, series, channels..."
          placeholderTextColor={theme.colors.subtext}
          returnKeyType="search"
          autoCorrect={false}
          autoFocus={Platform.isTV}
        />
        {!!q && (
          <TouchableOpacity onPress={() => { setQ(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : searched && results.length === 0 ? (
        <Text style={styles.empty}>No results for "{q}"</Text>
      ) : !searched ? (
        <Text style={styles.hint}>Type to search movies, series, and channels</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(i, idx) => String(i.id || i._id || idx)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => onPress(item)}>
              {item.posterUrl || item.logoUrl ? (
                <Image
                  source={{ uri: item.posterUrl || item.logoUrl }}
                  style={styles.thumb}
                  resizeMode={item.type === 'live' ? 'contain' : 'cover'}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Ionicons
                    name={item.type === 'live' ? 'tv-outline' : item.type === 'series' ? 'film-outline' : 'film-outline'}
                    size={20}
                    color={theme.colors.subtext}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title || item.name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.type === 'live' ? 'Live TV' : item.type === 'series' ? 'Series' : 'Movie'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: theme.colors.bg },
  title: { ...theme.text.title, marginBottom: 12 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  input: { flex: 1, color: theme.colors.text, fontSize: 15, padding: 0 },
  hint: { ...theme.text.small, color: theme.colors.subtext, textAlign: 'center', marginTop: 40 },
  empty: { ...theme.text.body, color: theme.colors.subtext, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.cardAlt },
  thumbFallback: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  rowTitle: { ...theme.text.body, color: theme.colors.text, marginBottom: 3 },
  rowSub: { ...theme.text.small, color: theme.colors.subtext },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
});
