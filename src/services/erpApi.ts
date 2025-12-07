import Config from 'react-native-config';

function pickEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = (Config as any)?.[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '';
}

const BASE_URL = (pickEnv('ERP_URL_RESOURCE', 'ERP_URL') || '').replace(/\/$/, '');
const METHOD_URL = (pickEnv('ERP_URL_METHOD', 'ERP_METHOD_URL') || '').replace(/\/$/, '');
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
    console.log("json=====>",json);
    if (res.ok) return (json as any)?.data ?? json ?? true;
    console.warn('ERP updateUser error', json);
    return null;
  } catch (err) {
    console.warn('ERP updateUser exception', err);
    return null;
  }
}

// Create a new User
export async function createUser(userData: Record<string, any>): Promise<any | null> {
  if (!BASE_URL || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }
  const url = `${BASE_URL}/User`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return (json as any)?.data ?? json ?? true;
    console.warn('ERP createUser error', json);
    return null;
  } catch (err) {
    console.warn('ERP createUser exception', err);
    return null;
  }
}

// Create a new Employee
export async function createEmployee(employeeData: Record<string, any>): Promise<any | null> {
  if (!BASE_URL || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }
  const url = `${BASE_URL}/Employee`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(employeeData),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return (json as any)?.data ?? json ?? true;
    console.warn('ERP createEmployee error', json);
    return null;
  } catch (err) {
    console.warn('ERP createEmployee exception', err);
    return null;
  }
}

// Lookup an Employee by email.
// Tries common fields that may store the email: user_id, personal_email, company_email
export async function getEmployeeByEmail(email: string): Promise<any | null> {
  const e = String(email || '').trim();
  if (!e) return null;

  const base = BASE_URL;
  if (!base || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }

  const queryOnce = async (field: string) => {
    const filters = encodeURIComponent(JSON.stringify([[field, '=', e]]));
    const fields = encodeURIComponent(JSON.stringify(['name','employee_name','user_id','company_email','personal_email']));
    const url = `${base}/Employee?filters=${filters}&fields=${fields}&limit_page_length=1`;
    const r = await fetch(url, { headers });
    const j = await r.json().catch(() => ({} as any));
    const list = j?.data;
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  };

  try { const byUserId = await queryOnce('user_id'); if (byUserId) return byUserId; } catch (err) { console.warn('ERP getEmployeeByEmail user_id error', err); }
  try { const byPersonal = await queryOnce('personal_email'); if (byPersonal) return byPersonal; } catch (err) { console.warn('ERP getEmployeeByEmail personal_email error', err); }
  try { const byCompany = await queryOnce('company_email'); if (byCompany) return byCompany; } catch (err) { console.warn('ERP getEmployeeByEmail company_email error', err); }

  return null;
}

// Returns canonical Employee ID (e.g., HR-EMP-00020) by email if found
export async function getEmployeeIdByEmail(email: string): Promise<string | null> {
  const doc = await getEmployeeByEmail(email).catch(() => null);
  if (doc?.name) return String(doc.name);
  // Try method API as a fallback
  const methodBase = METHOD_URL || BASE_URL.replace(/\/api\/resource$/i, '/api/method');
  if (!methodBase) return null;
  try {
    const url = `${methodBase}/frappe.client.get_list`;
    const body = new URLSearchParams();
    body.append('doctype', 'Employee');
    body.append('fields', JSON.stringify(['name']));
    body.append('filters', JSON.stringify([
      ['user_id', '=', email],
    ]));
    body.append('limit_page_length', '1');
    const res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    const json = await res.json().catch(() => ({} as any));
    const msg = (json as any)?.message;
    const row = Array.isArray(msg) && msg[0] ? msg[0] : null;
    if (row?.name) return String(row.name);
  } catch {}
  try {
    const url = `${methodBase}/frappe.client.get_value`;
    const body = new URLSearchParams();
    body.append('doctype', 'Employee');
    body.append('fieldname', 'name');
    body.append('filters', JSON.stringify({ company_email: email }));
    const res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    const json = await res.json().catch(() => ({} as any));
    const msg = (json as any)?.message;
    const val = msg?.name;
    if (val) return String(val);
  } catch {}
  return null;
}
