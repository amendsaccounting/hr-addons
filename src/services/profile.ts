import axios from 'axios';
// Load react-native-config defensively to avoid native module null on startup
let Config: any = {};
try {
  const mod = require('react-native-config');
  Config = mod?.default ?? mod ?? {};
} catch {}

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

function headers() {
  return { Authorization: `token ${API_KEY}:${API_SECRET}` } as Record<string, string>;
}

export type EmployeeProfile = {
  name: string; // Employee ID (doctype name)
  full_name?: string | null;
  email?: string | null;
  company_email?: string | null;
  personal_email?: string | null;
  mobile_no?: string | null;
  department?: string | null;
  date_of_joining?: string | null;
  branch?: string | null;
  designation?: string | null;
  image?: string | null;
  company?: string | null;
  reports_to?: string | null;
  employment_type?: string | null;
  grade?: string | null;
};

export type ProfileView = {
  name?: string | null;
  email?: string | null;
  employeeId?: string | null;
  image?: string | null;
  phone?: string | null;
  department?: string | null;
  joinDate?: string | null;
  location?: string | null;
  role?: string | null;
  company?: string | null;
  reportsTo?: string | null;
  employmentType?: string | null;
  grade?: string | null;
};

function mapToView(e: EmployeeProfile): ProfileView {
  const host = (() => {
    const src = METHOD_URL || BASE_URL;
    // Strip trailing /api/resource or /api/method
    return src.replace(/\/api\/(resource|method)$/i, '');
  })();
  const img = (() => {
    const p = e.image || '';
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p; // already absolute
    if (p.startsWith('/')) return host + p;
    return host + '/' + p;
  })();
  return {
    name: e.full_name || e.name || null,
    email: e.company_email || e.personal_email || e.email || null,
    employeeId: e.name || null,
    image: img,
    phone: e.mobile_no || null,
    department: e.department || null,
    joinDate: e.date_of_joining || null,
    location: e.branch || null,
    role: e.designation || null,
    company: e.company || null,
    reportsTo: e.reports_to || null,
    employmentType: e.employment_type || null,
    grade: e.grade || null,
  };
}

// Fetch Employee document by ID (preferred) then fall back to list/method endpoints
export async function fetchEmployeeProfile(employeeId: string): Promise<ProfileView | null> {
  const id = String(employeeId || '').trim();
  if (!id) return null;

  // Attempt 1: GET resource by name: /Employee/<name>
  try {
    const res = await axios.get(`${BASE_URL}/Employee/${encodeURIComponent(id)}`, { headers: headers() });
    const doc = (res?.data?.data ?? res?.data) as EmployeeProfile | undefined;
    if (doc && typeof doc === 'object') return mapToView({ ...doc, name: doc.name || id });
  } catch (e) {
    // ignore; try list/method
  }

  // Attempt 2: GET list with filters
  try {
    const res = await axios.get(`${BASE_URL}/Employee`, {
      params: {
        filters: JSON.stringify([["name", "=", id]]),
        fields: JSON.stringify([
          'name','full_name','company_email','personal_email','mobile_no','department','date_of_joining','branch','designation','image','company','reports_to','employment_type','grade'
        ]),
        limit_page_length: 1,
      },
      headers: headers(),
    });
    const row = Array.isArray(res?.data?.data) ? res.data.data[0] as EmployeeProfile : undefined;
    if (row) return mapToView(row);
  } catch (e) {
    // ignore; try method
  }

  // Attempt 3: Method endpoint frappe.client.get
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res = await axios.get(`${METHOD_URL}/frappe.client.get`, {
      params: { doctype: 'Employee', name: id },
      headers: headers(),
    });
    const doc = (res?.data?.message ?? null) as EmployeeProfile | null;
    if (doc) return mapToView({ ...doc, name: doc.name || id });
  } catch (e) {
    // give up
  }
  return null;
}
