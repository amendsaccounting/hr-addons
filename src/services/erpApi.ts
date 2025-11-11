import Config from 'react-native-config';

function pickEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = (Config as any)?.[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '';
}

const BASE_URL = (pickEnv('ERP_URL_RESOURCE', 'ERP_URL') || '').replace(/\/$/, '');
const API_KEY = pickEnv('ERP_APIKEY', 'ERP_API_KEY');
const API_SECRET = pickEnv('ERP_SECRET', 'ERP_API_SECRET');

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
};

// Check if a user exists by email in ERPNext
// Tries direct GET /User/<email> first (name equals email), then falls back to filtered queries
export async function getUserByEmail(email: string): Promise<any | null> {
  const e = String(email || '').trim();
  if (!e) return null;

  const base = BASE_URL;
  if (!base || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }

  // 1) Direct GET by ID: /User/<email>
  try {
    const byId = `${base}/User/${encodeURIComponent(e)}`;
    const res = await fetch(byId, { headers });
    if (res.ok) {
      const json = await res.json();
      return json?.data ?? json ?? null;
    }
  } catch {}

  // Helper for list queries
  const queryOnce = async (field: string) => {
    const filters = encodeURIComponent(JSON.stringify([[field, '=', e]]));
    const url = `${base}/User?filters=${filters}&limit_page_length=1`;
    const r = await fetch(url, { headers });
    const j = await r.json().catch(() => ({} as any));
    const list = j?.data;
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  };
  try { const byName = await queryOnce('name'); if (byName) return byName; } catch (err) { console.warn('ERP byName error', err); }
  try { const byEmail = await queryOnce('email'); if (byEmail) return byEmail; } catch (err) { console.warn('ERP byEmail error', err); }

  return null;
}

// Update an existing User by email (name)
export async function updateUser(email: string, updatedFields: Record<string, any>): Promise<any | null> {
  const e = String(email || '').trim();
  if (!e) return null;

  const base = BASE_URL;
  if (!base || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }

  const url = `${base}/User/${encodeURIComponent(e)}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedFields),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return (json as any)?.data ?? json ?? true;
    console.warn('ERP updateUser error', json);
    return null;
  } catch (err) {
    console.warn('ERP updateUser exception', err);
    return null;
  }
}
