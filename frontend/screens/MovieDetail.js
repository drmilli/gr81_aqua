import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Share, FlatList, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MovieCard from '../components/MovieCard';
import { fetchVodInfo, fetchSeriesInfo, fetchVodItems, fetchSeriesItems } from '../services/provider';
import * as mylist from '../services/mylist';

// ── Helpers ───────────────────────────────────────────────────────────────────

function GenreTag({ label }) {
  return (
    <View style={styles.genreTag}>
      <Text style={styles.genreTagTxt}>{label}</Text>
    </View>
  );
}

function MetaSep() {
  return <Text style={styles.metaSep}>·</Text>;
}

// ── Episode row ───────────────────────────────────────────────────────────────

function EpisodeRow({ ep, seasonNum, seriesTitle, onPlay }) {
  const thumb     = ep.info?.movie_image || ep.info?.cover || null;
  const epTitle   = ep.title || `Episode ${ep.episode_num}`;
  const duration  = ep.info?.duration || '';
  const epPlot    = ep.info?.plot || '';
  const epDate    = (ep.info?.releasedate || ep.added || '').slice(0, 4);

  return (
    <TouchableOpacity style={styles.epRow} onPress={onPlay} activeOpacity={0.8}>
      {/* Thumbnail */}
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.epThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.epThumb, styles.epThumbEmpty]}>
          <Text style={styles.epThumbNum}>{ep.episode_num}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.epInfo}>
        <Text style={styles.epTitle} numberOfLines={1}>
          {ep.episode_num}. {epTitle}
        </Text>
        <View style={styles.epMetaRow}>
          {!!epDate     && <Text style={styles.epMeta}>{epDate}</Text>}
          {!!epDate && !!duration && <MetaSep />}
          {!!duration   && <Text style={styles.epMeta}>{duration}</Text>}
        </View>
        {!!epPlot && (
          <Text style={styles.epPlot} numberOfLines={2}>{epPlot}</Text>
        )}
      </View>

      {/* Play */}
      <View style={styles.epPlayBtn}>
        <Ionicons name="play" size={15} color="#000" />
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const POSTER_W = 210;
const POSTER_H = Math.round(POSTER_W * 1.5);

export default function MovieDetail({ route, navigation }) {
  const movie = route?.params?.movie || {};

  const isSeries = movie.type === 'series';
  const isVod    = !isSeries;

  const [myListSet, setMyListSet]         = useState(new Set());
  const [info, setInfo]                   = useState(null);
  const [seriesData, setSeriesData]       = useState(null);
  const [loadingInfo, setLoadingInfo]     = useState(false);
  const [more, setMore]                   = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [toast, setToast]                 = useState('');
  const toastTimer                        = useRef(null);

  const inList = myListSet.has(movie.id || movie._id || movie.title);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };

  const toggleMyList = async (item) => {
    const key = item.id || item._id || item.title;
    const { list, inList: added } = await mylist.toggle(key);
    setMyListSet(new Set(list));
    showToast(added ? '♥  Added to Favourites' : 'Removed from Favourites');
  };

  const onShare = async () => {
    try { await Share.share({ message: `Check out: ${movie.title || movie.name}` }); } catch {}
  };

  useEffect(() => {
    let alive = true;

    mylist.getList().then(s => { if (alive) setMyListSet(new Set(s)); });

    // Fetch metadata
    if (isVod && (movie.stream_id || movie.id)) {
      const id = movie.stream_id || movie.id;
      setLoadingInfo(true);
      fetchVodInfo(id)
        .then(d => { if (alive) setInfo(d); })
        .catch(() => {})
        .finally(() => { if (alive) setLoadingInfo(false); });
    }

    if (isSeries) {
      const id = movie.series_id || movie.id;
      setLoadingInfo(true);
      fetchSeriesInfo(id)
        .then(d => {
          if (!alive || !d) return;
          setSeriesData(d);
          // Pick first season by default
          const seasons = Object.keys(d.episodes || {}).sort((a, b) => Number(a) - Number(b));
          if (seasons.length) setSelectedSeason(seasons[0]);
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoadingInfo(false); });
    }

    // More Like This
    const fetchFn  = isSeries ? fetchSeriesItems : fetchVodItems;
    const catId    = movie.category_id || movie.genre || null;
    fetchFn(catId ? { categoryId: catId, limit: 25 } : { limit: 25 })
      .then(all => {
        if (!alive) return;
        setMore((Array.isArray(all) ? all : []).filter(i => String(i.id) !== String(movie.id)).slice(0, 20));
      })
      .catch(() => { if (alive) setMore([]); });

    return () => { alive = false; };
  }, [movie?.id]);

  // ── Resolved fields ───────────────────────────────────────────────────────
  const richInfo   = isSeries ? seriesData?.info : info;

  const title      = movie.title || movie.name || '';
  const plot       = richInfo?.plot || richInfo?.description || movie.description || movie.plot || '';
  const cast       = richInfo?.cast || richInfo?.actors || '';
  const director   = richInfo?.director || '';
  const genreStr   = richInfo?.genre || (isSeries ? '' : movie.genre) || '';
  const releaseYear= String(richInfo?.releaseDate || richInfo?.releasedate || movie.year || '').slice(0, 4);
  const rating     = richInfo?.rating ? parseFloat(richInfo.rating).toFixed(1) : '';
  const duration   = richInfo?.duration || movie.duration || '';
  const backdropUrl= Array.isArray(richInfo?.backdrop_path)
                      ? richInfo.backdrop_path[0]
                      : (richInfo?.backdrop_path || null);
  const posterUrl  = richInfo?.cover_big || richInfo?.cover || richInfo?.movie_image
                      || movie.posterUrl || null;
  const bgUrl      = backdropUrl || posterUrl;

  const genres = genreStr
    ? genreStr.split(/[,/]/).map(g => g.trim()).filter(Boolean).slice(0, 4)
    : [];

  // Episodes for the selected season
  const allSeasons   = Object.keys(seriesData?.episodes || {}).sort((a, b) => Number(a) - Number(b));
  const episodeList  = selectedSeason ? (seriesData?.episodes?.[selectedSeason] || []) : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Blurred background */}
      {bgUrl
        ? <Image source={{ uri: bgUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={Platform.OS === 'ios' ? 22 : 10} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0a0a' }]} />
      }
      <View style={styles.scrim} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Main two-column ── */}
        <View style={styles.mainRow}>

          {/* Left: Poster */}
          <View style={styles.posterCol}>
            {posterUrl
              ? <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
              : (
                <View style={[styles.poster, styles.posterEmpty]}>
                  <Ionicons name={isSeries ? 'tv-outline' : 'film-outline'} size={44} color="#2a2a2a" />
                </View>
              )
            }
            <View style={styles.typeTag}>
              <Text style={styles.typeTagTxt}>{isSeries ? 'SERIES' : 'MOVIE'}</Text>
            </View>
          </View>

          {/* Right: Info */}
          <View style={styles.infoCol}>

            {/* Back + Title */}
            <View style={styles.titleRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={3}>{title}</Text>
            </View>

            {/* Meta row */}
            <View style={styles.metaRow}>
              {!!rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color="#f5c518" style={{ marginRight: 4 }} />
                  <Text style={styles.ratingTxt}>{rating}</Text>
                </View>
              )}
              {!!releaseYear && <><Text style={styles.metaTxt}>{releaseYear}</Text></>}
              {!!duration    && <><MetaSep /><Text style={styles.metaTxt}>{duration}</Text></>}
              {isSeries && allSeasons.length > 0 && (
                <><MetaSep /><Text style={styles.metaTxt}>{allSeasons.length} Season{allSeasons.length > 1 ? 's' : ''}</Text></>
              )}
              <View style={styles.hdTag}><Text style={styles.hdTagTxt}>HD</Text></View>
              {loadingInfo && <ActivityIndicator size="small" color="#00b8cc" />}
            </View>

            {/* Genre tags */}
            {genres.length > 0 && (
              <View style={styles.genreRow}>
                {genres.map(g => <GenreTag key={g} label={g} />)}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => {
                  if (isSeries && episodeList.length > 0) {
                    const ep = episodeList[0];
                    navigation.navigate('Play', {
                      item: {
                        id: ep.id,
                        title: `${title} · S${selectedSeason}E${ep.episode_num}: ${ep.title || ''}`,
                        type: 'series',
                        container_extension: ep.container_extension || 'mkv',
                        stream_id: ep.id,
                      },
                    });
                  } else {
                    navigation.navigate('Play', { item: movie });
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={17} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.playTxt}>{isSeries ? 'Play S1 E1' : 'Play'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secBtn, inList && styles.secBtnActive]}
                onPress={() => toggleMyList(movie)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={inList ? 'heart' : 'heart-outline'}
                  size={17}
                  color={inList ? '#000' : '#ffffff'}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.secTxt, inList && styles.secTxtActive]}>
                  {inList ? 'Saved' : 'My List'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconBtn} onPress={onShare} activeOpacity={0.85}>
                <Ionicons name="share-social-outline" size={19} color="#aaaaaa" />
              </TouchableOpacity>
            </View>

            {/* Synopsis */}
            {!!plot && (
              <View style={styles.synopsisBlock}>
                <Text style={styles.blockLabel}>Synopsis</Text>
                <Text style={styles.plotTxt}>{plot}</Text>
              </View>
            )}

            {/* Details */}
            {(!!director || !!cast || !!genreStr) && (
              <View style={styles.detailCard}>
                {!!director && (
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={13} color="#555555" />
                    <Text style={styles.detailLabel}>Director</Text>
                    <Text style={styles.detailValue}>{director}</Text>
                  </View>
                )}
                {!!cast && (
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={13} color="#555555" />
                    <Text style={styles.detailLabel}>Cast</Text>
                    <Text style={styles.detailValue} numberOfLines={3}>{cast}</Text>
                  </View>
                )}
                {!!genreStr && (
                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag-outline" size={13} color="#555555" />
                    <Text style={styles.detailLabel}>Genre</Text>
                    <Text style={styles.detailValue}>{genreStr}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Episodes (series only) ── */}
        {isSeries && allSeasons.length > 0 && (
          <View style={styles.episodesSection}>
            <Text style={styles.sectionTitle}>Episodes</Text>

            {/* Season tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonTabsWrap}>
              {allSeasons.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.seasonTab, selectedSeason === s && styles.seasonTabActive]}
                  onPress={() => setSelectedSeason(s)}
                >
                  <Text style={[styles.seasonTabTxt, selectedSeason === s && styles.seasonTabTxtActive]}>
                    Season {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Episode list */}
            {episodeList.length > 0 ? (
              <View style={styles.epList}>
                {episodeList.map(ep => (
                  <EpisodeRow
                    key={String(ep.id)}
                    ep={ep}
                    seasonNum={selectedSeason}
                    seriesTitle={title}
                    onPlay={() => navigation.navigate('Play', {
                      item: {
                        id: ep.id,
                        title: `${title} · S${selectedSeason}E${ep.episode_num}: ${ep.title || ''}`,
                        type: 'series',
                        container_extension: ep.container_extension || 'mkv',
                        stream_id: ep.id,
                      },
                    })}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.epEmpty}>
                <Text style={styles.epEmptyTxt}>No episodes found for this season</Text>
              </View>
            )}
          </View>
        )}

        {/* ── More Like This ── */}
        {more.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={styles.sectionTitle}>More Like This</Text>
            <FlatList
              horizontal
              data={more}
              keyExtractor={i => String(i.id || i.title)}
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 4 }}
              renderItem={({ item, index }) => (
                <MovieCard
                  item={item}
                  width={110}
                  onPress={() => navigation.push('MovieDetail', { movie: item })}
                  onToggleList={() => toggleMyList(item)}
                  inList={myListSet.has(item.id || item.title)}
                  hasTVPreferredFocus={Platform.isTV && index === 0}
                />
              )}
            />
          </View>
        )}

      </ScrollView>

      {/* Toast */}
      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastTxt}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0a0a0a' },
  scrim:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.80)' },
  scroll: { flex: 1 },

  // ── Two-column ────────────────────────────────────────────────────────────
  mainRow: {
    flexDirection: 'row',
    padding: 24,
    gap: 28,
    alignItems: 'flex-start',
  },

  posterCol: { width: POSTER_W, flexShrink: 0 },
  poster: {
    width: POSTER_W, height: POSTER_H,
    borderRadius: 14,
    backgroundColor: '#141414',
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  posterEmpty: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2c2c2c',
  },
  typeTag: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  typeTagTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  infoCol: { flex: 1, gap: 16 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  backBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 4,
  },
  title: { flex: 1, color: '#ffffff', fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.3 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,197,24,0.3)',
  },
  ratingTxt: { color: '#f5c518', fontSize: 13, fontWeight: '700' },
  metaTxt:   { color: '#888888', fontSize: 13 },
  metaSep:   { color: '#444444', fontSize: 12 },
  hdTag: {
    borderWidth: 1, borderColor: '#3a3a3a', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  hdTagTxt: { color: '#666666', fontSize: 10, fontWeight: '700' },

  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    backgroundColor: 'rgba(0,184,204,0.1)',
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,184,204,0.28)',
  },
  genreTagTxt: { color: '#00b8cc', fontSize: 12, fontWeight: '600' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#00b8cc', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  playTxt: { color: '#000', fontWeight: '800', fontSize: 15 },
  secBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#151515', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 13,
    borderWidth: 1, borderColor: '#2c2c2c',
  },
  secBtnActive: { backgroundColor: '#00b8cc', borderColor: '#00b8cc' },
  secTxt:       { color: '#fff', fontWeight: '600', fontSize: 14 },
  secTxtActive: { color: '#000' },
  iconBtn: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#2c2c2c',
    alignItems: 'center', justifyContent: 'center',
  },

  synopsisBlock: { gap: 8 },
  blockLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  plotTxt:    { color: '#bbbbbb', fontSize: 13, lineHeight: 21 },

  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  detailRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailLabel: { color: '#555555', fontSize: 12, fontWeight: '600', width: 60, flexShrink: 0, paddingTop: 1 },
  detailValue: { flex: 1, color: '#bbbbbb', fontSize: 12, lineHeight: 18 },

  // ── Episodes section ──────────────────────────────────────────────────────
  episodesSection: {
    marginHorizontal: 24,
    marginTop: 4,
    paddingTop: 20,
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
    gap: 14,
  },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  seasonTabsWrap: { gap: 8, paddingBottom: 2 },
  seasonTab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#2c2c2c',
    backgroundColor: '#111111',
  },
  seasonTabActive: { borderColor: '#00b8cc', backgroundColor: 'rgba(0,184,204,0.12)' },
  seasonTabTxt:       { color: '#888888', fontSize: 13, fontWeight: '600' },
  seasonTabTxtActive: { color: '#00b8cc' },

  epList: { gap: 2 },

  epRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  epThumb: {
    width: 120, height: 68,
    borderRadius: 8, backgroundColor: '#1a1a1a', flexShrink: 0,
  },
  epThumbEmpty: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2c2c2c',
  },
  epThumbNum: { color: '#333333', fontSize: 20, fontWeight: '700' },
  epInfo:     { flex: 1, gap: 4 },
  epTitle:    { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  epMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  epMeta:     { color: '#666666', fontSize: 11 },
  epPlot:     { color: '#888888', fontSize: 11, lineHeight: 16 },
  epPlayBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#00b8cc',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  epEmpty:    { paddingVertical: 20, alignItems: 'center' },
  epEmptyTxt: { color: '#555555', fontSize: 13 },

  // ── More Like This ────────────────────────────────────────────────────────
  moreSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
    gap: 14,
  },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderRadius: 22, paddingVertical: 11, paddingHorizontal: 22,
    borderWidth: 1, borderColor: '#2c2c2c',
  },
  toastTxt: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
});
