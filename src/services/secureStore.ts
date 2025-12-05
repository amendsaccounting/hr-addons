import AsyncStorage from '@react-native-async-storage/async-storage';

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
    await AsyncStorage.setItem(STORAGE_KEY, value);
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
    const v = await AsyncStorage.getItem(STORAGE_KEY);
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
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
}

