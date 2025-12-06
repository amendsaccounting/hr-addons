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
    const url = `${BASE_URL}/${encodeURIComponent(doctype)}`;
    const res = await axios.get(url, {
      params: {
        fields: JSON.stringify(['name']),
        order_by: 'name asc',
        limit_page_length: limit,
      },
      headers: headers(),
    });
    return namesFrom(res?.data?.data ?? []);
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
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype,
        fields: JSON.stringify(['name']),
        order_by: 'name asc',
        limit_page_length: limit,
      },
      headers: headers(),
    });
    return namesFrom(res?.data?.message ?? []);
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
    const res = await axios.post(`${BASE_URL}/Expense%20Claim`, basePayload, { headers: headers() });
    return (res?.data?.data ?? res?.data ?? true);
  } catch (err1: any) {
    const server = err1?.response?.data;
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
      const res2 = await axios.post(`${BASE_URL}/Expense%20Claim`, fallback, { headers: headers() });
      return (res2?.data?.data ?? res2?.data ?? true);
    } catch {}
    console.warn('submitExpenseClaim resource failed', server || err1?.message);
  }

  // Fallback: method endpoint (frappe.client.insert)
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const doc = { doctype: 'Expense Claim', ...basePayload };
    const res = await axios.post(`${METHOD_URL}/frappe.client.insert`, { doc }, { headers: headers() });
    return (res?.data?.message ?? true);
  } catch (err2: any) {
    const server2 = err2?.response?.data;
    console.error('submitExpenseClaim method failed', server2 || err2?.message);
    throw err2;
  }
}
