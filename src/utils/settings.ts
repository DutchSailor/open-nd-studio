import { load } from '@tauri-apps/plugin-store';

let storePromise: ReturnType<typeof load> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load('settings.json', { autoSave: true, defaults: {} });
  }
  return storePromise;
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const store = await getStore();
    const value = await store.get<T>(key);
    return value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const store = await getStore();
    await store.set(key, value);
  } catch {
    // silently ignore
  }
}
