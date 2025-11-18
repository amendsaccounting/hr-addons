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

export type LeaveAllocation = {
  name: string;
  employee: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  // Some sites use different field names; we normalize below
  leaves_allocated: number; // effective allocated for that record
  new_leaves_allocated?: number;
  total_leaves_allocated?: number;
};

export type LeaveBalance = {
  leave_type: string;
  allocated: number;
  used: number;
  available: number;
};

function normalizeAllocations(rows: any[]): LeaveAllocation[] {
  return (rows || []).map((r) => {
    const leaves_allocated =
      r.leaves_allocated ?? r.total_leaves_allocated ?? r.new_leaves_allocated ?? 0;
    return {
      name: r.name,
      employee: r.employee,
      leave_type: r.leave_type,
      from_date: r.from_date,
      to_date: r.to_date,
      leaves_allocated,
      new_leaves_allocated: r.new_leaves_allocated,
      total_leaves_allocated: r.total_leaves_allocated,
    } as LeaveAllocation;
  });
}

// Fetch Leave Allocation rows for an employee (resource → fallback to method)
export async function fetchLeaveAllocations(employeeId: string): Promise<LeaveAllocation[]> {
  const id = String(employeeId || '').trim();
  if (!id) return [];
  // Attempt 1: Resource endpoint with explicit fields/filters
  try {
    const res = await axios.get(`${BASE_URL}/Leave%20Allocation`, {
      params: {
        filters: JSON.stringify([["employee", "=", id]]),
        fields: JSON.stringify([
          'name',
          'employee',
          'leave_type',
          'from_date',
          'to_date',
          'total_leaves_allocated',
          'new_leaves_allocated',
        ]),
        limit_page_length: 500,
      },
      headers: headers(),
    });
    return normalizeAllocations((res?.data?.data ?? []) as any[]);
  } catch (err1: any) {
    const server = err1?.response?.data;
    console.warn('fetchLeaveAllocations resource failed', server || err1?.message);
  }

  // Attempt 2: Simplified resource filter shape (some servers accept object)
  try {
    const res = await axios.get(`${BASE_URL}/Leave%20Allocation`, {
      params: {
        filters: JSON.stringify({ employee: id }),
        limit_page_length: 500,
      },
      headers: headers(),
    });
    return normalizeAllocations((res?.data?.data ?? []) as any[]);
  } catch (err2: any) {
    const server = err2?.response?.data;
    console.warn('fetchLeaveAllocations resource alt failed', server || err2?.message);
  }

  // Attempt 3: Method endpoint frappe.client.get_list
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype: 'Leave Allocation',
        fields: JSON.stringify([
          'name',
          'employee',
          'leave_type',
          'from_date',
          'to_date',
          'total_leaves_allocated',
          'new_leaves_allocated',
        ]),
        filters: JSON.stringify([["employee", "=", id]]),
        limit_page_length: 500,
      },
      headers: headers(),
    });
    const list = (res?.data?.message ?? []) as any[];
    return normalizeAllocations(list);
  } catch (err3: any) {
    const server = err3?.response?.data;
    console.error('fetchLeaveAllocations method failed', server || err3?.message);
    return [];
  }
}

// Sum of approved leave days per type for an employee
export async function fetchLeaveUsage(employeeId: string): Promise<Record<string, number>> {
  const id = String(employeeId || '').trim();
  if (!id) return {};
  const acc: Record<string, number> = {};

  // Attempt 1: Resource endpoint
  try {
    const res = await axios.get(`${BASE_URL}/Leave%20Application`, {
      params: {
        filters: JSON.stringify([
          ['employee', '=', id],
          ['status', '=', 'Approved'],
        ]),
        fields: JSON.stringify(['leave_type', 'total_leave_days']),
        limit_page_length: 1000,
      },
      headers: headers(),
    });
    const rows = (res?.data?.data ?? []) as any[];
    for (const r of rows) {
      const t = String(r?.leave_type || '').trim();
      const days = Number(r?.total_leave_days || 0) || 0;
      if (!t) continue;
      acc[t] = (acc[t] || 0) + days;
    }
    return acc;
  } catch (err1: any) {
    const server = err1?.response?.data;
    console.warn('fetchLeaveUsage resource failed', server || err1?.message);
  }

  // Attempt 2: Method get_list
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype: 'Leave Application',
        fields: JSON.stringify(['leave_type', 'total_leave_days', 'status', 'employee']),
        filters: JSON.stringify([
          ['employee', '=', id],
          ['status', '=', 'Approved'],
        ]),
        limit_page_length: 1000,
      },
      headers: headers(),
    });
    const rows = (res?.data?.message ?? []) as any[];
    for (const r of rows) {
      const t = String(r?.leave_type || '').trim();
      const days = Number(r?.total_leave_days || 0) || 0;
      if (!t) continue;
      acc[t] = (acc[t] || 0) + days;
    }
    return acc;
  } catch (err2: any) {
    const server = err2?.response?.data;
    console.error('fetchLeaveUsage method failed', server || err2?.message);
    return acc;
  }
}

// Compute per-type balances using Leave Allocation (sum active allocations) minus used
export async function computeLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  const [allocations, usedMap] = await Promise.all([
    fetchLeaveAllocations(employeeId),
    fetchLeaveUsage(employeeId).catch(() => ({} as Record<string, number>)),
  ]);

  // Prefer allocations active today; if none, fall back to all
  const today = new Date();
  const isActive = (a: LeaveAllocation) => {
    try {
      const from = new Date(String(a.from_date).replace(' ', 'T'));
      const to = new Date(String(a.to_date).replace(' ', 'T'));
      return (!isNaN(from.getTime()) ? from <= today : true) && (!isNaN(to.getTime()) ? today <= to : true);
    } catch {
      return true;
    }
  };
  const active = allocations.filter(isActive);
  const base = active.length > 0 ? active : allocations;

  const byType = new Map<string, number>();
  for (const a of base) {
    const key = String(a.leave_type || '').trim();
    if (!key) continue;
    const qty = Number(a.leaves_allocated || 0) || 0;
    byType.set(key, (byType.get(key) || 0) + qty);
  }

  const result: LeaveBalance[] = [];
  for (const [leave_type, allocated] of byType) {
    const used = Number(usedMap[leave_type] || 0) || 0;
    const available = Math.max(0, allocated - used);
    result.push({ leave_type, allocated, used, available });
  }

  // Include types present only in usage (edge case)
  for (const t of Object.keys(usedMap)) {
    if (!byType.has(t)) {
      const used = Number(usedMap[t] || 0) || 0;
      result.push({ leave_type: t, allocated: 0, used, available: 0 });
    }
  }

  // Sort for stable UI: by type name
  result.sort((a, b) => a.leave_type.localeCompare(b.leave_type));
  return result;
}
