// Provider abstraction: selects adapter based on saved profile (type) and exposes common functions
import { getProfile } from '../session';
import * as xtream from './xtream';
import * as m3u from './m3u';

const getAdapter = async () => {
  const profile = await getProfile();
  if (!profile || (!profile.type)) throw new Error('No active playlist selected');
  const type = profile.type || 'm3u';
  switch (type) {
    case 'xtream':
      return xtream;
    case 'm3u':
    default:
      return m3u;
  }
};

export async function login(credentials) {
  // If credentials specify a type, pick adapter accordingly (used pre-save on Login)
  if (credentials?.type === 'xtream') return xtream.login(credentials);
  if (credentials?.type === 'm3u') return m3u.login(credentials);
  const adapter = await getAdapter();
  return adapter.login?.(credentials);
}

export async function fetchLiveCategories() {
  const adapter = await getAdapter();
  return adapter.fetchLiveCategories?.() || [];
}

export async function fetchLiveChannels(params) {
  const adapter = await getAdapter();
  return adapter.fetchLiveChannels?.(params) || [];
}

export async function fetchVodCategories() {
  const adapter = await getAdapter();
  return adapter.fetchVodCategories?.() || [];
}

export async function fetchVodItems(params) {
  const adapter = await getAdapter();
  return adapter.fetchVodItems?.(params) || [];
}

export async function fetchSeriesCategories() {
  const adapter = await getAdapter();
  return adapter.fetchSeriesCategories?.() || [];
}

export async function fetchSeriesItems(params) {
  const adapter = await getAdapter();
  return adapter.fetchSeriesItems?.(params) || [];
}

export async function fetchEPG(params) {
  const adapter = await getAdapter();
  return adapter.fetchEPG?.(params) || [];
}

export async function getStreamUrl(params) {
  const adapter = await getAdapter();
  return adapter.getStreamUrl?.(params) || null;
}

export async function fetchVodInfo(vodId) {
  const adapter = await getAdapter();
  return adapter.fetchVodInfo?.(vodId) || null;
}

export async function getAccountInfo() {
  const adapter = await getAdapter();
  return adapter.getAccountInfo?.() || null;
}
