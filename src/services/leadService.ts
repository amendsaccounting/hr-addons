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

function enc(x: any) {
  return encodeURIComponent(typeof x === 'string' ? x : JSON.stringify(x));
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
    else filters.push(['lead_name', 'like', q]);
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
  const json = await res.json().catch(() => null as any);
  if (!res.ok) return null;
  return ((json as any)?.data ?? json) as Lead;
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
