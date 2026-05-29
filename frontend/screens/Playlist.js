import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Modal, TextInput, ActivityIndicator, Platform, Linking, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDeviceId } from '../services/licensing';
import { getProfiles, upsertProfile, applyProfile, removeProfile } from '../services/profiles';
import FlameIcon from '../assets/public/icon.png';
import BG from '../assets/public/GR81_AQUA_bg.png';

// ── Device helpers ────────────────────────────────────────────────────────────

function makeDeviceKey(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  }
  return String(Math.abs(h) % 1000000).padStart(6, '0');
}

function makeMac(id) {
  const hex = id.replace(/[^a-f0-9]/gi, '').padEnd(12, '0').slice(0, 12).toUpperCase();
  return [0, 2, 4, 6, 8, 10].map(i => hex.slice(i, i + 2)).join(':');
}

// ── Xtream URL normalizer ─────────────────────────────────────────────────────

function normalizeXtream(serverUrl, username, password) {
  let base = String(serverUrl || '').trim();
  if (base && !/^https?:\/\//i.test(base)) base = `http://${base}`;
  try {
    const url = new URL(base);
    if (url.searchParams.has('username')) { if (!username) username = url.searchParams.get('username'); }
    if (url.searchParams.has('password')) { if (!password) password = url.searchParams.get('password'); }
    base = url.origin + url.pathname.replace(/\/(get\.php|player_api\.php)$/i, '').replace(/\/+$/, '');
  } catch {}
  return { baseUrl: base.replace(/\/+$/, ''), username: String(username || '').trim(), password: String(password || '').trim() };
}

// ── Add Playlist Modal ────────────────────────────────────────────────────────

function AddModal({ visible, onClose, onSaved }) {
  const [mode, setMode]         = useState('xtream');
  const [name, setName]         = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [m3uUrl, setM3uUrl]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const reset = () => { setName(''); setServerUrl(''); setM3uUrl(''); setUsername(''); setPassword(''); setError(''); setMode('xtream'); };

  const canSave = name.trim() && (mode === 'm3u' ? m3uUrl.trim() : serverUrl.trim() && username.trim() && password.trim());

  const doSave = async () => {
    try {
      setSaving(true); setError('');
      const id = Date.now().toString();
      if (mode === 'xtream') {
        const n = normalizeXtream(serverUrl, username, password);
        await upsertProfile({ id, name: name.trim(), provider: { type: 'xtream', baseUrl: n.baseUrl, username: n.username, password: n.password } });
      } else {
        await upsertProfile({ id, name: name.trim(), provider: { type: 'm3u', providerId: m3uUrl.trim() } });
      }
      await applyProfile(id);
      reset(); onSaved();
    } catch (e) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { reset(); onClose(); }}>
      <View style={modal.backdrop}>
        <View style={modal.card}>
          <Text style={modal.title}>Add Playlist</Text>

          {/* Mode toggle */}
          <View style={modal.modeRow}>
            {['xtream', 'm3u'].map(m => (
              <TouchableOpacity key={m} style={[modal.modeBtn, mode === m && modal.modeBtnActive]} onPress={() => setMode(m)}>
                <Text style={[modal.modeTxt, mode === m && modal.modeTxtActive]}>{m === 'xtream' ? 'Xtream' : 'M3U'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={modal.input} placeholder="Playlist Name" placeholderTextColor="#3a5878" value={name} onChangeText={setName} selectionColor="#00b8cc" />

          {mode === 'xtream' ? (
            <>
              <TextInput style={modal.input} placeholder="Server URL" placeholderTextColor="#3a5878" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" keyboardType="url" selectionColor="#00b8cc" />
              <TextInput style={modal.input} placeholder="Username" placeholderTextColor="#3a5878" value={username} onChangeText={setUsername} autoCapitalize="none" selectionColor="#00b8cc" />
              <TextInput style={modal.input} placeholder="Password" placeholderTextColor="#3a5878" value={password} onChangeText={setPassword} secureTextEntry selectionColor="#00b8cc" />
            </>
          ) : (
            <TextInput style={modal.input} placeholder="M3U URL" placeholderTextColor="#3a5878" value={m3uUrl} onChangeText={setM3uUrl} autoCapitalize="none" keyboardType="url" selectionColor="#00b8cc" />
          )}

          {!!error && <Text style={modal.error}>{error}</Text>}

          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={modal.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modal.saveBtn, !canSave && { opacity: 0.4 }]} onPress={doSave} disabled={!canSave || saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.saveTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Playlist({ navigation }) {
  const [playlists, setPlaylists]     = useState([]);
  const [deviceId, setDeviceId]       = useState('');
  const [deviceKey, setDeviceKey]     = useState('------');
  const [macAddress, setMacAddress]   = useState('--:--:--:--:--:--');
  const [showAdd, setShowAdd]         = useState(false);

  useEffect(() => {
    getDeviceId().then(id => {
      setDeviceId(id);
      setDeviceKey(makeDeviceKey(id));
      setMacAddress(makeMac(id));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getProfiles().then(setPlaylists).catch(() => {});
    }, [])
  );

  const handleSelect = async (id) => {
    await applyProfile(id);
    navigation.navigate('Home');
  };

  const handleDelete = async (id) => {
    await removeProfile(id);
    getProfiles().then(setPlaylists);
  };

  const qrData = `gr81aqua://device?key=${deviceKey}&mac=${macAddress}`;
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=10`;

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />

      {/* ── Left panel ── */}
      <View style={styles.left}>

        {/* Header */}
        <View style={styles.header}>
          <Image source={FlameIcon} style={styles.headerFlame} resizeMode="contain" />
          <Text style={styles.headerBrand}>
            <Text style={{ color: '#e8f4ff' }}>GR81</Text>
            <Text style={{ color: '#00b8cc' }}> AQUA</Text>
          </Text>
          <View style={styles.divider} />
          <Text style={styles.headerTitle}>Playlist</Text>
        </View>

        {/* Playlist list + Add button */}
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          {playlists.map(p => (
            <View key={p.id} style={styles.playlistCard}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSelect(p.id)}>
                <Text style={styles.playlistName} numberOfLines={1}>{p.name || 'Playlist'}</Text>
                <Text style={styles.playlistType}>{String(p.provider?.type || '').toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Playlist card */}
          <TouchableOpacity style={styles.addCard} onPress={() => setShowAdd(true)} activeOpacity={0.75}>
            <View style={styles.addIcon}>
              <Ionicons name="add" size={22} color="#e8f4ff" />
            </View>
            <Text style={styles.addLabel}>Add Playlist</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom branding */}
        <View style={styles.bottomBrand}>
          <Text style={styles.bottomBrandName}>GR81 AQUA</Text>
          <Text style={styles.bottomBrandSub}>Universal IPTV Player</Text>
        </View>
      </View>

      {/* ── Right panel ── */}
      <View style={styles.right}>

        {/* QR code */}
        <View style={styles.qrWrap}>
          <Image source={{ uri: qrUrl }} style={styles.qr} resizeMode="contain" />
        </View>

        {/* Open Website button */}
        <TouchableOpacity
          style={styles.websiteBtn}
          onPress={() => Linking.openURL('https://gr81aqua.com')}
        >
          <Text style={styles.websiteBtnTxt}>Open Website</Text>
        </TouchableOpacity>

        {/* Brand */}
        <Text style={styles.rightBrand}>
          <Text style={{ color: '#e8f4ff' }}>GR81 </Text>
          <Text style={{ color: '#00b8cc' }}>AQUA</Text>
        </Text>

        {/* MAC Address */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>MAC Address</Text>
          <Text style={styles.infoValue}>{macAddress}</Text>
        </View>

        {/* Device Key */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Device Key</Text>
          <Text style={styles.infoValue}>{deviceKey}</Text>
        </View>

        {/* Version */}
        <Text style={styles.version}>v1.0</Text>
      </View>

      {/* Add Playlist Modal */}
      <AddModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          getProfiles().then(setPlaylists);
          navigation.navigate('Home');
        }}
      />
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  // ── Left panel ────────────────────────────────────────────────
  left: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  headerFlame: { width: 24, height: 36 },
  headerBrand: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  divider: { width: 1, height: 28, backgroundColor: '#1e3d5c', marginHorizontal: 4 },
  headerTitle: { color: '#e8f4ff', fontSize: 22, fontWeight: '700' },

  // List
  listScroll: { flex: 1 },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1e38',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a3352',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  playlistName: { color: '#e8f4ff', fontSize: 14, fontWeight: '600' },
  playlistType: { color: '#3a5878', fontSize: 11, marginTop: 2 },
  deleteBtn:    { padding: 6 },

  // Add card
  addCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a3352',
    backgroundColor: '#0a1828',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d2a4a',
    borderWidth: 1,
    borderColor: '#1a3352',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { color: '#9fb8d0', fontSize: 13, fontWeight: '500' },

  // Bottom branding
  bottomBrand:    { alignItems: 'flex-start', marginTop: 16 },
  bottomBrandName:{ color: '#e8f4ff', fontSize: 15, fontWeight: '800' },
  bottomBrandSub: { color: '#4a6a88', fontSize: 12, marginTop: 2 },

  // ── Right panel ───────────────────────────────────────────────
  right: {
    width: 340,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  // QR code
  qrWrap: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  qr: { width: 180, height: 180 },

  // Open Website
  websiteBtn: {
    width: '100%',
    backgroundColor: '#0c1e38',
    borderWidth: 1,
    borderColor: '#1a3352',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  websiteBtnTxt: { color: '#e8f4ff', fontSize: 13, fontWeight: '600' },

  // Brand
  rightBrand: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },

  // Info blocks
  infoBlock: { alignItems: 'center', gap: 3 },
  infoLabel: { color: '#e8f4ff', fontSize: 13, fontWeight: '700' },
  infoValue: { color: '#00b8cc', fontSize: 14, fontWeight: '600', letterSpacing: 0.8 },

  // Version
  version: {
    position: 'absolute',
    bottom: 20,
    right: 24,
    color: '#4a6a88',
    fontSize: 13,
    fontWeight: '600',
  },
});

// ── Modal styles ──────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 400,
    backgroundColor: '#0c1e38',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#17304e',
  },
  title: { color: '#e8f4ff', fontSize: 17, fontWeight: '700', marginBottom: 18 },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#081428',
    borderRadius: 30,
    padding: 4,
    marginBottom: 18,
  },
  modeBtn:       { flex: 1, paddingVertical: 8, borderRadius: 26, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#00b8cc' },
  modeTxt:       { fontSize: 13, fontWeight: '600', color: '#4a7090' },
  modeTxtActive: { color: '#fff' },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e3d5c',
    color: '#e8f4ff',
    fontSize: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  error:  { color: '#ff6b6b', fontSize: 12, marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0a1828',
    borderWidth: 1,
    borderColor: '#1e3d5c',
    alignItems: 'center',
  },
  cancelTxt: { color: '#9fb8d0', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#00b8cc',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveTxt: { color: '#fff', fontWeight: '700' },
});
