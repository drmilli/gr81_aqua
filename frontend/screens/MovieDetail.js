import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Share, FlatList, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';
import MovieCard from '../components/MovieCard';
import { fetchVodInfo, fetchVodItems } from '../services/provider';
import * as mylist from '../services/mylist';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function MovieDetail({ route, navigation }) {
  const movie = route?.params?.movie || {};
  const [myList, setMyList] = useState(new Set());
  const [more, setMore] = useState([]);
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [toast, setToast] = useState('');

  const inList = myList.has(movie.id || movie._id || movie.title);

  const toggleMyList = async (item) => {
    const key = item.id || item._id || item.title;
    const { list, inList: added } = await mylist.toggle(key);
    setMyList(new Set(list));
    setToast(added ? 'Added to My List' : 'Removed from My List');
    clearTimeout(toggleMyList._t);
    toggleMyList._t = setTimeout(() => setToast(''), 1400);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      const saved = await mylist.getList();
      if (alive) setMyList(new Set(saved));
    })();

    // Fetch rich VOD info for Xtream items
    if (movie.stream_id && movie.type === 'vod') {
      setLoadingInfo(true);
      fetchVodInfo(movie.stream_id)
        .then(d => { if (alive) setInfo(d); })
        .catch(() => {})
        .finally(() => { if (alive) setLoadingInfo(false); });
    }

    // "More Like This" — fetch same category, exclude current item
    const catId = movie.genre || movie.category_id || null;
    fetchVodItems(catId ? { categoryId: catId, limit: 25 } : { limit: 25 })
      .then(all => {
        if (!alive) return;
        const filtered = (Array.isArray(all) ? all : []).filter(i => String(i.id) !== String(movie.id));
        setMore(filtered.slice(0, 20));
      })
      .catch(() => { if (alive) setMore([]); });

    return () => { alive = false; };
  }, [movie?.id]);

  const onShare = async () => {
    try { await Share.share({ message: `Check out ${movie.title}` }); } catch {}
  };

  // Resolve display fields — prefer enriched info, fall back to item fields
  const plot = info?.plot || info?.description || movie.description || '';
  const cast = info?.cast || info?.actors || '';
  const director = info?.director || '';
  const genre = info?.genre || '';
  const releaseYear = (info?.releasedate || movie.year || '').slice(0, 4);
  const rating = info?.rating ? `★ ${parseFloat(info.rating).toFixed(1)}` : '';
  const duration = info?.duration || movie.duration || '';
  const backdropUrl = Array.isArray(info?.backdrop_path) ? info.backdrop_path[0] : (info?.backdrop_path || null);
  const posterUrl = info?.cover_big || info?.movie_image || movie.posterUrl || null;
  const heroUrl = backdropUrl || posterUrl;

  const metaParts = [releaseYear, duration, rating].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Hero image with back button overlay */}
      <View style={styles.heroWrap}>
        <Image
          source={(typeof heroUrl === 'string' && /^https?:\/\//i.test(heroUrl)) ? { uri: heroUrl } : require('../assets/public/logo.png')}
          style={styles.hero}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{movie.title}</Text>

        {metaParts.length > 0 && (
          <Text style={styles.meta}>{metaParts.join(' • ')}</Text>
        )}

        {loadingInfo && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 10, alignSelf: 'flex-start' }} />
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable focusable style={styles.playBtn} onPress={() => navigation.navigate('Play', { item: movie })}>
            <Ionicons name="play" size={18} color="#000" />
            <Text style={styles.playText}>Play</Text>
          </Pressable>
          <Pressable focusable style={[styles.secondaryBtn, inList && styles.secondaryBtnActive]} onPress={() => toggleMyList(movie)}>
            <Ionicons name={inList ? 'checkmark' : 'add'} size={18} color={inList ? '#000' : theme.colors.text} />
            <Text style={[styles.secondaryTxt, inList && { color: '#000', fontWeight: '700' }]}>{inList ? 'Added' : 'My List'}</Text>
          </Pressable>
          <Pressable focusable style={styles.secondaryBtn} onPress={onShare}>
            <Ionicons name="share-social" size={18} color={theme.colors.text} />
            <Text style={styles.secondaryTxt}>Share</Text>
          </Pressable>
        </View>

        {/* Description */}
        {!!plot && <Text style={styles.plot}>{plot}</Text>}

        {/* Detail rows */}
        <View style={styles.detailBlock}>
          <InfoRow label="Genre" value={genre} />
          <InfoRow label="Director" value={director} />
          <InfoRow label="Cast" value={cast} />
        </View>
      </View>

      {/* More Like This */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Like This</Text>
        {more.length === 0 ? (
          <Text style={styles.empty}>No similar titles found</Text>
        ) : (
          <FlatList
            horizontal
            data={more}
            keyExtractor={(i) => String(i.id || i.title)}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            renderItem={({ item, index }) => (
              <MovieCard
                item={item}
                width={120}
                onPress={() => navigation.push('MovieDetail', { movie: item })}
                onToggleList={() => toggleMyList(item)}
                inList={myList.has(item.id || item.title)}
                hasTVPreferredFocus={Platform.isTV && index === 0}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        )}
      </View>

      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.colors.cardAlt },
  backBtn: { position: 'absolute', top: 44, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  title: { ...theme.text.title, marginBottom: 6, fontSize: 22 },
  meta: { ...theme.text.small, color: theme.colors.subtext, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  playBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  playText: { color: '#000', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { backgroundColor: theme.colors.card, borderRadius: theme.radius, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border },
  secondaryBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  secondaryTxt: { ...theme.text.body },
  plot: { ...theme.text.body, color: theme.colors.text, lineHeight: 22, marginBottom: 16 },
  detailBlock: { gap: 8, marginBottom: 8 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoLabel: { ...theme.text.small, color: theme.colors.subtext, width: 64, flexShrink: 0 },
  infoValue: { ...theme.text.small, color: theme.colors.text, flex: 1, lineHeight: 18 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { ...theme.text.body, fontWeight: '700', marginBottom: 10 },
  empty: { ...theme.text.small, color: theme.colors.subtext },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: '#111', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  toastText: { color: theme.colors.text },
});
