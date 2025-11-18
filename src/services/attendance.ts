import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';
import { getCurrentLocation } from '../utils/location';

type LogType = 'IN' | 'OUT';

type FetchCheckinsArgs = {
  employeeId: string;
  from?: Date;
  to?: Date;
  limit?: number;
  order?: 'asc' | 'desc';
};

export type EmployeeCheckinRow = {
  name?: string;
  employee: string;
  log_type: LogType | string;
  time: string;
  device_id?: string;
  location?: string;
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
const METHOD_URL = (pickEnv('ERP_URL_METHOD', 'ERP_METHOD_URL') || '').replace(/\/$/, '');

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
};

// Request foreground location permission (iOS + Android)
export async function requestLocationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return String(auth).toLowerCase() === 'granted';
    }
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as any,
        {
          title: 'Location Permission',
          message: 'Location permission is required to record attendance with your current location.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false;
  } catch {
    return false;
  }
}

function toErpTimestamp(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function parseErpDateTime(input: any): Date | null {
  if (!input || typeof input !== 'string') return null;
  // Common ERP format: YYYY-MM-DD HH:mm:ss (no timezone)
  const s = input.trim();
  // Try ISO-like by inserting 'T'
  let d = new Date(s.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d;
  // Manual parse as local time
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/);
  if (m) {
    const [_, yy, MM, dd, hh, mi, ss] = m;
    const y = Number(yy), mo = Number(MM), day = Number(dd), H = Number(hh), M = Number(mi), S = Number(ss);
    const local = new Date(y, (mo || 1) - 1, day || 1, H || 0, M || 0, S || 0, 0);
    if (!isNaN(local.getTime())) return local;
  }
  return null;
}

async function reverseGeocode(latNum: number, lonNum: number): Promise<string> {
  const lat = Number(latNum).toFixed(6);
  const lon = Number(lonNum).toFixed(6);
  const fallback = `${lat},${lon}`;
  // Try Google Geocoding API if configured
  try {
    const gKey = pickEnv('GOOGLE_MAPS_API_KEY', 'GOOGLE_API_KEY');
    if (gKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat + ',' + lon)}&key=${encodeURIComponent(gKey)}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      const addr = (json as any)?.results?.[0]?.formatted_address;
      if (addr && typeof addr === 'string') return addr;
    }
  } catch {}
  // Fallback to OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'hr_addons/1.0' } as any });
    const json = await res.json().catch(() => null);
    const addr = (json as any)?.display_name;
    if (addr && typeof addr === 'string') return addr;
  } catch {}
  return fallback;
}

export async function getLocationString(): Promise<string> {
  try {
    const { latitude, longitude } = await getCurrentLocation();
    return await reverseGeocode(latitude, longitude);
  } catch (err) {
    throw new Error('Location is required');
  }
}

// Create an Employee Checkin (IN/OUT)
export async function checkInOutDoctype(employeeId: string, logType: LogType): Promise<EmployeeCheckinRow | null> {
  if (!BASE_URL || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured.');
  }

  const doctype = encodeURIComponent('Employee Checkin');
  const url = `${BASE_URL}/${doctype}`;
  const time = toErpTimestamp(new Date());
  const location = await getLocationString();

  const payload: EmployeeCheckinRow = {
    employee: employeeId,
    log_type: logType,
    time,
    // Use the fetched human-readable address as device_id and location
    device_id: location,
    location,
  };

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (json as any)?.message || (json as any)?.exc || 'Failed to create checkin';
      throw new Error(typeof msg === 'string' ? msg : 'Failed to create checkin');
    }
    const data = (json as any)?.data ?? json;
    return data as EmployeeCheckinRow;
  } catch (err) {
    throw err as Error;
  }
}

// Fetch Employee Checkin rows for an employee within an optional time range
export async function fetchEmployeeCheckins(args: FetchCheckinsArgs): Promise<EmployeeCheckinRow[]> {
  const { employeeId, from, to, limit = 500, order = 'asc' } = args;

  if (!BASE_URL || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured.');
  }

  const filters: any[] = [["employee", "=", employeeId]];
  if (from) filters.push(["time", ">=", toErpTimestamp(from)]);
  if (to) filters.push(["time", "<", toErpTimestamp(to)]);

  const fields = ["name", "employee", "log_type", "time", "device_id", "location"];

  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    order_by: `time ${order}`,
    limit_page_length: String(Math.max(1, Math.min(2000, limit))),
  });

  const doctype = encodeURIComponent('Employee Checkin');
  const url = `${BASE_URL}/${doctype}?${params.toString()}`;

  // Attempt 1: Resource endpoint
  try {
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({} as any));
    const data = (json as any)?.data;
    if (Array.isArray(data)) return data as EmployeeCheckinRow[];
  } catch {}

  // Attempt 2: Method endpoint frappe.client.get_list
  try {
    if (!METHOD_URL) return [];
    const methodParams = new URLSearchParams({
      doctype: 'Employee Checkin',
      fields: JSON.stringify(["name", "employee", "log_type", "time", "device_id", "location"]),
      filters: JSON.stringify(filters),
      order_by: `time ${order}`,
      limit_page_length: String(Math.max(1, Math.min(2000, limit))),
    });
    const url2 = `${METHOD_URL}/frappe.client.get_list?${methodParams.toString()}`;
    const res2 = await fetch(url2, { headers });
    const json2 = await res2.json().catch(() => ({} as any));
    const data2 = (json2 as any)?.message;
    if (Array.isArray(data2)) return data2 as EmployeeCheckinRow[];
  } catch {}

  // Attempt 3: Method endpoint without filters (client-side filter)
  try {
    if (!METHOD_URL) return [];
    const methodParams = new URLSearchParams({
      doctype: 'Employee Checkin',
      fields: JSON.stringify(["name", "employee", "log_type", "time", "device_id", "location"]),
      order_by: `time ${order}`,
      limit_page_length: String(Math.max(1, Math.min(2000, limit))),
    });
    const url3 = `${METHOD_URL}/frappe.client.get_list?${methodParams.toString()}`;
    const res3 = await fetch(url3, { headers });
    const json3 = await res3.json().catch(() => ({} as any));
    const data3 = ((json3 as any)?.message || []) as any[];
    return (data3 as EmployeeCheckinRow[]).filter(r => String((r as any)?.employee) === employeeId);
  } catch {}

  return [];
}

export type AttendanceIOPair = {
  date: Date;
  inTime: Date | null;
  outTime: Date | null;
  locationIn?: string | null;
  locationOut?: string | null;
};

// Fetch paired IN/OUT history for an employee, optionally within a date range
export const fetchAttendanceHistory = async (args: {
  employeeId: string;
  from?: Date;
  to?: Date;
  daysBack?: number; // used if from/to not provided
  limit?: number;
  order?: 'asc' | 'desc';
}): Promise<AttendanceIOPair[]> => {
  const { employeeId, from, to, daysBack = 14, limit, order } = args || ({} as any);
  if (!employeeId || typeof employeeId !== 'string') return [];

  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const ymdKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;

  let effectiveFrom = from;
  let effectiveTo = to;
  if (!effectiveFrom || !effectiveTo) {
    const today = new Date();
    effectiveTo = effectiveTo || addDays(startOfDay(today), 1);
    effectiveFrom = effectiveFrom || addDays(startOfDay(today), -daysBack);
  }

  // Pull raw checkin rows
  let rows = await fetchEmployeeCheckins({ employeeId, from: effectiveFrom!, to: effectiveTo!, limit: limit ?? 2000, order: order ?? 'asc' });
  console.log("rowssss=====>",rows);
  
  // Fallback: if empty within range, fetch latest without date filter
  if (!rows || rows.length === 0) {
    rows = await fetchEmployeeCheckins({ employeeId, limit: limit ?? 300, order: order ?? 'asc' } as any);
  }

  const items = (rows || [])
    .map(r => {
      const dt = parseErpDateTime((r as any).time);
      return { ...r, dt } as any;
    })
    .filter(it => it.dt && !isNaN((it as any).dt.getTime?.() || NaN))
    .sort((a, b) => (a as any).dt.getTime() - (b as any).dt.getTime());

  const out: AttendanceIOPair[] = [];
  let openIn: { dayKey: string; dt: Date; location?: string | null } | null = null;

  for (const it of items as any[]) {
    const dk = ymdKey(it.dt);
    const loc = (it.location || it.device_id || null) as string | null;
    const type = String(it.log_type).trim().toUpperCase();
    if (type === 'IN') {
      if (openIn) {
        out.push({ date: startOfDay(openIn.dt), inTime: openIn.dt, outTime: null, locationIn: openIn.location || null, locationOut: null });
      }
      openIn = { dayKey: dk, dt: it.dt, location: loc };
    } else if (type === 'OUT') {
      if (openIn && openIn.dayKey === dk && it.dt.getTime() > openIn.dt.getTime()) {
        out.push({ date: startOfDay(it.dt), inTime: openIn.dt, outTime: it.dt, locationIn: openIn.location || null, locationOut: loc });
        openIn = null;
      } else {
        // Unpaired OUT (no preceding IN or day mismatch) — record as standalone
        out.push({ date: startOfDay(it.dt), inTime: null, outTime: it.dt, locationIn: null, locationOut: loc });
      }
    }
  }

  if (openIn) {
    out.push({ date: startOfDay(openIn.dt), inTime: openIn.dt, outTime: null, locationIn: openIn.location || null, locationOut: null });
    openIn = null;
  }

  return out;
};
