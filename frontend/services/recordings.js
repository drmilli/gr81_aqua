import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Linking } from 'react-native';
import api from '../config/api';
import { getDeviceId } from './licensing';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KEY_DL_MAP = 'gr81aqua_recording_downloads_v1';
const KEY_LOCAL_RECS = 'gr81aqua_local_recordings_v1';

async function getMap() {
  try {
    const raw = await SecureStore.getItemAsync(KEY_DL_MAP);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
async function setMap(map) {
  try { await SecureStore.setItemAsync(KEY_DL_MAP, JSON.stringify(map || {})); } catch {}
}

async function getLocalList() {
  try {
    const raw = await SecureStore.getItemAsync(KEY_LOCAL_RECS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function setLocalList(list) {
  try { await SecureStore.setItemAsync(KEY_LOCAL_RECS, JSON.stringify(list || [])); } catch {}
}

function safeName(s) {
  return String(s || '')
    .replace(/[^a-z0-9\-_]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'recording';
}

// Active in-progress device downloads: id → FileSystem.DownloadResumable
const _activeDownloads = new Map();

// ─── Server-side recordings (live TV) ─────────────────────────────────────────

export async function listRecordings() {
  const deviceId = await getDeviceId();
  const res = await api.get('/recordings', { headers: { 'x-device-id': deviceId } });
  return Array.isArray(res.data) ? res.data : [];
}

export async function startRecording({ streamUrl, title } = {}) {
  const deviceId = await getDeviceId();
  const res = await api.post(
    '/recordings/start',
    { streamUrl, title },
    { headers: { 'x-device-id': deviceId } }
  );
  return res.data;
}

export async function stopRecording(id) {
  const deviceId = await getDeviceId();
  const res = await api.post(
    `/recordings/${encodeURIComponent(id)}/stop`,
    {},
    { headers: { 'x-device-id': deviceId } }
  );
  return res.data;
}

export async function downloadRecording(recording, { onProgress } = {}) {
  const id = recording?.id;
  const url = recording?.downloadUrl;
  if (!id || !url) throw new Error('Invalid recording');

  const dir = `${FileSystem.documentDirectory}recordings/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  const ext = String(recording?.format || 'ts').replace(/[^a-z0-9]/gi, '') || 'ts';
  const file = `${safeName(recording?.title)}_${String(id).slice(0, 8)}.${ext}`;
  const localUri = dir + file;

  const dl = FileSystem.createDownloadResumable(url, localUri, {}, (p) => {
    if (!onProgress) return;
    const total = p.totalBytesExpectedToWrite || 0;
    const done = p.totalBytesWritten || 0;
    onProgress(total > 0 ? done / total : 0);
  });

  const result = await dl.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  const map = await getMap();
  map[id] = result.uri;
  await setMap(map);
  return result.uri;
}

export async function getDownloadedUri(id) {
  const map = await getMap();
  const uri = map?.[id];
  return uri ? String(uri) : null;
}

export async function removeDownloadedRecording(id) {
  const map = await getMap();
  const uri = map?.[id];
  if (uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    delete map[id];
    await setMap(map);
  }
  return true;
}

// ─── Device-side recordings (VOD — downloads directly on device) ──────────────

export async function startDeviceRecording({ streamUrl, title } = {}) {
  const dir = `${FileSystem.documentDirectory}recordings/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  const rawExt = (streamUrl.match(/\.([a-z0-9]+)(\?|$)/i)?.[1] || 'mp4').toLowerCase();
  const ext = rawExt === 'm3u8' ? 'ts' : (['mp4', 'mkv', 'ts', 'avi'].includes(rawExt) ? rawExt : 'mp4');
  const id = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const localUri = `${dir}${safeName(title)}_${id}.${ext}`;

  const dl = FileSystem.createDownloadResumable(
    streamUrl,
    localUri,
    { headers: { 'User-Agent': 'IPTVSmartersPlayer', 'Accept': '*/*' } },
    () => {}
  );

  _activeDownloads.set(id, dl);

  // Download runs in background; update status when done
  dl.downloadAsync()
    .then(async (result) => {
      _activeDownloads.delete(id);
      const list = await getLocalList();
      const updated = list.map(r =>
        r.id === id ? { ...r, status: result?.uri ? 'finished' : 'failed', localUri: result?.uri || r.localUri } : r
      );
      await setLocalList(updated);
    })
    .catch(async () => {
      _activeDownloads.delete(id);
    });

  const rec = {
    id,
    title: title || 'Recording',
    status: 'recording',
    startedAt: new Date().toISOString(),
    localUri: null, // set only after download completes
    source: 'device',
  };
  const list = await getLocalList();
  list.unshift(rec);
  await setLocalList(list);

  return { id };
}

export async function stopDeviceRecording(id) {
  const dl = _activeDownloads.get(id);
  if (dl) {
    try { await dl.pauseAsync(); } catch {}
    _activeDownloads.delete(id);
  }
  const list = await getLocalList();
  const updated = list.map(r => r.id === id ? { ...r, status: 'finished' } : r);
  await setLocalList(updated);
  return { id };
}

export async function listDeviceRecordings() {
  const list = await getLocalList();
  // Verify files still exist
  const checked = await Promise.all(
    list.map(async (r) => {
      if (r.localUri && r.status === 'finished') {
        const info = await FileSystem.getInfoAsync(r.localUri).catch(() => ({ exists: false }));
        return { ...r, localUri: info.exists ? r.localUri : null };
      }
      return r;
    })
  );
  return checked;
}

export async function deleteDeviceRecording(id) {
  const list = await getLocalList();
  const rec = list.find(r => r.id === id);
  if (rec?.localUri) {
    await FileSystem.deleteAsync(rec.localUri, { idempotent: true }).catch(() => {});
  }
  await setLocalList(list.filter(r => r.id !== id));
}

// ─── Shared ────────────────────────────────────────────────────────────────────

export async function openDownloadedRecording(uri) {
  const u = String(uri || '').trim();
  if (!u) return false;
  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(u);
    await Linking.openURL(contentUri);
    return true;
  }
  await Linking.openURL(u);
  return true;
}
