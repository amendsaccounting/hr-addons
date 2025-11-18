import Config from 'react-native-config';

type LogType = 'IN' | 'OUT';

export type AttendanceCheckin = {
  name: string;
  employee: string;
  log_type: LogType;
  time: string; // ISO-like string (e.g., '2025-01-01 09:00:00')
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

function getHeaders(): Record<string, string> {
  if (!BASE_URL || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `token ${API_KEY}:${API_SECRET}`,
  };
}

function nowAsErpTimestamp(d = new Date()): string {
  // ERPNext typically accepts 'YYYY-MM-DD HH:mm:ss'
  return new Date(d.getTime() - d.getMilliseconds()) // drop ms
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

export async function listCheckins(employee: string, limit: number = 50): Promise<AttendanceCheckin[]> {
  const headers = getHeaders();
  const filters = encodeURIComponent(JSON.stringify([["employee", "=", employee]]));
  const fields = encodeURIComponent(JSON.stringify(["name","employee","log_type","time","location"]));
  const order_by = encodeURIComponent('time desc');
  const url = `${BASE_URL}/${encodeURIComponent('Employee Checkin')}?filters=${filters}&fields=${fields}&order_by=${order_by}&limit_page_length=${limit}`;

  const res = await fetch(url, { headers });
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

export async function clockIn(params: { employee: string; time?: string; location?: string; deviceId?: string }): Promise<AttendanceCheckin | true> {
  const headers = getHeaders();
  const url = `${BASE_URL}/${encodeURIComponent('Employee Checkin')}`;
  const body = {
    employee: params.employee,
    log_type: 'IN' as LogType,
    time: params.time || nowAsErpTimestamp(),
    device_id: params.deviceId || 'MobileApp',
    location: params.location || '',
  };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null as any);
  if (res.ok) return (json as any)?.data ?? true;
  throw new Error('Clock In failed');
}

export async function clockOut(params: { employee: string; time?: string; location?: string; deviceId?: string }): Promise<AttendanceCheckin | true> {
  const headers = getHeaders();
  const url = `${BASE_URL}/${encodeURIComponent('Employee Checkin')}`;
  const body = {
    employee: params.employee,
    log_type: 'OUT' as LogType,
    time: params.time || nowAsErpTimestamp(),
    device_id: params.deviceId || 'MobileApp',
    location: params.location || '',
  };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null as any);
  if (res.ok) return (json as any)?.data ?? true;
  throw new Error('Clock Out failed');
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

export function pairSessions(rows: AttendanceCheckin[]): Array<{
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  locationIn: string;
  locationOut: string;
}> {
  const items = rows
    .map(r => ({ ...r, dt: new Date(r.time) }))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());
  const out: any[] = [];
  let open: any | null = null;
  const fmt = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const hh = ((h % 12) || 12).toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${mm} ${ap}`;
  };

  for (const it of items) {
    const lt = String(it.log_type).toUpperCase();
    if (lt === 'IN') {
      if (open) {
        out.push({ id: `${open.name}-open`, date: open.dt.toLocaleDateString(), clockIn: fmt(open.dt), clockOut: '', locationIn: open.location || '', locationOut: '' });
      }
      open = it;
    } else if (lt === 'OUT') {
      if (open && it.dt.getTime() > open.dt.getTime()) {
        out.push({ id: `${open.name}-${it.name}`, date: it.dt.toLocaleDateString(), clockIn: fmt(open.dt), clockOut: fmt(it.dt), locationIn: open.location || '', locationOut: it.location || '' });
        open = null;
      } else {
        out.push({ id: `${it.name}`, date: it.dt.toLocaleDateString(), clockIn: '', clockOut: fmt(it.dt), locationIn: '', locationOut: it.location || '' });
      }
    }
  }
  if (open) {
    out.push({ id: `${open.name}-open`, date: open.dt.toLocaleDateString(), clockIn: fmt(open.dt), clockOut: '', locationIn: open.location || '', locationOut: '' });
  }
  return out.slice().reverse();
}
