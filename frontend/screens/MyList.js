import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import theme from '../theme';
import * as mylist from '../services/mylist';
import { fetchVodItems, fetchLiveChannels } from '../services/provider';
import MovieCard from '../components/MovieCard';

export default function MyList({ navigation }) {
  const [ids, setIds] = useState(new Set());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      // Reload on focus
      load();
    });
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
      if (live.status === 'fulfilled' && Array.isArray(live.value)) all.push(...live.value.map(ch => ({
        id: ch.id,
        title: ch.name || ch.title,
        posterUrl: ch.logoUrl,
        genre: ch.category || 'Live',
        hlsUrl: ch.hlsUrl,
        _source: 'live',
      })));
      const filtered = all.filter(i => idSet.has(i.id || i._id || i.title));
      setItems(filtered);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const keyExtractor = (i) => (i?.id?.toString?.() || i?._id || i?.title);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My List</Text>
      {loading ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Loading...</Text></View>
      ) : items.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No favorites yet</Text></View>
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          columnWrapperStyle={{ gap: 10 }}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => (
            <MovieCard
              item={item}
              width={110}
              onPress={() => navigation.navigate('MovieDetail', { movie: item })}
              onLongPress={() => navigation.navigate('Play', { item })}
              onToggleList={async () => { const { list } = await mylist.toggle(item.id || item._id || item.title); setIds(new Set(list)); load(); }}
              inList={ids.has(item.id || item._id || item.title)}
              hasTVPreferredFocus={Platform.isTV && index === 0}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: theme.colors.bg },
  title: { ...theme.text.title, marginBottom: 12 },
  empty: { height: 140, borderRadius: theme.radius, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { ...theme.text.small },
});
