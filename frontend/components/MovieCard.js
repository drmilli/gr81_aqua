import React, { useMemo, useState } from 'react';
import { Image, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';

export default function MovieCard({ item, width = 130, onPress, onLongPress, onToggleList, inList, hasTVPreferredFocus = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const posterUri = useMemo(() => {
    const raw = item?.posterUrl;
    if (typeof raw !== 'string') return null;
    const s = raw.trim();
    if (!s) return null;
    if (s.startsWith('//')) return `https:${s}`;
    if (/^https?:\/\//i.test(s)) return s;
    return null;
  }, [item?.posterUrl]);
  const source = item.posterLocal ?? (!imgFailed && posterUri ? { uri: posterUri } : require('../assets/public/logo.png'));
  const height = Math.round((width * 3) / 2); // 2:3 portrait
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, focused && styles.cardFocused, { width, height }]}
    >
      <Image
        source={source}
        style={[styles.poster, { width, height }]}
        onError={() => setImgFailed(true)}
      />
      <TouchableOpacity
        onPress={onToggleList}
        style={[styles.fab, inList && styles.fabActive]}
        activeOpacity={0.8}
      >
        <Ionicons name={inList ? 'checkmark' : 'add'} size={16} color={inList ? '#000' : theme.colors.text} />
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardFocused: {
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  poster: {
    resizeMode: 'cover',
    borderRadius: 8,
    backgroundColor: theme.colors.cardAlt,
  },
  fab: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
});
