function getAsyncStorage() {
  try {
    const mod = require('@react-native-async-storage/async-storage');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

const SERVICE = 'erp.session';
const STORAGE_KEY = 'secure:erp:sid';

function getKeychain() {
  try {
    return require('react-native-keychain');
  } catch {
    return null;
  }
}

export async function storeSessionSidCookie(cookie: string | null | undefined): Promise<boolean> {
  const value = String(cookie || '').trim();
  if (!value) return false;
  const Keychain = getKeychain();
  try {
    if (Keychain) {
      await Keychain.setGenericPassword('sid', value, {
        service: SERVICE,
        accessible: Keychain?.ACCESSIBLE?.ALWAYS_THIS_DEVICE_ONLY,
      });
      return true;
    }
  } catch {}
  try {
    const AS = getAsyncStorage();
    if (AS?.setItem) await AS.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export async function getSessionSidCookie(): Promise<string | null> {
  const Keychain = getKeychain();
  try {
    if (Keychain) {
      const creds = await Keychain.getGenericPassword({ service: SERVICE });
      if (creds && creds.password) return creds.password;
    }
  } catch {}
  try {
    const AS = getAsyncStorage();
    const v = AS?.getItem ? await AS.getItem(STORAGE_KEY) : null;
    return v || null;
  } catch {
    return null;
  }
}

export async function clearSessionSidCookie(): Promise<void> {
  const Keychain = getKeychain();
  try {
    if (Keychain) {
      await Keychain.resetGenericPassword({ service: SERVICE });
      return;
    }
  } catch {}
  try { const AS = getAsyncStorage(); if (AS?.removeItem) await AS.removeItem(STORAGE_KEY); } catch {}
}
