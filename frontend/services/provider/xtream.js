import { getProfile } from '../session';

function cleanBase(url) {
  return String(url || '').trim()
    .replace(/\/(player_api\.php|get\.php)(\?.*)?$/i, '')
    .replace(/\/+$/, '');
}

async function getCreds() {
  const p = await getProfile();
  if (!p?.baseUrl || !p?.username) throw new Error('No active playlist selected');
  return { baseUrl: cleanBase(p.baseUrl), username: p.username, password: p.password ?? '' };
}

const _cache = new Map();
const TTL = 5 * 60 * 1000;

async function callApi(action = '', extra = {}) {
  const { baseUrl, username, password } = await getCreds();
  let url = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  if (action) url += `&action=${encodeURIComponent(action)}`;
  for (const [k, v] of Object.entries(extra)) url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;

  const hit = _cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const res = await fetch(url, { headers: { 'User-Agent': 'okhttp/4.9.3' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  _cache.set(url, { ts: Date.now(), data });
  return data;
}

export async function login({ baseUrl, username, password }) {
  try {
    if (!baseUrl || !username || !password) return { ok: false, error: 'Missing credentials' };
    const base = cleanBase(baseUrl);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `Server error: HTTP ${res.status}` };
    const data = await res.json();
    const ui = data?.user_info;
    if (!ui) return { ok: false, error: 'Invalid response from server' };
    if (ui.auth === 0 || ui.auth === '0') return { ok: false, error: ui.message || 'Invalid credentials' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function fetchLiveCategories() {
  const raw = await callApi('get_live_categories');
  const cats = Array.isArray(raw) ? raw : Array.isArray(raw?.categories) ? raw.categories : [];
  return cats.map(c => ({ id: c.category_id, name: c.category_name }));
}

export async function fetchLiveChannels({ categoryId, limit = 800 } = {}) {
  const raw = await callApi('get_live_streams', categoryId ? { category_id: categoryId } : {});
  const streams = Array.isArray(raw) ? raw : Array.isArray(raw?.channels) ? raw.channels : [];
  const { baseUrl, username, password } = await getCreds();
  const list = streams
    .filter(s => !!s)
    .slice(0, limit)
    .map(s => {
      const id = s.stream_id ?? s.num ?? s.name;
      const numericId = String(id).replace(/[^0-9]/g, '') || String(id);
      return {
        id: String(id),
        name: s.name,
        logoUrl: s.stream_icon || null,
        category: s.category_id || 'Live',
        stream_id: s.stream_id,
        type: 'live',
        url: `${baseUrl}/live/${username}/${password}/${numericId}.ts`,
        hlsUrl: `${baseUrl}/live/${username}/${password}/${numericId}.m3u8`,
      };
    });
  return list;
}

export async function fetchVodCategories() {
  const raw = await callApi('get_vod_categories');
  const cats = Array.isArray(raw) ? raw : Array.isArray(raw?.categories) ? raw.categories : [];
  return cats.map(c => ({ id: c.category_id, name: c.category_name }));
}

export async function fetchVodItems({ categoryId, limit = 300 } = {}) {
  const raw = await callApi('get_vod_streams', categoryId ? { category_id: categoryId } : {});
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.movies) ? raw.movies : [];
  return list.slice(0, limit).map(v => ({
    id: String(v.stream_id ?? v.id ?? v.name),
    title: v.name,
    posterUrl: v.stream_icon || null,
    // list-level fields (present on some servers)
    genre: v.genre || v.category_name || '',
    year: v.year || '',
    rating: v.rating || '',
    plot: v.plot || v.description || '',
    duration: v.duration || '',
    category_id: v.category_id || '',
    stream_id: v.stream_id,
    container_extension: v.container_extension || 'mp4',
    type: 'vod',
  }));
}

export async function fetchSeriesCategories() {
  const raw = await callApi('get_series_categories');
  const cats = Array.isArray(raw) ? raw : Array.isArray(raw?.categories) ? raw.categories : [];
  return cats.map(c => ({ id: c.category_id, name: c.category_name }));
}

export async function fetchSeriesItems({ categoryId, limit = 300 } = {}) {
  const raw = await callApi('get_series', categoryId ? { category_id: categoryId } : {});
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.series) ? raw.series : [];
  return list.slice(0, limit).map(s => ({
    id: String(s.series_id ?? s.name),
    title: s.name,
    posterUrl: s.cover || null,
    genre: s.category_id || 'Series',
    series_id: s.series_id,
    type: 'series',
  }));
}

export async function fetchEPG() {
  return [];
}

export async function getStreamUrl({ id, type = 'live', extension = 'mp4' }) {
  const { baseUrl, username, password } = await getCreds();
  const numericId = String(id).replace(/[^0-9]/g, '') || String(id);
  const ext = String(extension).replace(/^\./, '');
  if (type === 'live') return `${baseUrl}/live/${username}/${password}/${numericId}.ts`;
  if (type === 'vod') return `${baseUrl}/movie/${username}/${password}/${numericId}.${ext}`;
  if (type === 'series') return `${baseUrl}/series/${username}/${password}/${numericId}.${ext}`;
  return null;
}

export async function fetchVodInfo(vodId) {
  if (!vodId) return null;
  const data = await callApi('get_vod_info', { vod_id: String(vodId) });
  return data?.info || null;
}

export async function getAccountInfo() {
  const data = await callApi();
  const ui = data?.user_info;
  const si = data?.server_info;
  if (!ui) return null;
  return {
    username: ui.username,
    status: ui.status,
    exp_date: ui.exp_date,
    active_cons: ui.active_cons,
    max_connections: ui.max_connections,
    server_url: si?.url || null,
  };
}
