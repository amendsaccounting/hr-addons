import axios from 'axios';
import Config from 'react-native-config';
import { getEmployeeByEmail, getEmployeeIdByEmail } from './erpApi';

function pickEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = (Config as any)?.[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '';
}

function getMethodBase(): string {
  const method = pickEnv('ERP_URL_METHOD', 'ERP_METHOD_URL');
  if (method) return method.replace(/\/$/, '');
  const resource = pickEnv('ERP_URL_RESOURCE', 'ERP_URL');
  if (resource) return resource.replace(/\/api\/resource$/i, '/api/method').replace(/\/$/, '');
  return '';
}

export type PasswordLoginResult = {
  ok: boolean;
  cookie?: string | null;
  message?: string | null;
  error?: string | null;
  fullName?: string | null;
  userImage?: string | null;
  userId?: string | null;
  employeeId?: string | null;
  employee?: any | null;
};

function extractSidCookie(setCookieHeader?: string | string[] | null): string | null {
  if (!setCookieHeader) return null;
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const c of list) {
    const m = /(?:^|;\s*)sid=([^;]+)/i.exec(String(c));
    if (m && m[1]) return `sid=${m[1]}`;
  }
  return null;
}

function extractCookieValue(setCookieHeader: string | string[] | null | undefined, name: string): string | null {
  if (!setCookieHeader) return null;
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  // Support either multiple Set-Cookie headers or a single header string with cookies comma-joined.
  // Allow both semicolon and comma as boundaries, but stop at semicolon to avoid Expires commas.
  const re = new RegExp(`(?:^|[;,]\\s*)${name}=([^;]+)`, 'i');
  for (const c of list) {
    const m = re.exec(String(c));
    if (m && m[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

// Performs username/email + password login against Frappe/ERPNext
// Endpoint: POST {methodBase}/login with x-www-form-urlencoded body: usr=..., pwd=...
export async function loginWithPassword(usr: string, pwd: string): Promise<PasswordLoginResult> {
  const methodBase = getMethodBase();
  if (!methodBase) return { ok: false, error: 'ERP method URL not configured' };
  const url = `${methodBase}/login`;

  try {
    const params = new URLSearchParams();
    params.append('usr', String(usr || '').trim());
    params.append('pwd', String(pwd || ''));

    console.log('[auth] loginWithPassword → request', { url, usr: String(usr || '').trim(), hasPwd: !!pwd });
    const res = await axios.post(url, params.toString(), {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
      },
      // Some Frappe setups require no-cache for login flow
      transitional: { silentJSONParsing: true },
    });
    console.log('[auth] loginWithPassword → status', res.status);
    const setCookie = (res.headers as any)?.['set-cookie'] || (res.headers as any)?.['Set-Cookie'] || null;
    try { console.log('[auth] loginWithPassword → headers.set-cookie', setCookie); } catch {}
    try { console.log('[auth] loginWithPassword → data', res.data); } catch {}
    const cookie = extractSidCookie(setCookie);
    const fullName = extractCookieValue(setCookie, 'full_name') || (res?.data?.full_name ? String(res.data.full_name) : null);
    const userImage = extractCookieValue(setCookie, 'user_image');
    let userId = extractCookieValue(setCookie, 'user_id');
    // Fallback: if not present, use provided usr when it looks like an email
    if (!userId && /.+@.+\..+/.test(String(usr || ''))) userId = String(usr).trim();
    const message = (res?.data?.message ?? res?.data?.full_name ?? res?.data) as any;
    // Success if we have a cookie or a positive message
    const ok = !!cookie || /logged\s*in/i.test(String(message || '')) || res.status === 200;
    const result: PasswordLoginResult = { ok, cookie: cookie || null, message: message ? String(message) : null, error: ok ? null : 'Login failed', fullName: fullName || null, userImage: userImage || null, userId: userId || null };
    // Resolve employeeId using email if available
    try {
      const email = result.userId || String(usr || '').trim();
      if (email) {
        let empId = await getEmployeeIdByEmail(email);
        let emp: any = null;
        if (!empId) {
          emp = await getEmployeeByEmail(email).catch(() => null);
          empId = emp?.name ? String(emp.name) : null;
        } else {
          emp = await getEmployeeByEmail(email).catch(() => null);
        }
        if (empId) result.employeeId = empId;
        if (emp) result.employee = emp;
      }
    } catch (e) {
      try { console.log('[auth] loginWithPassword employee resolve failed', e); } catch {}
    }
    console.log('[auth] loginWithPassword → result', result);
    return result;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg = err?.response?.data?.message || err?.message || 'Login failed';
    console.log('[auth] loginWithPassword → error', { status, data, msg });
    return { ok: false, error: typeof msg === 'string' ? msg : 'Login failed', cookie: null, message: null };
  }
}

export async function logoutSession(): Promise<boolean> {
  const methodBase = getMethodBase();
  if (!methodBase) return false;
  try {
    await axios.post(`${methodBase}/logout`, undefined, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

export function isPasswordAuthConfigured(): boolean {
  return !!getMethodBase();
}
