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

export type ExpenseClaimInput = {
  employee: string;
  expense_type: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  description?: string;
  company?: string;
};

export type ExpenseHistoryItem = {
  name: string;
  status: string;
  total: number;
  currency?: string | null;
  posting_date?: string | null;
  creation?: string | null;
  modified?: string | null;
  expense_type?: string | null;
  description?: string | null;
};

export async function fetchExpenseHistory(employeeId: string, limit: number = 50): Promise<ExpenseHistoryItem[]> {
  const id = String(employeeId || '').trim();
  if (!id) return [];

  // Names-only list followed by detail fetch to include currency and other restricted fields
  // Try method first to list names
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    try { console.log('[expenseClaim] history (method-names) request', { employee: id, limit }); } catch {}
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype: 'Expense Claim',
        fields: JSON.stringify(['name']),
        filters: JSON.stringify([["employee", "=", id]]),
        order_by: 'creation desc',
        limit_page_length: limit,
      },
      headers: headers(),
    });
    try { console.log('[expenseClaim] history (method-names) raw', { status: res?.status, data: res?.data }); } catch {}
    const rows = (res?.data?.message ?? []) as any[];
    const names = rows.map((r) => String(r?.name || '')).filter((s) => s);
    try { console.log('[expenseClaim] history (method-names) ok', { count: names.length }); } catch {}
    const details: ExpenseHistoryItem[] = [];
    for (const name of names) {
      try {
        const r = await axios.get(`${BASE_URL}/Expense%20Claim/${encodeURIComponent(name)}`, { headers: headers() });
        const doc: any = r?.data?.data ?? r?.data ?? null;
        try { console.log('[expenseClaim] history detail (resource) raw', { name, status: r?.status, data: r?.data }); } catch {}
        if (!doc) continue;
        details.push({
          name: String(doc.name || name),
          status: String(doc.status || 'Pending'),
          // Show claimed amount only (not sanctioned)
          total: Number(doc.total_claimed_amount ?? doc.grand_total ?? 0) || 0,
          currency: doc.currency || null,
          posting_date: doc.posting_date || null,
          creation: doc.creation || null,
          modified: doc.modified || null,
          expense_type: (Array.isArray(doc.expenses) && doc.expenses[0]?.expense_type) ? String(doc.expenses[0].expense_type) : null,
          description: (doc.remarks || doc.description || (Array.isArray(doc.expenses) && doc.expenses[0]?.description) || null) as any,
        });
      } catch (e) {
        try { console.warn('[expenseClaim] history detail fetch failed', name, (e as any)?.response?.data || (e as any)?.message || e); } catch {}
      }
    }
    return details;
  } catch (e: any) {
    try { console.warn('[expenseClaim] history (method-names) failed', e?.response?.data || e?.message || e); } catch {}
  }

  // Fallback: resource list names only, then detail fetch
  try {
    try { console.log('[expenseClaim] history (resource-names) request', { employee: id, limit }); } catch {}
    const res = await axios.get(`${BASE_URL}/Expense%20Claim`, {
      params: {
        filters: JSON.stringify([["employee", "=", id]]),
        fields: JSON.stringify(['name']),
        order_by: 'creation desc',
        limit_page_length: limit,
      },
      headers: headers(),
    });
    try { console.log('[expenseClaim] history (resource-names) raw', { status: res?.status, data: res?.data }); } catch {}
    const rows = (res?.data?.data ?? []) as any[];
    const names = rows.map((r) => String(r?.name || '')).filter((s) => s);
    try { console.log('[expenseClaim] history (resource-names) ok', { count: names.length }); } catch {}
    const details: ExpenseHistoryItem[] = [];
    for (const name of names) {
      try {
        const r = await axios.get(`${BASE_URL}/Expense%20Claim/${encodeURIComponent(name)}`, { headers: headers() });
        const doc: any = r?.data?.data ?? r?.data ?? null;
        try { console.log('[expenseClaim] history detail (resource) raw', { name, status: r?.status, data: r?.data }); } catch {}
        if (!doc) continue;
        details.push({
          name: String(doc.name || name),
          status: String(doc.status || 'Pending'),
          // Show claimed amount only (not sanctioned)
          total: Number(doc.total_claimed_amount ?? doc.grand_total ?? 0) || 0,
          currency: doc.currency || null,
          posting_date: doc.posting_date || null,
          creation: doc.creation || null,
          modified: doc.modified || null,
          expense_type: (Array.isArray(doc.expenses) && doc.expenses[0]?.expense_type) ? String(doc.expenses[0].expense_type) : null,
          description: (doc.remarks || doc.description || (Array.isArray(doc.expenses) && doc.expenses[0]?.description) || null) as any,
        });
      } catch (e) {
        try { console.warn('[expenseClaim] history detail fetch failed', name, (e as any)?.response?.data || (e as any)?.message || e); } catch {}
      }
    }
    return details;
  } catch (e: any) {
    try { console.error('[expenseClaim] history failed', e?.response?.data || e?.message || e); } catch {}
    return [];
  }
}

// Fetch available Expense Claim categories (doctype usually "Expense Claim Type").
// Returns a list of names. Filters out disabled types when possible.
export async function fetchExpenseCategories(limit: number = 200): Promise<string[]> {
  const isDoesNotExist = (e: any) => {
    const msg = e?.response?.data || e?.message || '';
    const t = (typeof msg === 'string' ? msg : JSON.stringify(msg || {})).toLowerCase();
    return t.includes('doesnotexisterror') || t.includes('not found');
  };
  const namesFrom = (rows: any[]): string[] => {
    return (rows || [])
      .map((r) => String(r?.name || ''))
      .filter((s) => s.trim().length > 0);
  };

  // Resource endpoint attempts
  const tryResource = async (doctype: string) => {
    try { console.log('[expenseClaim] fetch categories (resource)', { doctype, limit }); } catch {}
    const url = `${BASE_URL}/${encodeURIComponent(doctype)}`;
    const res = await axios.get(url, {
      params: {
        fields: JSON.stringify(['name']),
        order_by: 'name asc',
        limit_page_length: limit,
      },
      headers: headers(),
    });
    const rows = res?.data?.data ?? [];
    try { console.log('[expenseClaim] categories (resource) ok', { doctype, count: Array.isArray(rows) ? rows.length : 0 }); } catch {}
    return namesFrom(rows);
  };
  try {
    // Primary doctype
    const list = await tryResource('Expense Claim Type');
    if (list.length > 0) return list;
  } catch (e) {
    if (!isDoesNotExist(e)) {
      try { console.warn('fetchExpenseCategories resource (Claim Type) failed', (e as any)?.response?.data || (e as any)?.message); } catch {}
    }
  }
  // Prefer trying method fallback for the canonical doctype before alternate names
  try {
    const list3 = await tryMethod('Expense Claim Type');
    if (list3.length > 0) return list3;
  } catch (e) {
    if (!isDoesNotExist(e)) {
      try { console.warn('fetchExpenseCategories method (Claim Type) failed', (e as any)?.response?.data || (e as any)?.message); } catch {}
    }
  }
  // Some sites may use an older/alternate doctype label; try quietly
  try {
    const list2 = await tryResource('Expense Type');
    if (list2.length > 0) return list2;
  } catch (e) {
    if (!isDoesNotExist(e)) {
      try { console.warn('fetchExpenseCategories resource (Expense Type) failed', (e as any)?.response?.data || (e as any)?.message); } catch {}
    }
  }

  // Method endpoint fallback
  const tryMethod = async (doctype: string) => {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    try { console.log('[expenseClaim] fetch categories (method)', { doctype, limit }); } catch {}
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype,
        fields: JSON.stringify(['name']),
        order_by: 'name asc',
        limit_page_length: limit,
      },
      headers: headers(),
    });
    const rows = res?.data?.message ?? [];
    try { console.log('[expenseClaim] categories (method) ok', { doctype, count: Array.isArray(rows) ? rows.length : 0 }); } catch {}
    return namesFrom(rows);
  };
  try {
    const list4 = await tryMethod('Expense Type');
    if (list4.length > 0) return list4;
  } catch (e) {
    if (!isDoesNotExist(e)) {
      try { console.error('fetchExpenseCategories method (Expense Type) failed', (e as any)?.response?.data || (e as any)?.message); } catch {}
    }
  }

  return [];
}

// Submit a single-line Expense Claim with one expense row
export async function submitExpenseClaim(input: ExpenseClaimInput): Promise<any> {
  const basePayload = {
    employee: input.employee,
    ...(input.company ? { company: input.company } : {}),
    expenses: [
      {
        expense_type: input.expense_type,
        expense_date: input.expense_date,
        amount: input.amount,
        description: input.description || undefined,
      },
    ],
  } as Record<string, any>;

  // Try resource endpoint first
  try {
    try { console.log('[expenseClaim] submit (resource) request', { employee: input.employee, company: input.company || null, expense_type: input.expense_type, amount: input.amount, expense_date: input.expense_date }); } catch {}
    const res = await axios.post(`${BASE_URL}/Expense%20Claim`, basePayload, { headers: headers() });
    try { console.log('[expenseClaim] submit (resource) ok', { status: res?.status, data: res?.data }); } catch {}
    return (res?.data?.data ?? res?.data ?? true);
  } catch (err1: any) {
    const server = err1?.response?.data;
    try { console.warn('[expenseClaim] submit (resource) failed', server || err1?.message); } catch {}
    // Some ERPNext variants use 'sanctioned_amount' in the child; try a fallback payload
    try {
      const fallback = {
        ...basePayload,
        expenses: [
          {
            expense_type: input.expense_type,
            expense_date: input.expense_date,
            amount: input.amount,
            sanctioned_amount: input.amount,
            description: input.description || undefined,
          },
        ],
      };
      try { console.log('[expenseClaim] submit (resource-fallback) request', { employee: input.employee, company: input.company || null, expense_type: input.expense_type, amount: input.amount }); } catch {}
      const res2 = await axios.post(`${BASE_URL}/Expense%20Claim`, fallback, { headers: headers() });
      try { console.log('[expenseClaim] submit (resource-fallback) ok', { status: res2?.status, data: res2?.data }); } catch {}
      return (res2?.data?.data ?? res2?.data ?? true);
    } catch {}
    console.warn('submitExpenseClaim resource failed', server || err1?.message);
  }

  // Fallback: method endpoint (frappe.client.insert)
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const doc = { doctype: 'Expense Claim', ...basePayload };
    try { console.log('[expenseClaim] submit (method) request', { hasDoc: !!doc, employee: input.employee, company: input.company || null }); } catch {}
    const res = await axios.post(`${METHOD_URL}/frappe.client.insert`, { doc }, { headers: headers() });
    try { console.log('[expenseClaim] submit (method) ok', { status: res?.status, data: res?.data }); } catch {}
    return (res?.data?.message ?? true);
  } catch (err2: any) {
    const server2 = err2?.response?.data;
    console.error('submitExpenseClaim method failed', server2 || err2?.message);
    throw err2;
  }
}
