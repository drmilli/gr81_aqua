import * as SecureStore from 'expo-secure-store';
import { setProfile as setSessionProfile } from './session';

const KEY_PROFILES = 'gr81aqua_profiles_v1';
const KEY_ACTIVE = 'gr81aqua_active_profile_v1';

export async function getProfiles() {
  try {
    const raw = await SecureStore.getItemAsync(KEY_PROFILES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(list) {
  try {
    await SecureStore.setItemAsync(KEY_PROFILES, JSON.stringify(list || []));
    return true;
  } catch {
    return false;
  }
}

export async function getActiveProfileId() {
  try {
    return await SecureStore.getItemAsync(KEY_ACTIVE);
  } catch {
    return null;
  }
}

export async function setActiveProfileId(id) {
  try {
    await SecureStore.setItemAsync(KEY_ACTIVE, id || '');
    return true;
  } catch {
    return false;
  }
}

export async function upsertProfile(profile) {
  const list = await getProfiles();
  const idx = list.findIndex(p => p.id === profile.id);
  if (idx >= 0) list[idx] = profile; else list.push(profile);
  await saveProfiles(list);
  return profile;
}

export async function removeProfile(id) {
  const list = await getProfiles();
  const next = list.filter(p => p.id !== id);
  await saveProfiles(next);
  const active = await getActiveProfileId();
  if (active === id) {
    if (next.length) {
      await applyProfile(next[0].id);
    } else {
      await setActiveProfileId('');
      await setSessionProfile(null);
    }
  }
}

export async function applyProfile(id) {
  const list = await getProfiles();
  const found = list.find(p => p.id === id);
  if (!found) return false;
  await setActiveProfileId(id);
  const provider = found.provider || (found.type ? found : null);
  if (provider) await setSessionProfile(provider);
  return true;
}
