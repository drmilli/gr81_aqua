import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, ScrollView, TextInput, Switch, Pressable, Alert, Linking, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDeviceId } from '../services/licensing';
import BG from '../assets/public/GR81_AQUA_bg.png';
import { getSettings, saveSettings } from '../services/settings';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDeviceKey(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  return String(Math.abs(h) % 1000000).padStart(6, '0');
}
function makeMac(id) {
  const hex = id.replace(/[^a-f0-9]/gi, '').padEnd(12, '0').slice(0, 12).toUpperCase();
  return [0, 2, 4, 6, 8, 10].map(i => hex.slice(i, i + 2)).join(':');
}

// ── Settings tiles definition ─────────────────────────────────────────────────

const TILES = [
  { id: 'parental',       label: 'Parental control',       icon: 'lock-closed-outline' },
  { id: 'playlist',       label: 'Change Playlist',         icon: 'refresh-circle-outline' },
  { id: 'language',       label: 'Change Language',         icon: 'language-outline' },
  { id: 'layout',         label: 'Change Layout',           icon: 'grid-outline' },
  { id: 'hide_live',      label: 'Hide Live Categories',    icon: 'eye-off-outline' },
  { id: 'hide_vod',       label: 'Hide VOD Categories',     icon: 'eye-off-outline' },
  { id: 'hide_series',    label: 'Hide Series Categories',  icon: 'eye-off-outline' },
  { id: 'clear_channels', label: 'Clear History Channels',  icon: 'trash-outline' },
  { id: 'clear_movies',   label: 'Clear History Movies',    icon: 'trash-outline' },
  { id: 'clear_series',   label: 'Clear History Series',    icon: 'trash-outline' },
  { id: 'live_sort',      label: 'Live Sort',               icon: 'funnel-outline' },
  { id: 'stream_format',  label: 'Live Stream Format',      icon: 'radio-outline' },
  { id: 'external',       label: 'External player',         icon: 'play-circle-outline' },
  { id: 'automatic',      label: 'Automatic',               icon: 'add-circle-outline' },
  { id: 'time_format',    label: 'Time format',             icon: 'time-outline' },
  { id: 'subtitle',       label: 'Subtitle Settings',       icon: 'text-outline' },
  { id: 'device_type',    label: 'Select Device Type',      icon: 'desktop-outline' },
  { id: 'update',         label: 'Update Now',              icon: 'cloud-download-outline' },
  { id: 'youtube',        label: 'Youtube',                 icon: 'logo-youtube' },
];

const NUM_COLS = 4;

// ── Generic modal shell ───────────────────────────────────────────────────────

function SettingsModal({ title, visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.centeredView}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <View style={m.card}>
          <View style={m.cardHeader}>
            <Text style={m.cardTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}>
              <Ionicons name="close" size={20} color="#cccccc" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Option row (radio/select style) ──────────────────────────────────────────

function OptionRow({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={m.optRow} onPress={onPress}>
      <Text style={[m.optLabel, selected && m.optLabelActive]}>{label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={18} color="#00b8cc" />}
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings({ navigation }) {
  const [settings, setSettings]   = useState({});
  const [deviceKey, setDeviceKey] = useState('------');
  const [macAddress, setMacAddress] = useState('--:--:--:--:--:--');
  const [activeModal, setActiveModal] = useState(null); // tile id
  const [activeTile, setActiveTile]   = useState('parental');

  // Sub-modal state
  const [pin, setPin]       = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
    getDeviceId().then(id => {
      setDeviceKey(makeDeviceKey(id));
      setMacAddress(makeMac(id));
    });
  }, []);

  const update = useCallback(async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  const open  = (id) => { setActiveTile(id); setActiveModal(id); };
  const close = ()   => setActiveModal(null);

  const confirmClear = (label) => {
    Alert.alert('Clear History', `Clear ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => close() },
    ]);
  };

  const handleTile = (id) => {
    if (id === 'playlist')       { navigation.navigate('Playlist'); return; }
    if (id === 'youtube')        { Linking.openURL('https://www.youtube.com'); return; }
    if (id === 'update')         { open(id); return; }
    if (id === 'clear_channels') { confirmClear('Channel History'); return; }
    if (id === 'clear_movies')   { confirmClear('Movie History'); return; }
    if (id === 'clear_series')   { confirmClear('Series History'); return; }
    open(id);
  };

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-undo-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* ── Grid ── */}
        <FlatList
          data={TILES}
          keyExtractor={t => t.id}
          numColumns={NUM_COLS}
          scrollEnabled={false}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tile, activeTile === item.id && styles.tileActive]}
              onPress={() => handleTile(item.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={activeTile === item.id ? '#00b8cc' : '#888888'}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.tileLabel, activeTile === item.id && styles.tileLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* ── Bottom info bar ── */}
        <View style={styles.infoBar}>
          <Ionicons name="git-network-outline" size={14} color="#888888" style={{ marginRight: 6 }} />
          <Text style={styles.infoTxt}>MAC Address: <Text style={styles.infoVal}>{macAddress}</Text></Text>
          <View style={styles.infoDivider} />
          <Ionicons name="key-outline" size={14} color="#888888" style={{ marginRight: 6 }} />
          <Text style={styles.infoTxt}>Device Key: <Text style={styles.infoVal}>{deviceKey}</Text></Text>
        </View>

      </ScrollView>

      {/* ══ MODALS ══════════════════════════════════════════════ */}

      {/* Parental Control */}
      <SettingsModal title="Parental Control" visible={activeModal === 'parental'} onClose={close}>
        <View style={m.row}>
          <Text style={m.label}>Enable Parental Control</Text>
          <Switch
            value={!!settings.parentalEnabled}
            onValueChange={v => update({ parentalEnabled: v })}
            trackColor={{ true: '#00b8cc' }}
          />
        </View>
        {settings.parentalEnabled && (
          <>
            <TextInput style={m.input} placeholder="Set PIN (4 digits)" placeholderTextColor="#666666" value={pin} onChangeText={setPin} keyboardType="numeric" maxLength={4} secureTextEntry selectionColor="#00b8cc" />
            <TextInput style={m.input} placeholder="Confirm PIN" placeholderTextColor="#666666" value={pinConfirm} onChangeText={setPinConfirm} keyboardType="numeric" maxLength={4} secureTextEntry selectionColor="#00b8cc" />
            <TouchableOpacity style={m.saveBtn} onPress={() => { if (pin === pinConfirm && pin.length === 4) { update({ parentalPin: pin }); close(); } }}>
              <Text style={m.saveTxt}>Save PIN</Text>
            </TouchableOpacity>
          </>
        )}
      </SettingsModal>

      {/* Change Language */}
      <SettingsModal title="Change Language" visible={activeModal === 'language'} onClose={close}>
        {['English', 'French', 'Spanish', 'Arabic', 'German', 'Portuguese', 'Turkish', 'Italian'].map(lang => (
          <OptionRow key={lang} label={lang} selected={settings.language === lang} onPress={() => update({ language: lang })} />
        ))}
      </SettingsModal>

      {/* Change Layout */}
      <SettingsModal title="Change Layout" visible={activeModal === 'layout'} onClose={close}>
        {[{ id: 'grid', label: 'Grid View' }, { id: 'list', label: 'List View' }, { id: 'large', label: 'Large Grid' }].map(o => (
          <OptionRow key={o.id} label={o.label} selected={settings.layout === o.id} onPress={() => update({ layout: o.id })} />
        ))}
      </SettingsModal>

      {/* Hide Live Categories */}
      <SettingsModal title="Hide Live Categories" visible={activeModal === 'hide_live'} onClose={close}>
        <Text style={m.hint}>Toggle to hide categories from the Live TV screen.</Text>
        {['Recently Viewed', 'Favorite', 'Lock'].map(cat => (
          <View key={cat} style={m.row}>
            <Text style={m.label}>{cat}</Text>
            <Switch
              value={!!(settings.hiddenLive || {})[cat]}
              onValueChange={v => update({ hiddenLive: { ...(settings.hiddenLive || {}), [cat]: v } })}
              trackColor={{ true: '#00b8cc' }}
            />
          </View>
        ))}
      </SettingsModal>

      {/* Hide VOD Categories */}
      <SettingsModal title="Hide VOD Categories" visible={activeModal === 'hide_vod'} onClose={close}>
        <Text style={m.hint}>Toggle to hide categories from the Movies screen.</Text>
        {['Recently Viewed', 'Favorite'].map(cat => (
          <View key={cat} style={m.row}>
            <Text style={m.label}>{cat}</Text>
            <Switch
              value={!!(settings.hiddenVod || {})[cat]}
              onValueChange={v => update({ hiddenVod: { ...(settings.hiddenVod || {}), [cat]: v } })}
              trackColor={{ true: '#00b8cc' }}
            />
          </View>
        ))}
      </SettingsModal>

      {/* Hide Series Categories */}
      <SettingsModal title="Hide Series Categories" visible={activeModal === 'hide_series'} onClose={close}>
        <Text style={m.hint}>Toggle to hide categories from the Series screen.</Text>
        {['Recently Viewed', 'Favorite'].map(cat => (
          <View key={cat} style={m.row}>
            <Text style={m.label}>{cat}</Text>
            <Switch
              value={!!(settings.hiddenSeries || {})[cat]}
              onValueChange={v => update({ hiddenSeries: { ...(settings.hiddenSeries || {}), [cat]: v } })}
              trackColor={{ true: '#00b8cc' }}
            />
          </View>
        ))}
      </SettingsModal>

      {/* Live Sort */}
      <SettingsModal title="Live Sort" visible={activeModal === 'live_sort'} onClose={close}>
        {[
          { id: 'added', label: 'By Added' },
          { id: 'name_asc', label: 'By Name (A–Z)' },
          { id: 'name_desc', label: 'By Name (Z–A)' },
          { id: 'number', label: 'By Channel Number' },
        ].map(o => (
          <OptionRow key={o.id} label={o.label} selected={settings.liveSort === o.id} onPress={() => update({ liveSort: o.id })} />
        ))}
      </SettingsModal>

      {/* Live Stream Format */}
      <SettingsModal title="Live Stream Format" visible={activeModal === 'stream_format'} onClose={close}>
        {[
          { id: 'ts',   label: 'TS (Transport Stream)' },
          { id: 'm3u8', label: 'M3U8 (HLS)' },
          { id: 'rtmp', label: 'RTMP' },
        ].map(o => (
          <OptionRow key={o.id} label={o.label} selected={settings.streamFormat === o.id} onPress={() => update({ streamFormat: o.id })} />
        ))}
      </SettingsModal>

      {/* External Player */}
      <SettingsModal title="External Player" visible={activeModal === 'external'} onClose={close}>
        <View style={m.row}>
          <Text style={m.label}>Use External Player</Text>
          <Switch value={!!settings.externalPlayer} onValueChange={v => update({ externalPlayer: v })} trackColor={{ true: '#00b8cc' }} />
        </View>
        <Text style={m.hint}>When enabled, streams will open in your device's default media player.</Text>
      </SettingsModal>

      {/* Automatic */}
      <SettingsModal title="Automatic" visible={activeModal === 'automatic'} onClose={close}>
        <View style={m.row}>
          <Text style={m.label}>Auto-play on start</Text>
          <Switch value={!!settings.autoPlay} onValueChange={v => update({ autoPlay: v })} trackColor={{ true: '#00b8cc' }} />
        </View>
        <View style={m.row}>
          <Text style={m.label}>Auto-resume last channel</Text>
          <Switch value={!!settings.autoResume} onValueChange={v => update({ autoResume: v })} trackColor={{ true: '#00b8cc' }} />
        </View>
        <View style={m.row}>
          <Text style={m.label}>Auto-update EPG</Text>
          <Switch value={!!settings.autoEpg} onValueChange={v => update({ autoEpg: v })} trackColor={{ true: '#00b8cc' }} />
        </View>
      </SettingsModal>

      {/* Time Format */}
      <SettingsModal title="Time Format" visible={activeModal === 'time_format'} onClose={close}>
        {[{ id: '12h', label: '12-hour (3:30 PM)' }, { id: '24h', label: '24-hour (15:30)' }].map(o => (
          <OptionRow key={o.id} label={o.label} selected={settings.timeFormat === o.id} onPress={() => update({ timeFormat: o.id })} />
        ))}
      </SettingsModal>

      {/* Subtitle Settings */}
      <SettingsModal title="Subtitle Settings" visible={activeModal === 'subtitle'} onClose={close}>
        <View style={m.row}>
          <Text style={m.label}>Show Subtitles</Text>
          <Switch value={!!settings.subtitles} onValueChange={v => update({ subtitles: v })} trackColor={{ true: '#00b8cc' }} />
        </View>
        <Text style={[m.label, { marginTop: 12, marginBottom: 6 }]}>Font Size</Text>
        {['Small', 'Medium', 'Large'].map(s => (
          <OptionRow key={s} label={s} selected={settings.subtitleSize === s.toLowerCase()} onPress={() => update({ subtitleSize: s.toLowerCase() })} />
        ))}
        <Text style={[m.label, { marginTop: 12, marginBottom: 6 }]}>Color</Text>
        {['White', 'Yellow', 'Cyan'].map(c => (
          <OptionRow key={c} label={c} selected={settings.subtitleColor === c.toLowerCase()} onPress={() => update({ subtitleColor: c.toLowerCase() })} />
        ))}
      </SettingsModal>

      {/* Select Device Type */}
      <SettingsModal title="Select Device Type" visible={activeModal === 'device_type'} onClose={close}>
        {[
          { id: 'tv',      label: 'Android TV / Smart TV' },
          { id: 'firetv',  label: 'Amazon Fire TV' },
          { id: 'phone',   label: 'Phone / Tablet' },
          { id: 'box',     label: 'Set-top Box' },
        ].map(o => (
          <OptionRow key={o.id} label={o.label} selected={settings.deviceType === o.id} onPress={() => update({ deviceType: o.id })} />
        ))}
      </SettingsModal>

      {/* Update Now */}
      <SettingsModal title="Update Now" visible={activeModal === 'update'} onClose={close}>
        <View style={{ alignItems: 'center', paddingVertical: 20, gap: 12 }}>
          <Ionicons name="checkmark-circle" size={48} color="#00b8cc" />
          <Text style={m.label}>GR81 Aqua v1.0</Text>
          <Text style={m.hint}>You are running the latest version.</Text>
        </View>
      </SettingsModal>

    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.68)' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#151515',
    borderWidth: 1, borderColor: '#2c2c2c',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Grid
  grid: {
    paddingHorizontal: 16,
    gap: 10,
    flexGrow: 1,
  },
  row: { gap: 10 },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  tileActive: {
    borderColor: '#00b8cc',
    backgroundColor: '#1e1e1e',
  },
  tileLabel: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  tileLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },

  // Info bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 30,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 14,
    marginBottom: 16,
    gap: 6,
  },
  infoTxt: { color: '#888888', fontSize: 12 },
  infoVal: { color: '#aaaaaa', fontWeight: '600' },
  infoDivider: { width: 1, height: 14, backgroundColor: '#2c2c2c', marginHorizontal: 10 },
});

// ── Modal styles ──────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  card: {
    width: 380,
    maxHeight: 420,
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  closeBtn: { padding: 4 },

  // Content
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  label: { color: '#cccccc', fontSize: 13 },
  hint: { color: '#666666', fontSize: 12, paddingHorizontal: 20, paddingVertical: 12 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2c',
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  saveBtn: {
    margin: 20,
    backgroundColor: '#00b8cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Option row
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  optLabel:       { color: '#cccccc', fontSize: 13 },
  optLabelActive: { color: '#ffffff', fontWeight: '700' },
});
