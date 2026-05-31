import { getProfile } from '../session';

function normalizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `http://${s}`;
}

async function getM3uUrl() {
  const profile = await getProfile();
  const url = normalizeUrl(profile?.providerId);
  if (!url) throw new Error('Invalid M3U URL');
  return url;
}

function parseM3U(text, { maxChannels = 3000 } = {}) {
  const lines = text.split(/\r?\n/);
  const channels = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#EXTM3U')) continue;
    if (line.startsWith('#EXTINF:')) {
      const info = line;
      const streamUrl = (lines[i + 1] || '').trim();
      const attrs = {};
      const attrRe = /(\w[\w-]*?)="([^"]*?)"/g;
      let m;
      while ((m = attrRe.exec(info)) !== null) attrs[m[1]] = m[2];
      const titleParts = info.split(',');
      const title = titleParts.length > 1 ? titleParts.slice(1).join(',').trim() : '';
      channels.push({
        id: attrs['tvg-id'] || streamUrl || title,
        name: attrs['tvg-name'] || title || 'Channel',
        logoUrl: attrs['tvg-logo'] || null,
        category: attrs['group-title'] || 'General',
        hlsUrl: streamUrl,
        url: streamUrl,
        type: 'live',
      });
      i++;
      if (channels.length >= maxChannels) break;
    }
  }
  return channels.filter(c => !!c.hlsUrl);
}

export async function login(credentials) {
  try {
    const url = credentials?.providerId ? normalizeUrl(credentials.providerId) : await getM3uUrl();
    if (!url) return { ok: false, error: 'Invalid M3U URL' };
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `Playlist HTTP ${res.status}` };
    const text = await res.text();
    if (!text || !/^#EXTM3U/m.test(text)) return { ok: false, error: 'Invalid M3U content' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

let cache = { url: '', fetchedAt: 0, channels: [] };

export function clearCache() { cache = { url: '', fetchedAt: 0, channels: [] }; }

async function loadChannels() {
  const url = await getM3uUrl();
  const now = Date.now();
  if (cache.url === url && now - cache.fetchedAt < 5 * 60 * 1000 && cache.channels.length) {
    return cache.channels;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download M3U (HTTP ${res.status})`);
  const text = await res.text();
  if (!text || !/^#EXTM3U/m.test(text)) throw new Error('Invalid M3U content');
  const parsed = parseM3U(text, { maxChannels: 3000 });
  if (!parsed.length) throw new Error('No channels found in M3U');
  cache = { url, fetchedAt: now, channels: parsed };
  return parsed;
}

export async function fetchLiveCategories() {
  const channels = await loadChannels();
  return [...new Set(channels.map(c => c.category || 'General'))].sort();
}

export async function fetchLiveChannels({ categoryId, limit } = {}) {
  const channels = await loadChannels();
  const filtered = (categoryId && categoryId !== 'All')
    ? channels.filter(c => (c.category || '').toLowerCase() === String(categoryId).toLowerCase())
    : channels;
  return limit ? filtered.slice(0, limit) : filtered;
}

export async function getStreamUrl({ id } = {}) {
  // Look up the channel in the cache by id and return its stream URL
  try {
    const channels = await loadChannels();
    const ch = channels.find(c => String(c.id) === String(id));
    return ch?.hlsUrl || null;
  } catch {
    return null;
  }
}

export async function fetchVodCategories() { return []; }
export async function fetchVodItems() { return []; }
export async function fetchSeriesCategories() { return []; }
export async function fetchSeriesItems() { return []; }
export async function fetchEPG() { return []; }
export async function fetchVodInfo() { return null; }
export async function fetchSeriesInfo() { return null; }
