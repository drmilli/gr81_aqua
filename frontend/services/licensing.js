import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

const KEY_DEVICE_ID = 'gr81aqua_device_id_v1';

function generateId() {
  const a = Math.random().toString(36).slice(2);
  const b = Math.random().toString(36).slice(2);
  return `sp8k_${Date.now().toString(36)}_${a}${b}`;
}

export async function getDeviceId() {
  try {
    const existing = await SecureStore.getItemAsync(KEY_DEVICE_ID);
    if (existing) return existing;
    const id = generateId();
    await SecureStore.setItemAsync(KEY_DEVICE_ID, id);
    return id;
  } catch {
    return generateId();
  }
}

export async function getLicenseStatus({ platform } = {}) {
  const deviceId = await getDeviceId();
  const res = await api.get('/licensing/status', {
    headers: {
      'x-device-id': deviceId,
      ...(platform ? { 'x-platform': platform } : {}),
    },
  });
  return res.data;
}

export async function createCheckout({ plan, platform } = {}) {
  const deviceId = await getDeviceId();
  const res = await api.post(
    '/licensing/checkout',
    { plan, deviceId, platform },
    { headers: { 'x-device-id': deviceId, ...(platform ? { 'x-platform': platform } : {}) } }
  );
  return res.data;
}

