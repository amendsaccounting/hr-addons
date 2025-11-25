import axios from 'axios';
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

function headers(): Record<string, string> {
  return { Authorization: `token ${API_KEY}:${API_SECRET}` };
}

// Helper: fetch DocField rows for a parent doctype via getdoctype (works when get_meta is unavailable)
async function fetchDocFieldsViaGetDoctype(parentDoctype: string): Promise<any[]> {
  if (!METHOD_URL) return [];
  try {
    const res = await axios.get(`${METHOD_URL}/frappe.desk.form.load.getdoctype`, {
      params: { doctype: parentDoctype },
      headers: headers(),
    });
    const msg = res?.data?.message as any;
    const docs = Array.isArray(msg?.docs) ? msg.docs : Array.isArray(msg) ? msg : [];
    const fields = docs.filter((d: any) => String(d?.doctype) === 'DocField');
    return fields;
  } catch (err: any) {
    const server = err?.response?.data;
    const s = typeof server === 'string' ? server : JSON.stringify(server || '');
    if (!s?.includes('PermissionError') && !s?.includes("has no attribute")) {
      try { console.warn('getdoctype fetch failed', server || err?.message); } catch {}
    }
    return [];
  }
}

// Minimal Lead type used across screens
export type Lead = {
  name: string;
  lead_name?: string;
  company_name?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  website?: string;
  status?: string;
  source?: string;
  territory?: string;
  custom_whatsapp?: string;
  custom_date?: string;
  custom_building__location?: string;
  custom_lead_type?: string;
  custom_request_type?: string;
  custom_service_type?: string;
  custom_notes?: string;
  [key: string]: any;
};

// Public API: Fetch a page of leads with optional search + status filter
export async function listLeads({
  search,
  status,
  limit = 50,
  offset = 0,
  fields,
}: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  fields?: string[];
}): Promise<Lead[]> {
  const f = new Array<any>();
  if (status && status !== 'All') f.push(['status', '=', status]);
  const fieldList = fields && fields.length > 0 ? fields : [
    'name',
    'lead_name',
    'company_name',
    'email_id',
    'mobile_no',
    'phone',
    'website',
    'status',
    'source',
    'territory',
    'creation',
    'modified',
    'custom_whatsapp',
    'custom_date',
    'custom_building__location',
    'custom_lead_type',
    'custom_request_type',
    'custom_service_type',
    'custom_notes',
  ];

  // Try resource endpoint first
  try {
    const params: any = {
      fields: JSON.stringify(fieldList),
      limit_page_length: limit,
      limit_start: offset,
      order_by: 'modified desc',
    };
    if (f.length > 0) params.filters = JSON.stringify(f);
    // Free text search: some sites accept simple 'txt' parameter or full-text; try conservative LIKE on lead_name
    if (search && search.trim().length > 0) {
      // Many Frappe sites support the "like" filter; without OR support in /resource, we apply only to lead_name
      const like = `%${search.trim()}%`;
      const withSearch = [...f, ['lead_name', 'like', like]];
      params.filters = JSON.stringify(withSearch);
    }
    const res = await axios.get(`${BASE_URL}/Lead`, { params, headers: headers() });
    return (res?.data?.data ?? []) as Lead[];
  } catch (err1: any) {
    const server = err1?.response?.data;
    try { console.warn('listLeads resource failed', server || err1?.message); } catch {}
  }

  // Fallback: method endpoint with or_filters for broader search across fields
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    // get_list is strict about which fields can be queried; use a safe subset
    const methodFields = [
      'name', 'lead_name', 'company_name', 'email_id', 'mobile_no', 'phone', 'website', 'status', 'source', 'territory', 'creation', 'modified',
    ];
    const params: any = {
      doctype: 'Lead',
      fields: JSON.stringify(methodFields),
      limit_page_length: limit,
      limit_start: offset,
      order_by: 'modified desc',
    };
    if (f.length > 0) params.filters = JSON.stringify(f);
    if (search && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      params.or_filters = JSON.stringify([
        ['lead_name', 'like', like],
        ['company_name', 'like', like],
        ['email_id', 'like', like],
        ['mobile_no', 'like', like],
        ['phone', 'like', like],
      ]);
    }
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, { params, headers: headers() });
    return (res?.data?.message ?? []) as Lead[];
  } catch (err2: any) {
    const server = err2?.response?.data;
    console.error('listLeads method failed', server || err2?.message);
    return [];
  }
}


// Fetch a single lead by name (ID)
export async function getLead(name: string): Promise<Lead | null> {
  const n = String(name || '').trim();
  if (!n) return null;
  // Resource first
  try {
    const res = await axios.get(`${BASE_URL}/Lead/${encodeURIComponent(n)}`, { headers: headers() });
    const row = (res?.data?.data ?? res?.data) as any;
    if (row && (row.name || row.lead_name)) return row as Lead;
  } catch (err1: any) {
    const server = err1?.response?.data;
    try { console.warn('getLead resource failed', server || err1?.message); } catch {}
  }
  // Fallback to method get_list with name filter
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype: 'Lead',
        fields: JSON.stringify(['*']),
        filters: JSON.stringify([['name', '=', n]]),
        limit_page_length: 1,
      },
      headers: headers(),
    });
    const list = res?.data?.message as any[];
    return Array.isArray(list) && list.length > 0 ? (list[0] as Lead) : null;
  } catch (err2: any) {
    const server = err2?.response?.data;
    console.error('getLead method failed', server || err2?.message);
    return null;
  }
}

// Generic helper to search link field options by doctype name (uses frappe.desk.search.search_link)
export async function searchDocNames(doctype: string, txt: string, limit: number = 10, extra?: { reference_doctype?: string; reference_fieldname?: string; filters?: Record<string, any> | Array<any> }): Promise<string[]> {
  const q = String(txt || '').trim();
  if (!METHOD_URL || !doctype) return [];
  try {
    const res = await axios.get(`${METHOD_URL}/frappe.desk.search.search_link`, {
      params: { doctype, txt: q, page_length: limit, reference_doctype: extra?.reference_doctype, reference_fieldname: extra?.reference_fieldname, filters: extra?.filters ? JSON.stringify(extra.filters) : undefined },
      headers: headers(),
    });
    const list = (res?.data?.message ?? []) as any[];
    if (Array.isArray(list)) {
      return list.map((it) => String(it?.value || it?.name || '')).filter(Boolean);
    }
  } catch (err1: any) {
    const server = err1?.response?.data;
    const s = typeof server === 'string' ? server : JSON.stringify(server || '');
    // Suppress common non-actionable errors like missing DocType
    if (!s?.includes('DoesNotExistError') && !s?.includes('DocType') && !s?.includes('PermissionError')) {
      try { console.warn('searchDocNames failed', doctype, server || err1?.message); } catch {}
    }
  }
  // Fallback: get_list LIKE name
  try {
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype,
        fields: JSON.stringify(['name']),
        filters: JSON.stringify(q ? [['name', 'like', `%${q}%`]] : []),
        limit_page_length: limit,
      },
      headers: headers(),
    });
    const rows = (res?.data?.message ?? []) as any[];
    return rows.map((r) => String(r?.name || '')).filter(Boolean);
  } catch (err2: any) {
    const server = err2?.response?.data;
    const s = typeof server === 'string' ? server : JSON.stringify(server || '');
    if (!s?.includes('DoesNotExistError') && !s?.includes('DocType') && !s?.includes('PermissionError')) {
      try { console.warn('searchDocNames fallback failed', doctype, server || err2?.message); } catch {}
    }
    return [];
  }
}

// Check if a document with exact name exists for a given doctype.
export async function existsDocName(doctype: string, name: string): Promise<boolean> {
  const n = String(name || '').trim();
  if (!doctype || !n) return false;
  // Try METHOD: get_value or get_list by name
  if (METHOD_URL) {
    try {
      const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
        params: {
          doctype,
          fields: JSON.stringify(['name']),
          filters: JSON.stringify([[ 'name', '=', n ]]),
          limit_page_length: 1,
        },
        headers: headers(),
      });
      const rows = (res?.data?.message ?? []) as any[];
      if (Array.isArray(rows) && rows.find(r => String(r?.name) === n)) return true;
    } catch {}
  }
  // Try RESOURCE: GET /resource/Doctype/<name>
  if (BASE_URL) {
    try {
      const res2 = await axios.get(`${BASE_URL}/${encodeURIComponent(doctype)}/${encodeURIComponent(n)}`, { headers: headers() });
      const row = res2?.data?.data ?? res2?.data;
      if (row && String((row as any)?.name) === n) return true;
    } catch {}
  }
  return false;
}

// Attempt to create a document with a reasonable title field so the given name becomes available.
export async function createDocNameIfPossible(doctype: string, name: string): Promise<string | null> {
  const n = String(name || "").trim();
  if (!doctype || !n) return null;
  let payload: any = { doctype };
  try {
    const fields = await fetchDocFieldsViaGetDoctype(doctype);
    const fieldnames = Array.isArray(fields) ? fields.map((f: any) => String(f?.fieldname || "")) : [];
    const preferred = ["location_name", "address_title", "title", "name"]; 
    const key = preferred.find((k) => fieldnames.includes(k)) || "name";
    payload[key] = n;
  } catch {
    payload["name"] = n;
  }
  if (METHOD_URL) {
    try {
      const res = await axios.post(`${METHOD_URL}/frappe.client.insert`, { doc: payload }, { headers: { ...headers(), "Content-Type": "application/json" } });
      const msg = res?.data?.message as any;
      const createdName = String(msg?.name || "").trim();
      if (createdName) return createdName;
    } catch {}
  }
  if (BASE_URL) {
    try {
      const body: any = { ...payload };
      delete body.doctype;
      const res2 = await axios.post(`${BASE_URL}/${encodeURIComponent(doctype)}`, body, { headers: { ...headers(), "Content-Type": "application/json" } });
      const data = res2?.data?.data ?? res2?.data;
      const createdName = String((data as any)?.name || "").trim();
      if (createdName) return createdName;
    } catch {}
  }
  return null;
}

// Fetch list of fieldnames for a given doctype (via get_meta). Returns empty array if not permitted.
export async function getDoctypeFieldnames(doctype: string): Promise<string[]> {
  if (!METHOD_URL || !doctype) return [];
  try {
    const fields = await fetchDocFieldsViaGetDoctype(doctype);
    return fields.map((f: any) => String(f?.fieldname || '')).filter(Boolean);
  } catch (err: any) {
    try { console.warn('getDoctypeFieldnames failed', doctype, err?.response?.data || err?.message); } catch {}
    return [];
  }
}

// Propose common filters for link doctypes such as disabled=0 or is_active=1 if such fields exist.
export async function buildCommonLinkFilters(doctype: string): Promise<Record<string, any> | undefined> {
  try {
    const names = await getDoctypeFieldnames(doctype);
    const set: Record<string, any> = {};
    if (names.includes('disabled')) set.disabled = 0;
    if (names.includes('is_active')) set.is_active = 1;
    // Common in tree doctypes like Territory: only leaf (non-group) nodes
    if (names.includes('is_group')) set.is_group = 0;
    return Object.keys(set).length ? set : undefined;
  } catch {
    return undefined;
  }
}

// Convenience: fetch Building/Location names from common doctypes.
// Tries 'Building & Location' first (custom), then 'Location', then 'Address'.
export async function listBuildingLocations(search: string = '', limit: number = 20): Promise<string[]> {
  const tryOnce = async (dt: string) => {
    try { return await searchDocNames(dt, search, limit); } catch { return []; }
  };
  // Allow override via environment variable if your site uses a custom doctype name
  const CUSTOM_DT = (pickEnv('ERP_LOCATION_DOCTYPE', 'ERP_LOCATION_DT') || '').trim();
  let names: string[] = [];
  if (CUSTOM_DT) {
    names = await tryOnce(CUSTOM_DT);
  }
  if (names.length === 0) names = await tryOnce('Building & Location');
  if (names.length === 0) names = await tryOnce('Location');
  if (names.length === 0) names = await tryOnce('Address');
  // Deduplicate and return
  return Array.from(new Set(names)).slice(0, limit);
}

// Hint for the doctype name used by Building & Location link field
export function getLocationDoctypeHint(): string | null {
  const hint = (pickEnv('ERP_LOCATION_DOCTYPE', 'ERP_LOCATION_DT') || '').trim();
  if (hint) return hint;
  // Common defaults; sites often customize to 'Building & Location' or use standard 'Location'
  return 'Building & Location';
}

// Fetch the selectable options for Lead.status from DocField metadata
export async function fetchLeadStatusOptions(): Promise<string[]> {
  const parseOptions = (raw?: string): string[] => {
    if (!raw || typeof raw !== 'string') return [];
    // Options can be separated by newlines or commas depending on site customizations
    const list = raw.includes('\n') ? raw.split('\n') : raw.split(',');
    return list.map(s => String(s || '').trim()).filter(Boolean);
  };
  const ensureOpen = (list: string[]): string[] => {
    const set = new Set<string>();
    const out: string[] = [];
    // Keep original order, de-dupe
    for (const s of list) {
      const v = String(s || '').trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (!set.has(key)) { set.add(key); out.push(v); }
    }
    // Ensure 'Open' exists (case-insensitive) — prepend if missing
    if (!set.has('open')) out.unshift('Open');
    return out;
  };

  // Try METHOD: DocField get_list
  if (METHOD_URL) {
    try {
      const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
        params: {
          doctype: 'DocField',
          fields: JSON.stringify(['options']),
          filters: JSON.stringify([
            ['parent', '=', 'Lead'],
            ['fieldname', '=', 'status'],
          ]),
          limit_page_length: 1,
        },
        headers: headers(),
      });
      const list = (res?.data?.message ?? []) as any[];
      const parsed = parseOptions(list?.[0]?.options as any);
      if (parsed.length > 0) return ensureOpen(parsed);
    } catch (err: any) {
      const server = err?.response?.data;
      const s = typeof server === 'string' ? server : JSON.stringify(server || '');
      // Ignore explicit PermissionError to avoid noisy logs on hardened servers
      if (!s?.includes('PermissionError')) {
        try { console.warn('status via DocField get_list failed', server || err?.message); } catch {}
      }
    }

    // Try METHOD: getdoctype Lead (DocField rows embedded)
    try {
      const fields = await fetchDocFieldsViaGetDoctype('Lead');
      const f = fields.find((x: any) => String(x?.fieldname) === 'status');
      const parsed = parseOptions(f?.options);
      if (parsed.length > 0) return ensureOpen(parsed);
    } catch {}
  }

  // Try RESOURCE: DocField query
  if (BASE_URL) {
    try {
      const res3 = await axios.get(`${BASE_URL}/DocField`, {
        params: {
          fields: JSON.stringify(['options']),
          filters: JSON.stringify({ parent: 'Lead', fieldname: 'status' }),
          limit_page_length: 1,
        },
        headers: headers(),
      });
      const list = (res3?.data?.data ?? []) as any[];
      const parsed = parseOptions(list?.[0]?.options as any);
      if (parsed.length > 0) return ensureOpen(parsed);
    } catch (err3: any) {
      const server = err3?.response?.data;
      const s = typeof server === 'string' ? server : JSON.stringify(server || '');
      if (!s?.includes('PermissionError')) {
        try { console.warn('status via resource DocField failed', server || err3?.message); } catch {}
      }
    }
  }

  // Fallback: derive unique statuses from existing Lead rows
  try {
    if (METHOD_URL) {
      const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
        params: {
          doctype: 'Lead',
          fields: JSON.stringify(['status']),
          limit_page_length: 500,
          order_by: 'modified desc',
        },
        headers: headers(),
      });
      const rows = (res?.data?.message ?? []) as any[];
      const set = new Set<string>();
      for (const r of rows) {
        const s = String(r?.status || '').trim();
        if (s) set.add(s);
      }
      const out = Array.from(set);
      if (out.length > 0) return ensureOpen(out);
    }
  } catch (err4: any) {
    try { console.warn('status fallback via Lead list failed', err4?.response?.data || err4?.message); } catch {}
  }

  // Final fallback: common defaults
  return ['Open', 'New', 'Contacted', 'Qualified', 'Prospect', 'Converted', 'Lost'];
}

// Generic: fetch options for a field on Lead. Accepts one or more candidate fieldnames and returns
// the first non-empty options list found.
export async function fetchLeadFieldOptions(fieldnames: string | string[]): Promise<string[]> {
  const names = Array.isArray(fieldnames) ? fieldnames : [fieldnames];
  const parseOptions = (raw?: string): string[] => {
    if (!raw || typeof raw !== 'string') return [];
    const list = raw.includes('\n') ? raw.split('\n') : raw.split(',');
    return list.map(s => String(s || '').trim()).filter(Boolean);
  };

  // Try METHOD: DocField get_list for each candidate
  if (METHOD_URL) {
    for (const fname of names) {
      try {
        const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
          params: {
            doctype: 'DocField',
            fields: JSON.stringify(['options']),
            filters: JSON.stringify([
              ['parent', '=', 'Lead'],
              ['fieldname', '=', fname],
            ]),
            limit_page_length: 1,
          },
          headers: headers(),
        });
        const list = (res?.data?.message ?? []) as any[];
        const parsed = parseOptions(list?.[0]?.options as any);
        if (parsed.length > 0) return parsed;
      } catch (err: any) {
        const server = err?.response?.data;
        const s = typeof server === 'string' ? server : JSON.stringify(server || '');
        if (!s?.includes('PermissionError')) {
          try { console.warn('fetchLeadFieldOptions via DocField get_list failed', fname, server || err?.message); } catch {}
        }
      }
    }

    // Try METHOD: getdoctype Lead
    try {
      const fields = await fetchDocFieldsViaGetDoctype('Lead');
      for (const fname of names) {
        const f = fields.find((x: any) => String(x?.fieldname) === String(fname));
        const parsed = parseOptions(f?.options);
        if (parsed.length > 0) return parsed;
      }
    } catch {}
  }

  // Try RESOURCE: DocField query per candidate (optional; many servers restrict DocField read)
  // To avoid noisy PermissionError logs on hardened servers, silently ignore permission failures.
  if (BASE_URL) {
    for (const fname of names) {
      try {
        const res3 = await axios.get(`${BASE_URL}/DocField`, {
          params: {
            fields: JSON.stringify(['options']),
            filters: JSON.stringify({ parent: 'Lead', fieldname: fname }),
            limit_page_length: 1,
          },
          headers: headers(),
        });
        const list = (res3?.data?.data ?? []) as any[];
        const parsed = parseOptions(list?.[0]?.options as any);
        if (parsed.length > 0) return parsed;
      } catch (err3: any) {
        const server = err3?.response?.data;
        const s = typeof server === 'string' ? server : JSON.stringify(server || '');
        // Ignore PermissionError; log others for troubleshooting
        if (!s?.includes('PermissionError')) {
          try { console.warn('fetchLeadFieldOptions via resource DocField failed', fname, server || err3?.message); } catch {}
        }
      }
    }
  }

  // Fallback: derive unique values from existing Lead rows (best-effort)
  try {
    if (METHOD_URL) {
      for (const fname of names) {
        try {
          const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
            params: {
              doctype: 'Lead',
              fields: JSON.stringify([fname]),
              limit_page_length: 500,
              order_by: 'modified desc',
            },
            headers: headers(),
          });
          const rows = (res?.data?.message ?? []) as any[];
          const set = new Set<string>();
          for (const r of rows) {
            const v = String((r as any)?.[fname] || '').trim();
            if (v) set.add(v);
          }
          const out = Array.from(set);
          if (out.length > 0) return out;
        } catch (errA: any) {
          const serverA = errA?.response?.data;
          const sA = typeof serverA === 'string' ? serverA : JSON.stringify(serverA || '');
          // If method path is restricted for this field (Field not permitted), try the resource API as a fallback
          if (BASE_URL) {
            try {
              const resB = await axios.get(`${BASE_URL}/Lead`, {
                params: {
                  fields: JSON.stringify(['name', fname]),
                  limit_page_length: 500,
                  order_by: 'modified desc',
                },
                headers: headers(),
              });
              const rowsB = (resB?.data?.data ?? []) as any[];
              const setB = new Set<string>();
              for (const r of rowsB) {
                const v = String((r as any)?.[fname] || '').trim();
                if (v) setB.add(v);
              }
              const outB = Array.from(setB);
              if (outB.length > 0) return outB;
            } catch (errB: any) {
              // Suppress noisy errors for invalid fields
              const serverB = errB?.response?.data;
              const sB = typeof serverB === 'string' ? serverB : JSON.stringify(serverB || '');
              if (!sB?.includes('Field not permitted') && !sB?.includes('DataError')) {
                try { console.warn('fetchLeadFieldOptions resource list fallback failed', fname, serverB || errB?.message); } catch {}
              }
            }
          }
        }
      }
    }
  } catch (err3: any) {
    try { console.warn('fetchLeadFieldOptions fallback via Lead list failed', err3?.response?.data || err3?.message); } catch {}
  }

  return [];
}

// Attempt to list "Associate"-like names from common doctypes if present.
export async function listAssociates(search: string = '', limit: number = 20): Promise<string[]> {
  const tryOnce = async (dt: string) => {
    try { return await searchDocNames(dt, search, limit); } catch { return []; }
  };
  // Try likely doctypes in order
  const dts = ['Associate', 'Employee', 'Contact', 'User'];
  const out: string[] = [];
  for (const dt of dts) {
    const rows = await tryOnce(dt);
    for (const name of rows) {
      if (out.length >= limit) break;
      if (!out.includes(name)) out.push(name);
    }
    if (out.length >= limit) break;
  }
  return out;
}

// Utilities below keep the LeadDetailScreen compile-safe. They implement a sane default mapping.

export function prepareLeadPayload(input: Record<string, any>): Record<string, any> {
  // Map UI keys to ERP fieldnames (handle common custom aliases)
  const out: Record<string, any> = { ...input };
  const alias = (src: string, dest: string) => {
    if (src in out && !(dest in out)) {
      out[dest] = out[src];
      // Remove the UI alias to avoid colliding with core fields (e.g., notes child table)
      delete out[src];
    }
  };
  alias('whatsapp', 'custom_whatsapp');
  alias('date', 'custom_date');
  alias('location', 'custom_building__location');
  alias('lead_type', 'custom_lead_type');
  alias('request_type', 'custom_request_type');
  alias('service_type', 'custom_service_type');
  alias('notes', 'custom_notes');

  return out;
}

// Fetch meta for a Lead DocField. Returns fieldtype and options (for Select, the options string; for Link, the linked doctype name).
export async function fetchLeadFieldMeta(fieldnames: string | string[]): Promise<{ fieldname?: string; fieldtype?: string; options?: string } | null> {
  const names = Array.isArray(fieldnames) ? fieldnames : [fieldnames];

  // METHOD: DocField get_list first
  if (METHOD_URL) {
    for (const fname of names) {
      try {
        const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
          params: {
            doctype: 'DocField',
            fields: JSON.stringify(['fieldtype', 'options']),
            filters: JSON.stringify([
              ['parent', '=', 'Lead'],
              ['fieldname', '=', fname],
            ]),
            limit_page_length: 1,
          },
          headers: headers(),
        });
        const list = (res?.data?.message ?? []) as any[];
        if (list && list[0]) return { fieldname: String(fname), fieldtype: list[0].fieldtype, options: list[0].options };
      } catch {}
    }
    // METHOD: getdoctype
    try {
      const fields = await fetchDocFieldsViaGetDoctype('Lead');
      for (const fname of names) {
        const f = fields.find((x: any) => String(x?.fieldname) === String(fname));
        if (f) return { fieldname: String(f.fieldname), fieldtype: f.fieldtype, options: f.options };
      }
    } catch {}
  }
  // RESOURCE: DocField (may be restricted)
  if (BASE_URL) {
    for (const fname of names) {
      try {
        const res3 = await axios.get(`${BASE_URL}/DocField`, {
          params: {
            fields: JSON.stringify(['fieldtype', 'options']),
            filters: JSON.stringify({ parent: 'Lead', fieldname: fname }),
            limit_page_length: 1,
          },
          headers: headers(),
        });
        const list = (res3?.data?.data ?? []) as any[];
        if (list && list[0]) return { fieldname: String(fname), fieldtype: list[0].fieldtype, options: list[0].options };
      } catch (err3: any) {
        const server = err3?.response?.data;
        const s = typeof server === 'string' ? server : JSON.stringify(server || '');
        if (s?.includes('PermissionError')) {
          // ignore silently
        }
      }
    }
  }
  return null;
}

export function prepareLeadUpdatePayload(input: Record<string, any>): Record<string, any> {
  return prepareLeadPayload(input);
}

export async function updateLeadSmart(name: string, updatedFields: Record<string, any>): Promise<Lead | true | null> {
  const n = String(name || '').trim();
  if (!n) return null;
  const body = prepareLeadUpdatePayload(updatedFields);

  // Try resource PUT first
  try {
    const res = await axios.put(`${BASE_URL}/Lead/${encodeURIComponent(n)}`, body, { headers: { ...headers(), 'Content-Type': 'application/json' } });
    const data = (res?.data?.data ?? res?.data) as any;
    return data || true;
  } catch (err1: any) {
    const server = err1?.response?.data;
    try { console.warn('updateLeadSmart resource failed', server || err1?.message); } catch {}
  }
  // Fallback to method set_value (partial update)
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res = await axios.post(`${METHOD_URL}/frappe.client.set_value`, {
      doctype: 'Lead',
      name: n,
      fieldname: body,
    }, { headers: { ...headers(), 'Content-Type': 'application/json' } });
    const data = res?.data?.message;
    return data || true;
  } catch (err2: any) {
    const server = err2?.response?.data;
    console.error('updateLeadSmart method failed', server || err2?.message);
    return null;
  }
}

// Create a new Lead
export async function createLead(payload: Record<string, any>): Promise<Lead | true | null> {
  let validLocation: string | null = null;

  try {
    const candidates: string[] = [];
    const forcedDt = pickEnv("ERP_LOCATION_DOCTYPE", "ERP_LOCATION_DT");
    if (forcedDt) { candidates.push(forcedDt); }
    else { candidates.push("Location"); candidates.push("Building & Location"); }

    const ensureValid = async (name?: string | null, locDt?: string): Promise<string | null> => {
      const n = String(name || "").trim();
      if (!n) return null;
      try { return (await existsDocName(locDt!, n)) ? n : null; } catch { return null; }
    };

    const requestedRaw = (payload as any)?.custom_building__location || (payload as any)?.location || '';
    const rawCandidates: string[] = Array.from(new Set([
      String(requestedRaw || '').trim(),
      String(String(requestedRaw || '').split(',')[0] || '').trim(),
    ].filter((x) => x && x.length > 0)));

    console.info('Lead create: location candidates', candidates, 'requested', requestedRaw);
    for (const locDt of candidates) {
      // Validate user-provided raw candidates (full string and first comma-separated token)
      for (const rc of rawCandidates) {
        validLocation = await ensureValid(rc, locDt);
        if (validLocation) break;
      }
      // If not valid and user typed a value, try to auto-create without env gate for urgent unblock
      if (!validLocation && rawCandidates.length > 0) {
        try {
          const created = await createDocNameIfPossible(locDt!, rawCandidates[0]);
          if (created) validLocation = created;
        } catch {}
      }
      if (validLocation) break;

      // Validate default env
      const fallback = pickEnv("ERP_LOCATION_DEFAULT", "ERP_LOCATION_DEFAULT_NAME", "DEFAULT_LOCATION");
      validLocation = await ensureValid(fallback, locDt);
      if (validLocation) break;

      // Validate first available option
      try {
        const names = await listDocNamesSimple(locDt, 1);
        if (names && names.length > 0) {
          validLocation = names[0];
          break;
        }
      } catch {}
    }

    // If still not resolved, try forced default (validate or create)\n    if (!validLocation) {\n      const forcedDefault = pickEnv('ERP_LOCATION_DEFAULT', 'ERP_LOCATION_DEFAULT_NAME', 'DEFAULT_LOCATION') || '';\n      const fd = forcedDefault.trim();\n      if (fd.length > 0) {\n        const tryList = forcedDt ? [forcedDt] : candidates;\n        for (const dt of tryList) {\n          validLocation = await ensureValid(fd, dt);\n          if (validLocation) break;\n          try {\n            const created = await createDocNameIfPossible(dt!, fd);\n            if (created) { validLocation = created; break; }\n          } catch {}\n        }\n      }\n    }\n\n    // If still not resolved, pick the first available from the primary doctype list\n    if (!validLocation) {\n      const primary = forcedDt || 'Location';\n      try {\n        const names = await listDocNamesSimple(primary, 1);\n        if (names && names.length > 0) validLocation = names[0];\n      } catch {}\n    }\n// If still not resolved, keep the originally requested raw value to satisfy mandatory
    if (!validLocation) {
      const requestedRaw = (payload as any)?.custom_building__location || (payload as any)?.location || '';
      if (requestedRaw && String(requestedRaw).trim().length > 0) validLocation = String(requestedRaw).trim();
    }

    // Apply only to custom_building__location as requested; ensure plain 'location' is not sent
    if (validLocation) {
      console.info('Lead create: using location', { name: validLocation });
      (payload as any).custom_building__location = validLocation;
      delete (payload as any).location;
    } else {
      delete (payload as any).custom_building__location;
      delete (payload as any).location;
    }
  } catch (e) {
    console.warn("Location validation error", e);
    delete (payload as any).custom_building__location;
    delete (payload as any).location;
  }

  // ================================
  // Attempt REST resource insert
  // ================================
  try {
    const res = await axios.post(`${BASE_URL}/Lead`, payload, {
      headers: { ...headers(), "Content-Type": "application/json" }
    });
    return (res?.data?.data ?? res?.data ?? true) as any;
  } catch (err1: any) {
    console.warn("createLead resource failed", err1?.response?.data || err1?.message);
  }

  // ================================
  // Fallback to frappe.client.insert
  // ================================
  try {
    if (!METHOD_URL) throw new Error("METHOD_URL not configured");

    const doc = { doctype: "Lead", ...payload };
    const res = await axios.post(`${METHOD_URL}/frappe.client.insert`,
      { doc },
      { headers: { ...headers(), "Content-Type": "application/json" } }
    );

    return (res?.data?.message ?? true) as any;
  } catch (err2: any) {
    console.error("createLead method failed", err2?.response?.data || err2?.message);
    return null;
  }
}




