import Config from 'react-native-config';
import { toErpLocalTimestamp } from '../utils/date';
import { getSessionSidCookie } from './secureStore';

type LogType = 'IN' | 'OUT';

export type AttendanceCheckin = {
  name: string;
  employee: string;
  log_type: LogType;
  time: string;
  location?: string;
};

export type AttendanceState = {
  isClockedIn: boolean;
  lastLog?: AttendanceCheckin | null;
};

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

async function getHeaders(): Promise<Record<string, string>> {
  if (!BASE_URL) throw new Error('ERP URL not configured');
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY && API_SECRET) {
    base['Authorization'] = `token ${API_KEY}:${API_SECRET}`;
    try { console.log('[attendance] auth using API token'); } catch {}
    return base;
  }
  // Fallback to session cookie if available
  const sid = await getSessionSidCookie();
  if (sid) {
    base['Cookie'] = sid;
    try { console.log('[attendance] auth using session cookie', sid ? 'present' : 'missing'); } catch {}
    return base;
  }
  throw new Error('No ERP auth configured (missing API token and session)');
}

function nowAsErpTimestamp(d = new Date()): string {
  return toErpLocalTimestamp(new Date(d.getTime() - d.getMilliseconds()));
}

export async function listCheckins(employee: string, limit: number = 50): Promise<AttendanceCheckin[]> {
  const headers = await getHeaders();
  const filters = encodeURIComponent(JSON.stringify([["employee", "=", employee]]));
  const fields = encodeURIComponent(JSON.stringify(["name","employee","log_type","time","location"]));
  const order_by = encodeURIComponent('time desc');
  const url = `${BASE_URL}/${encodeURIComponent('Employee Checkin')}?filters=${filters}&fields=${fields}&order_by=${order_by}&limit_page_length=${limit}`;

  const res = await fetch(url, { headers, credentials: 'include' as any });
  const json = await res.json().catch(() => ({} as any));
  const data = (json as any)?.data;
  if (!Array.isArray(data)) return [];
  return data as AttendanceCheckin[];
}

export async function getAttendanceState(employee: string): Promise<AttendanceState> {
  const rows = await listCheckins(employee, 1);
  const last = rows[0] || null;
  return {
    isClockedIn: (last?.log_type?.toUpperCase?.() as LogType) === 'IN',
    lastLog: last ?? null,
  };
}

export async function clockIn(params: { employee: string; time?: string; location?: string; deviceId?: string; latitude?: number; longitude?: number }): Promise<AttendanceCheckin | true> {
  const headers = await getHeaders();
  const url = `${BASE_URL}/${encodeURIComponent('Employee Checkin')}`;
  const body: any = {
    employee: params.employee,
    log_type: 'IN' as LogType,
    time: params.time || nowAsErpTimestamp(),
    device_id: params.deviceId || 'MobileApp',
    location: params.location || '',
  };
  if (typeof params.latitude === 'number') body.latitude = params.latitude;
  if (typeof params.longitude === 'number') body.longitude = params.longitude;
  try { console.log('[attendance] clockIn → request', { url, body }); } catch {}
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' as any });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  try { console.log('[attendance] clockIn → status', res.status, 'response', json || text); } catch {}
  if (res.ok) return (json as any)?.data ?? true;
  const msg = (json?.exception || json?.message || text || 'Clock In failed');
  throw new Error(typeof msg === 'string' ? msg : 'Clock In failed');
}

export async function clockOut(params: { employee: string; time?: string; location?: string; deviceId?: string; latitude?: number; longitude?: number }): Promise<AttendanceCheckin | true> {
  const headers = await getHeaders();
  const url = `${BASE_URL}/${encodeURIComponent('Employee Checkin')}`;
  const body: any = {
    employee: params.employee,
    log_type: 'OUT' as LogType,
    time: params.time || nowAsErpTimestamp(),
    device_id: params.deviceId || 'MobileApp',
    location: params.location || '',
  };
  if (typeof params.latitude === 'number') body.latitude = params.latitude;
  if (typeof params.longitude === 'number') body.longitude = params.longitude;
  try { console.log('[attendance] clockOut → request', { url, body }); } catch {}
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' as any });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  try { console.log('[attendance] clockOut → status', res.status, 'response', json || text); } catch {}
  if (res.ok) return (json as any)?.data ?? true;
  const msg = (json?.exception || json?.message || text || 'Clock Out failed');
  throw new Error(typeof msg === 'string' ? msg : 'Clock Out failed');
}

export async function toggleClock(params: { employee: string; location?: string; deviceId?: string; time?: string }): Promise<{ action: 'IN' | 'OUT'; result: AttendanceCheckin | true; } | null> {
  const state = await getAttendanceState(params.employee);
  if (state.isClockedIn) {
    const result = await clockOut(params);
    return { action: 'OUT', result };
  } else {
    const result = await clockIn(params);
    return { action: 'IN', result };
  }
}
