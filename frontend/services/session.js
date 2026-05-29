import * as SecureStore from 'expo-secure-store';

const KEY_PROFILE = 'gr81aqua_profile_v1';
const KEY_LOGGED_OUT = 'gr81aqua_logged_out_v1';

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

export async function logout() {
  try {
    await SecureStore.setItemAsync(KEY_LOGGED_OUT, '1');
  } catch {}
  await clearProfile();
}
