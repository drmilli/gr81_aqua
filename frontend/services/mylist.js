import * as SecureStore from 'expo-secure-store';

const KEY = 'gr81aqua_mylist_v1';

export async function getList() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveList(list) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(list || []));
  } catch {}
}

export async function has(itemId) {
  const list = await getList();
  return list.some(i => i === itemId);
}

export async function add(itemId) {
  const list = await getList();
  if (!list.includes(itemId)) {
    list.push(itemId);
    await saveList(list);
  }
  return list;
}

export async function remove(itemId) {
  const list = await getList();
  const next = list.filter(i => i !== itemId);
  await saveList(next);
  return next;
}

export async function toggle(itemId) {
  const list = await getList();
  const exists = list.includes(itemId);
  const next = exists ? list.filter(i => i !== itemId) : [...list, itemId];
  await saveList(next);
  return { list: next, inList: !exists };
}
