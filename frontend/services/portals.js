import Constants from 'expo-constants';
import { Platform } from 'react-native';

const cache = { list: null, fetchedAt: 0 };

function getApiBase() {
  const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
  let base = (extra.apiUrl || '').toString();
  base = base.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  if (!base) base = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
  if (Platform.OS === 'android' && /^https?:\/\/localhost(?::\d+)?$/i.test(base)) {
    base = base.replace(/\/\/localhost/i, '//10.0.2.2');
  }
  console.log('[portals] Using API base:', base, `(platform=${Platform.OS})`);
  return base;
}

async function fetchWithTimeout(url, options = {}) {
  const { timeout = 15000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchPortals({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.list && now - cache.fetchedAt < 60 * 1000) return cache.list;
  const api = getApiBase();
  if (!api) return [];
  try {
    const url = `${api.replace(/\/$/, '')}/portals`;
    console.log('[portals] Fetching from', url);
    const res = await fetchWithTimeout(url);
    console.log('[portals] Status:', res.status);
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    cache.list = arr;
    cache.fetchedAt = now;
    console.log('[portals] Received', arr.length, 'items');
    return arr;
  } catch (e) {
    console.log('[portals] Fetch error:', e?.message || e);
    return [];
  }
}

export async function getDefaultPortal() {
  const list = await fetchPortals();
  if (!list.length) return null;
  const primary = list.find(p => p.primary) || list[0];
  return primary;
}
