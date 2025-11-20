import Config from 'react-native-config';

// Minimal Lead shape based on ERPNext Lead doctype common fields
export type Lead = {
  name: string; // Docname (ID)
  lead_name?: string;
  company_name?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  status?: string; // e.g. 'Lead', 'Open', 'Replied', 'Qualified', 'Converted', 'Do Not Contact'
  source?: string; // e.g. 'Website', 'LinkedIn', etc.
  territory?: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  notes?: string;
  [key: string]: any;
};

type ListOptions = {
  search?: string; // matches lead_name/email_id/company_name (LIKE)
  status?: string;
  source?: string;
  fields?: string[];
  orderBy?: string; // e.g. 'creation desc'
  limit?: number;
  page?: number; // 1-based
};

function pickEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = (Config as any)?.[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '';
}

const BASE_URL = (pickEnv('ERP_URL_RESOURCE', 'ERP_URL') || '').replace(/\/$/, '');
// Derive method base: prefer replacing /api/resource with /api/method; else append appropriately
function getMethodBase(resourceBase: string): string {
  if (!resourceBase) return '/api/method';
  const replaced = resourceBase.replace(/\/api\/resource\/?$/i, '/api/method');
  if (replaced !== resourceBase) return replaced;
  // If base already ends with /api, append /method; else append /api/method
  if (/\/api\/?$/i.test(resourceBase)) return `${resourceBase.replace(/\/$/, '')}/method`;
  return `${resourceBase}/api/method`;
}
const METHOD_BASE = getMethodBase(BASE_URL);
const API_KEY = pickEnv('ERP_APIKEY', 'ERP_API_KEY');
const API_SECRET = pickEnv('ERP_SECRET', 'ERP_API_SECRET');
// Optional defaults for location
const DEFAULT_LOCATION_NAME = pickEnv('ERP_DEFAULT_LOCATION_NAME', 'ERP_LOCATION_DEFAULT_NAME');
const DEFAULT_LOCATION_LABEL = pickEnv('ERP_DEFAULT_LOCATION_LABEL', 'ERP_LOCATION_DEFAULT_LABEL');
const VALIDATE_LOCATION_LINK = isTruthy((Config as any)?.ERP_VALIDATE_LOCATION_LINK);

function getHeaders(): Record<string, string> {
  if (!BASE_URL || !API_KEY || !API_SECRET) {
    throw new Error('ERP credentials or URL are not configured. Check .env and rebuild the app.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `token ${API_KEY}:${API_SECRET}`,
  };
}

function enc(x: any) {
  return encodeURIComponent(typeof x === 'string' ? x : JSON.stringify(x));
}

function isTruthy(v: any): boolean {
  const s = String(v ?? '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on';
}

function debugLog(...args: any[]) {
  try {
    if (isTruthy((Config as any)?.ERP_DEBUG)) {
      // eslint-disable-next-line no-console
      console.log('[ERP]', ...args);
    }
  } catch {}
}

// Build simple AND filters array; for search we OR using frappe-style complex filters is cumbersome,
// so we try a pragmatic approach: prefer lead_name LIKE, else email_id LIKE if search contains '@'.
function buildFilters(opts: ListOptions) {
  const filters: any[] = [];
  if (opts.status) filters.push(['status', '=', opts.status]);
  if (opts.source) filters.push(['source', '=', opts.source]);
  if (opts.search) {
    const q = `%${opts.search}%`;
    if (opts.search.includes('@')) filters.push(['email_id', 'like', q]);
    else if (/\d/.test(opts.search)) filters.push(['mobile_no', 'like', q]);
    else filters.push(['company_name', 'like', q]);
  }
  return filters;
}

export async function listLeads(opts: ListOptions = {}): Promise<Lead[]> {
  const headers = getHeaders();
  const limit = Math.max(1, Math.min(200, opts.limit ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const start = (page - 1) * limit;
  const fields = opts.fields ?? ['name','lead_name','company_name','email_id','mobile_no','status','source','territory'];
  const orderBy = opts.orderBy ?? 'modified desc';
  const filters = buildFilters(opts);

  const url = `${BASE_URL}/Lead?filters=${enc(filters)}&fields=${enc(fields)}&order_by=${enc(orderBy)}&limit_page_length=${limit}&limit_start=${start}`;
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => ({} as any));
  const data = (json as any)?.data;
  if (!Array.isArray(data)) return [];
  return data as Lead[];
}

// Return total count for current filters (matches listLeads filters)
export async function countLeads(opts: ListOptions = {}): Promise<number> {
  const headers = getHeaders();
  const filters = buildFilters(opts);
  const url = `${METHOD_BASE}/frappe.client.get_count?doctype=${enc('Lead')}&filters=${enc(filters)}`;
  try {
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({} as any));
    const count = (json as any)?.message ?? (json as any)?.data ?? 0;
    const n = Number(count);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

// List doc names for a given doctype (used for Link fields pickers)
export async function listDocNames(doctype: string, limit = 200): Promise<string[]> {
  const headers = getHeaders();
  const dt = String(doctype || '').trim();
  if (!dt) return [];
  const url = `${BASE_URL}/${encodeURIComponent(dt)}?fields=${enc(['name'])}&limit_page_length=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    try { console.log('listDocNames HTTP', res.status, 'for', dt); } catch {}
  }
  const json = await res.json().catch(() => ({} as any));
  const data = (json as any)?.data;
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => r?.name).filter((n: any) => typeof n === 'string');
}

export type LocationOption = { name: string; label: string };

async function fetchDocTypeMeta(dt: string): Promise<any | null> {
  try {
    const headers = getHeaders();
    const url = `${BASE_URL}/DocType/${encodeURIComponent(dt)}`;
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({} as any));
    return (json as any)?.data ?? json ?? null;
  } catch {
    return null;
  }
}

async function resolveTitleField(dt: string): Promise<string> {
  const meta = await fetchDocTypeMeta(dt);
  if (meta && typeof meta.title_field === 'string' && meta.title_field) {
    return meta.title_field as string;
  }
  return 'title';
}

async function resolveByTitle(dt: string, label: string): Promise<{ name: string; label: string } | null> {
  const headers = getHeaders();
  const titleField = await resolveTitleField(dt);
  const fields = titleField && titleField !== 'title' ? ['name', titleField] : ['name', 'title'];
  // 1) exact match
  try {
    const filtersEq = [[titleField, '=', label]] as any;
    const urlEq = `${BASE_URL}/${encodeURIComponent(dt)}?filters=${enc(filtersEq)}&fields=${enc(fields)}&limit_page_length=1`;
    const rEq = await fetch(urlEq, { headers });
    const jjEq = await rEq.json().catch(() => ({} as any));
    const rec = Array.isArray(jjEq?.data) && jjEq.data[0];
    if (rec && rec.name) return { name: rec.name, label: (rec?.[titleField] || rec?.title || rec.name) };
  } catch {}
  // 2) LIKE search
  try {
    const filtersLike = [[titleField, 'like', `%${label}%`]] as any;
    const urlLike = `${BASE_URL}/${encodeURIComponent(dt)}?filters=${enc(filtersLike)}&fields=${enc(fields)}&limit_page_length=10`;
    const rLike = await fetch(urlLike, { headers });
    const jjLike = await rLike.json().catch(() => ({} as any));
    const list = Array.isArray(jjLike?.data) ? jjLike.data : [];
    if (list.length === 1) return { name: list[0].name, label: (list[0]?.[titleField] || list[0]?.title || list[0].name) };
    const ci = list.find((x: any) => String(x?.[titleField] || x?.title || '').toLowerCase() === label.toLowerCase());
    if (ci) return { name: ci.name, label: (ci?.[titleField] || ci?.title || ci.name) };
  } catch {}
  return null;
}

async function listDocNameAndTitle(doctype: string, limit = 200): Promise<LocationOption[]> {
  const headers = getHeaders();
  const dt = String(doctype || '').trim();
  if (!dt) return [];
  const titleField = await resolveTitleField(dt);
  const fields = titleField && titleField !== 'title' ? ['name', titleField] : ['name', 'title'];
  // Try resource API first
  try {
    const url = `${BASE_URL}/${encodeURIComponent(dt)}?fields=${enc(fields)}&limit_page_length=${limit}`;
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({} as any));
    const data = (json as any)?.data;
    if (Array.isArray(data) && data.length) {
      debugLog('list', dt, 'resource', 'rows:', data.length);
      return data
        .map((r: any) => ({ name: r?.name, label: (r?.[titleField] || r?.title || r?.name) }))
        .filter((x: any) => x && x.name);
    }
  } catch {}
  // Fallback to method API (some deployments restrict resource listing or custom doctypes)
  try {
    const url2 = `${METHOD_BASE}/frappe.client.get_list?doctype=${enc(dt)}&fields=${enc(fields)}&limit_page_length=${limit}`;
    const res2 = await fetch(url2, { headers });
    const json2 = await res2.json().catch(() => ({} as any));
    const data2 = (json2 as any)?.message ?? (json2 as any)?.data;
    if (Array.isArray(data2) && data2.length) {
      debugLog('list', dt, 'method', 'rows:', data2.length);
      return data2
        .map((r: any) => ({ name: r?.name, label: (r?.[titleField] || r?.title || r?.name) }))
        .filter((x: any) => x && x.name);
    }
  } catch {}
  return [];
}

function getLocationDoctype(): string {
  const dt = String((Config as any)?.ERP_LOCATION_DOCTYPE || '').trim();
  return dt || 'Building & Location';
}

export async function listLocations(limit = 200): Promise<LocationOption[]> {
  const primary = await resolveLocationDoctype();
  debugLog('listLocations primary doctype:', primary);
  let rows = await listDocNameAndTitle(primary, limit);
  if (!rows || rows.length === 0) {
    // Fallbacks for common doctypes used on various ERPNext setups
    const fallbacks = [
      primary === 'Building & Location' ? 'Location' : 'Building & Location',
      'Location',
    ].filter((v, i, a) => !!v && a.indexOf(v) === i);
    for (const dt of fallbacks) {
      try {
        debugLog('listLocations fallback doctype:', dt);
        const alt = await listDocNameAndTitle(dt, limit);
        if (alt && alt.length) { rows = alt; break; }
      } catch {}
    }
  }
  return rows || [];
}

// List Territories (non-group)
export async function listTerritories(limit = 200): Promise<LocationOption[]> {
  const headers = getHeaders();
  const fields = ['name', 'territory_name', 'is_group'];
  const filters = [['is_group', '=', 0]] as any;
  const url = `${BASE_URL}/Territory?fields=${enc(fields)}&filters=${enc(filters)}&limit_page_length=${limit}`;
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => ({} as any));
  const data = (json as any)?.data;
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({ name: r?.name, label: r?.territory_name || r?.name })).filter((x: any) => x && x.name);
}

// Fetch Select options for a Lead field (including custom-mapped fields)
export async function getLeadSelectOptions(field: 'service_type' | 'request_type' | 'lead_type' | 'source'): Promise<string[]> {
  const meta = await fetchDocTypeMeta('Lead');
  if (!meta || !Array.isArray((meta as any).fields)) return [];
  const enableCustom = isTruthy((Config as any)?.ERP_ENABLE_CUSTOM_LEAD_FIELDS);
  const map: Record<string, string> = {
    service_type: enableCustom ? FIELD_MAP.service_type : 'service_type',
    request_type: enableCustom ? FIELD_MAP.request_type : 'request_type',
    lead_type: enableCustom ? FIELD_MAP.lead_type : 'lead_type',
    source: 'source',
  } as any;
  const target = map[field] || field;
  const df = (meta as any).fields.find((f: any) => String(f?.fieldname) === String(target));
  if (!df) return [];
  const ftype = String(df?.fieldtype);
  if (ftype === 'Select') {
    const raw = String(df?.options || '').trim();
    if (!raw) return [];
    const parts = raw.split('\n').map((s: string) => s.trim()).filter(Boolean);
    return parts;
  }
  if (ftype === 'Link' && typeof df?.options === 'string' && df.options) {
    // For Link fields, list names from the target doctype
    try {
      const rows = await listDocNameAndTitle(df.options, 200);
      if (Array.isArray(rows) && rows.length) return rows.map((r) => r.name).filter(Boolean);
    } catch {}
    // Fallbacks for common doctypes
    const fallbacks = [df.options, 'Lead Source', 'Source'].filter((v, i, a) => !!v && a.indexOf(v) === i);
    for (const dt of fallbacks) {
      try {
        const rows = await listDocNameAndTitle(dt, 200);
        if (Array.isArray(rows) && rows.length) return rows.map((r) => r.name).filter(Boolean);
      } catch {}
    }
    return [];
  }
  return [];
}

let _resolvedLocationDoctype: string | null = null;
async function resolveLocationDoctype(): Promise<string> {
  if (_resolvedLocationDoctype) return _resolvedLocationDoctype;
  const envDt = getLocationDoctype();
  if (envDt && envDt !== 'Building & Location') {
    _resolvedLocationDoctype = envDt;
    debugLog('resolveLocationDoctype via env', envDt);
    return envDt;
  }
  // Try to auto-detect from DocType Lead custom field mapping
  try {
    const headers = getHeaders();
    const url = `${BASE_URL}/DocType/Lead`;
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({} as any));
    const doc = (json as any)?.data ?? json;
    const fields = Array.isArray((doc as any)?.fields) ? (doc as any).fields : [];
    const locFieldname = (FIELD_MAP as any)?.location;
    if (locFieldname && fields.length) {
      const f = fields.find((x: any) => x?.fieldname === locFieldname);
      if (f && f.fieldtype === 'Link' && typeof f.options === 'string' && f.options) {
        _resolvedLocationDoctype = f.options;
        debugLog('resolveLocationDoctype via Lead meta field', locFieldname, '->', f.options);
        return f.options;
      }
    }
  } catch {}
  _resolvedLocationDoctype = 'Building & Location';
  debugLog('resolveLocationDoctype defaulting to', _resolvedLocationDoctype);
  return _resolvedLocationDoctype;
}

// Fetch all leads by paging until exhaustion. Adds a safety cap to prevent runaway downloads.
export async function listAllLeads(opts: Omit<ListOptions, 'limit' | 'page'> & { pageSize?: number; hardCap?: number } = {}): Promise<Lead[]>
{
  const pageSize = Math.max(1, Math.min(500, opts.pageSize ?? 200));
  const hardCap = Math.max(pageSize, opts.hardCap ?? 5000); // prevent unbounded growth
  const out: Lead[] = [];
  let page = 1;
  // clone opts without page/limit
  const base: ListOptions = { ...opts } as any;
  delete (base as any).pageSize;
  delete (base as any).hardCap;

  while (out.length < hardCap) {
    const batch = await listLeads({ ...base, page, limit: pageSize });
    if (!batch || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < pageSize) break; // no more pages
    page += 1;
  }
  return out;
}

export async function getLead(name: string): Promise<Lead | null> {
  const headers = getHeaders();
  const id = String(name || '').trim();
  if (!id) return null;
  const url = `${BASE_URL}/Lead/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => null as any);
  if (!res.ok) return null;
  return ((json as any)?.data ?? json) as Lead;
}

export async function createLead(data: Partial<Lead>): Promise<Lead | null> {
  const headers = getHeaders();
  const url = `${BASE_URL}/Lead`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
  let json: any = null;
  try { json = await res.json(); } catch {}
  try { console.log('createLead response status:', res.status, 'ok:', res.ok); } catch {}
  if (!res.ok) {
    try { console.log('createLead error body:', json || (await res.text())); } catch {}
    const msg = (json && (json.message || json.exc || json.exception)) || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return ((json as any)?.data ?? json) as Lead;
}

// Input shape coming from Add Lead modal
export type ModalLeadInput = {
  // Lead Details
  date?: string; // YYYY-MM-DD
  lead_name?: string; // Name / Contact Person
  gender?: 'Male' | 'Female' | string;
  location?: string; // Building & Location
  source?: string;
  lead_owner?: string;
  status?: string; // Lead/Open/Replied/Qualified/Converted
  lead_type?: string; // custom
  request_type?: string; // custom
  service_type?: string; // custom
  // Contact
  mobile_no?: string; // Phone No
  email_id?: string;
  website?: string;
  whatsapp?: string;
  // Organisation
  company_name?: string; // Organisation Name
  territory?: string;
  notes?: string;
};

type AttachmentFile = { uri: string; name?: string; type?: string };

// Field mapping to ERPNext Lead doctype. Adjust keys on the right to your custom fieldnames.
const FIELD_MAP: Record<string, string> = {
  location: 'custom_building__location',
  date: 'custom_date',
  gender: 'custom_gender',
  lead_owner: 'custom_lead_owner',
  lead_type: 'custom_lead_type',
  request_type: 'custom_request_type',
  service_type: 'custom_service_type',
  whatsapp: 'custom_whatsapp',
  website: 'custom_website',
  notes: 'custom_notes',
};

const ENABLE_CUSTOM_LEAD_FIELDS = isTruthy((Config as any)?.ERP_ENABLE_CUSTOM_LEAD_FIELDS);

/**
 * Prepare an ERPNext Lead payload from modal input.
 * Safe to send directly to POST /Lead.
 */
export function prepareLeadPayload(input: ModalLeadInput): Partial<Lead> {
  const out: any = {};
  // Core/standard fields (keep to simple base fields to avoid child-table issues)
  if (input.lead_name) out.lead_name = String(input.lead_name).trim();
  if (input.company_name) out.company_name = String(input.company_name).trim();
  if (input.email_id) out.email_id = String(input.email_id).trim();
  if (input.mobile_no) out.mobile_no = String(input.mobile_no).trim();
  if (input.status) {
    const s = String(input.status).trim();
    // Sanitize status to server-allowed values; map common synonyms
    const allowed = new Set(['Lead','Open','Replied','Opportunity','Quotation','Lost Quotation','Interested','Converted','Do Not Contact']);
    const map: Record<string, string> = { 'Qualified': 'Interested' };
    const normalized = map[s] || s;
    if (allowed.has(normalized)) out.status = normalized;
    else out.status = 'Lead';
  }
  if (input.source) out.source = String(input.source).trim();
  if (input.territory) out.territory = String(input.territory).trim();
  // Always map mandatory custom fields when provided (location disabled)
  if ((input as any).date) out[FIELD_MAP.date] = String((input as any).date).trim();
  // Location is mandatory on your site; map when provided regardless of ENABLE_CUSTOM_LEAD_FIELDS
  if ((input as any).location && FIELD_MAP.location) {
    out[FIELD_MAP.location] = String((input as any).location).trim();
  }
  // Skip sending 'notes' directly — on some sites it's a child table; map via custom if enabled

  // Custom mappings
  if (ENABLE_CUSTOM_LEAD_FIELDS) {
    (['gender','lead_owner','lead_type','request_type','service_type','whatsapp','website','notes'] as const).forEach((k) => {
      const v = (input as any)[k];
      const target = FIELD_MAP[k];
      if (v != null && target) out[target] = v;
    });
  }

  return out as Partial<Lead>;
}

/**
 * Create an ERPNext Lead from the modal fields and optionally upload attachments.
 * Returns the created Lead (or null on failure).
 */
export async function createLeadFromModal(input: ModalLeadInput, attachments?: AttachmentFile[]): Promise<Lead | null> {
  const payload = prepareLeadPayload(input);
  try { console.log('createLeadFromModal payload:', payload); } catch {}
  // Validate Link fields proactively to avoid server-side link errors (location disabled)
  const linkMap: Record<string, string> = {
    source: 'Lead Source',
    territory: 'Territory',
  };
  // Helper to check link existence via GET /api/resource/Doctype/Name
  async function linkExists(doctype: string, name: string): Promise<boolean> {
    try {
      const headers = getHeaders();
      const url = `${BASE_URL}/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
      const res = await fetch(url, { headers });
      if (res.ok) return true;
      // If permissions block reading the target doctype, avoid false negatives here
      if (res.status === 401 || res.status === 403) return true;
      return false;
    } catch {
      return false;
    }
  }
  // Optional links: if invalid, drop them to allow lead creation
  for (const k of ['source', 'territory'] as const) {
    if ((payload as any)[k]) {
      const ok = await linkExists(linkMap[k], String((payload as any)[k]));
      if (!ok) {
        try { console.log(`Dropping invalid ${k}:`, (payload as any)[k]); } catch {}
        delete (payload as any)[k];
      }
    }
  }
  // Optional: validate/resolve Location link (disabled unless ERP_VALIDATE_LOCATION_LINK=true)
  if (VALIDATE_LOCATION_LINK) {
    try {
      const locField = FIELD_MAP.location;
      // Apply environment defaults if no location provided
      if (!((payload as any)[locField])) {
        if (DEFAULT_LOCATION_NAME) {
          (payload as any)[locField] = DEFAULT_LOCATION_NAME;
        } else if (DEFAULT_LOCATION_LABEL) {
          (payload as any)[locField] = DEFAULT_LOCATION_LABEL;
        }
      }
      const raw = (payload as any)[locField];
      if (raw) {
        const dt = await resolveLocationDoctype();
        const nameVal = String(raw);
        const ok = await linkExists(dt, nameVal);
        if (!ok) {
          // Try resolving within primary doctype
          let rec = await resolveByTitle(dt, nameVal);
          // If still not found, try common fallbacks (when we can't fetch meta/options)
          if (!rec) {
            const fallbacksRaw = pickEnv('ERP_LOCATION_FALLBACKS') || '';
            const fallbacks = (fallbacksRaw ? fallbacksRaw.split(',') : ['Building and Location', 'Location']).map(s => s.trim()).filter(Boolean);
            for (const alt of fallbacks) {
              rec = await resolveByTitle(alt, nameVal);
              if (rec) break;
            }
          }
          if (rec && rec.name) (payload as any)[locField] = rec.name;
          else throw new Error(`Selected location not found: ${nameVal}`);
        }
      }
    } catch (e) {
      // Surface a readable error to caller
      throw e instanceof Error ? e : new Error('Invalid Building & Location');
    }
  } else {
    // No validation: only apply env defaults if location is absent
    const locField = FIELD_MAP.location;
    if (!((payload as any)[locField])) {
      if (DEFAULT_LOCATION_NAME) (payload as any)[locField] = DEFAULT_LOCATION_NAME;
      else if (DEFAULT_LOCATION_LABEL) (payload as any)[locField] = DEFAULT_LOCATION_LABEL;
    }
  }
  let created: Lead | null = null;
  created = await createLead(payload);
  try { console.log('createLeadFromModal created:', created); } catch {}
  try {
    if ((created as any)?.name && attachments && attachments.length) {
      const results = await Promise.allSettled(attachments.map((f) => uploadLeadAttachment((created as any).name, f)));
      try { console.log('createLeadFromModal attachment results:', results.map(r => (r as any).status)); } catch {}
    }
  } catch {
    // Ignore attachment failures here; upstream can decide to notify or retry
  }
  return created;
}

export async function updateLead(name: string, updated: Partial<Lead>): Promise<Lead | null> {
  const headers = getHeaders();
  const id = String(name || '').trim();
  if (!id) return null;
  const url = `${BASE_URL}/Lead/${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(updated) });
  const json = await res.json().catch(() => null as any);
  if (!res.ok) return null;
  return ((json as any)?.data ?? json) as Lead;
}

export async function deleteLead(name: string): Promise<boolean> {
  const headers = getHeaders();
  const id = String(name || '').trim();
  if (!id) return false;
  const url = `${BASE_URL}/Lead/${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (res.ok) return true;
  return false;
}

export async function changeLeadStatus(name: string, status: string): Promise<Lead | null> {
  return updateLead(name, { status } as Partial<Lead>);
}

export function toListItem(l: Lead) {
  return {
    id: l.name,
    title: l.company_name || l.lead_name || l.email_id || l.name,
    subtitle: l.lead_name || l.email_id || '',
    status: l.status || '',
    value: l.source || '',
  };
}

export async function uploadLeadAttachment(leadName: string, file: { uri: string; name?: string; type?: string }): Promise<boolean> {
  const id = String(leadName || '').trim();
  if (!id) return false;
  // Authorization header from existing helpers
  const headers = getHeaders();
  const methodBase = BASE_URL.includes('/api/resource')
    ? BASE_URL.replace('/api/resource', '/api/method')
    : `${BASE_URL.replace(/\/$/, '')}/api/method`;
  const url = `${methodBase}/upload_file`;

  const form = new FormData();
  form.append('doctype', 'Lead');
  form.append('docname', id);
  form.append('is_private', '0');
  form.append('file', { uri: file.uri as any, name: (file.name || 'attachment'), type: (file.type || 'application/octet-stream') } as any);

  const h: any = { 'Authorization': headers['Authorization'] };
  const res = await fetch(url, { method: 'POST', headers: h, body: form as any });
  return res.ok;
}
