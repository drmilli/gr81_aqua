import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

const KEY_PROFILE = 'gr81aqua_profile_v1';
const KEY_LOGGED_OUT = 'gr81aqua_logged_out_v1';
const KEY_TOKEN = 'gr81aqua_token_v1';

export async function setProfile(profile) {
  try {
    if (!profile) {
      await SecureStore.deleteItemAsync(KEY_PROFILE);
      return true;
    }
    await SecureStore.setItemAsync(KEY_PROFILE, JSON.stringify(profile));
    await SecureStore.deleteItemAsync(KEY_LOGGED_OUT);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getLoggedOut() {
  try {
    const v = await SecureStore.getItemAsync(KEY_LOGGED_OUT);
    return v === '1';
  } catch {
    return false;
  }
}

export async function getProfile() {
  try {
    const raw = await SecureStore.getItemAsync(KEY_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function clearProfile() {
  try {
    await SecureStore.deleteItemAsync(KEY_PROFILE);
  } catch {}
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(KEY_TOKEN);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(KEY_TOKEN, token);
    } else {
      await SecureStore.deleteItemAsync(KEY_TOKEN);
    }
  } catch {}
}

// Fetches the server-assigned provider for the logged-in user and saves it as the
// active session profile. Returns true if a provider was found and saved.
export async function applyServerProvider(token) {
  try {
    const authToken = token || (await getToken());
    if (!authToken) return false;
    const res = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const provider = res.data?.provider;
    if (!provider) return false;

    let profile = null;
    if (provider.xtreamUrl && provider.xtreamUsername) {
      profile = {
        type: 'xtream',
        baseUrl: provider.xtreamUrl,
        username: provider.xtreamUsername,
        password: provider.xtreamPassword || '',
      };
    } else if (provider.m3uUrl) {
      profile = { type: 'm3u', providerId: provider.m3uUrl };
    }

    if (!profile) return false;
    await setProfile(profile);
    return true;
  } catch {
    return false;
  }
}

export async function logout() {
  try {
    await SecureStore.setItemAsync(KEY_LOGGED_OUT, '1');
  } catch {}
  await clearProfile();
  await setToken(null);
}
