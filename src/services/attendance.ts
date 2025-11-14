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

  try {
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({} as any));
    const data = (json as any)?.data;
    if (Array.isArray(data)) return data as EmployeeCheckinRow[];
    return [];
  } catch {
    return [];
  }
}
