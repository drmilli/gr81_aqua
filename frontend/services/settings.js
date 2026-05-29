import * as SecureStore from 'expo-secure-store';

const KEY_SETTINGS = 'gr81aqua_settings_v1';

const DEFAULTS = {
  subtitles: true,
  backgroundPlay: false,
  audioLang: 'English',
  uiLang: 'English',
  quality: 'Auto',
};

export async function getSettings() {
  try {
    const raw = await SecureStore.getItemAsync(KEY_SETTINGS);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(settings) {
  try {
    await SecureStore.setItemAsync(KEY_SETTINGS, JSON.stringify(settings || DEFAULTS));
    return true;
  } catch {
    return false;
  }
}
