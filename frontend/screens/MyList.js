import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as mylist from '../services/mylist';
import { fetchVodItems, fetchLiveChannels } from '../services/provider';
import MovieCard from '../components/MovieCard';
import BG from '../assets/public/GR81_AQUA_bg.png';

export default function MyList({ navigation }) {
  const [ids, setIds]       = useState(new Set());
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', load);
    load();
    return () => { unsub && unsub(); };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const saved = await mylist.getList();
      const idSet = new Set(saved);
      setIds(idSet);
      const [vod, live] = await Promise.allSettled([fetchVodItems(), fetchLiveChannels()]);
      const all = [];
      if (vod.status === 'fulfilled' && Array.isArray(vod.value)) all.push(...vod.value);
      if (live.status === 'fulfilled' && Array.isArray(live.value)) {
        all.push(...live.value.map(ch => ({
          id: ch.id,
          title: ch.name || ch.title,
          posterUrl: ch.logoUrl,
          genre: ch.category || 'Live',
          hlsUrl: ch.hlsUrl,
          _source: 'live',
        })));
      }
      setItems(all.filter(i => idSet.has(i.id || i._id || i.title)));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.count}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.empty}>
          <Ionicons name="hourglass-outline" size={36} color="#333333" style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTxt}>Loading...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color="#333333" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTxt}>No favourites yet</Text>
          <Text style={styles.emptySub}>Long-press any movie or series to add it here</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={4}
          columnWrapperStyle={{ gap: 12 }}
          keyExtractor={i => String(i?.id || i?._id || i?.title)}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <MovieCard
              item={item}
              width={120}
              onPress={() => navigation.navigate('MovieDetail', { movie: item })}
              onLongPress={() => navigation.navigate('Play', { item })}
              onToggleList={async () => {
                const { list } = await mylist.toggle(item.id || item._id || item.title);
                setIds(new Set(list));
                load();
              }}
              inList={ids.has(item.id || item._id || item.title)}
              hasTVPreferredFocus={Platform.isTV && index === 0}
            />
          )}
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: '#151515',
    borderWidth: 1, borderColor: '#2c2c2c',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  count: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '500',
  },

  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyTxt: {
    color: '#aaaaaa',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySub: {
    color: '#555555',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
