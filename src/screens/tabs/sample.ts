import axios from "axios";
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

function buildHeaders(): Record<string, string> {
  return { Authorization: `token ${API_KEY}:${API_SECRET}` };
}

function normalizeAllocations(rows: any[]): LeaveAllocation[] {
  return (rows || []).map((r) => ({
    name: r.name,
    employee: r.employee,
    leave_type: r.leave_type,
    new_leaves_allocated: r.new_leaves_allocated ?? r.total_leaves_allocated ?? r.leaves_allocated ?? 0,
    from_date: r.from_date,
    to_date: r.to_date,
    leaves_allocated: r.leaves_allocated ?? r.total_leaves_allocated ?? r.new_leaves_allocated ?? 0,
  }));
}

export type LeaveAllocation = {
  name: string;
  employee: string;
  leave_type: string;
  new_leaves_allocated: number;
  from_date: string;
  to_date: string;
  leaves_allocated: number;
};

// Function to fetch leave allocations for a given employee
export const fetchLeaveAllocations = async (employeeId: string): Promise<LeaveAllocation[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/Leave%20Allocation`, {
      params: {
        filters: JSON.stringify([["employee", "=", employeeId]]),
        fields: JSON.stringify([
          "name",
          "employee",
          "leave_type",
          "from_date",
          "to_date",
          "total_leaves_allocated",
          "new_leaves_allocated",
        ]),
        limit_page_length: 100,
      },
      headers: buildHeaders(),
    });
    console.log("Full Leave Allocation Response:", response);
    console.log("Leave Allocations Data:", response.data.data);

    const rows = (response?.data?.data ?? []) as any[];
    return normalizeAllocations(rows);
  } catch (error: any) {
    const server = error?.response?.data;
    console.warn('Leave Allocation attempt 1 failed', server || error.message);
    try {
      const res2 = await axios.get(`${BASE_URL}/Leave%20Allocation`, {
        params: {
          filters: JSON.stringify({ employee: employeeId }),
          limit_page_length: 100,
        },
        headers: buildHeaders(),
      });
      return normalizeAllocations((res2?.data?.data ?? []) as any[]);
    } catch (err2: any) {
      const server2 = err2?.response?.data;
      console.warn('Leave Allocation attempt 2 failed', server2 || err2.message);

      // Attempt 3: Method endpoint frappe.client.get_list
      try {
        if (!METHOD_URL) throw new Error('METHOD_URL not configured');
        const res3 = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
          params: {
            doctype: 'Leave Allocation',
            fields: JSON.stringify([
              "name",
              "employee",
              "leave_type",
              "from_date",
              "to_date",
              "total_leaves_allocated",
              "new_leaves_allocated",
            ]),
            filters: JSON.stringify([["employee", "=", employeeId]]),
            limit_page_length: 100,
          },
          headers: buildHeaders(),
        });
        const list = (res3?.data?.message ?? []) as any[];
        return normalizeAllocations(list);
      } catch (err3: any) {
        const server3 = err3?.response?.data;
        console.error('Leave Allocation attempt 3 failed', server3 || err3.message);
        throw err3;
      }
    }
  }
};

// Sum of approved leave days per leave_type for an employee
export async function fetchLeaveUsage(employeeId: string): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  // Attempt 1: Resource endpoint
  try {
    const res = await axios.get(`${BASE_URL}/Leave%20Application`, {
      params: {
        filters: JSON.stringify([
          ["employee", "=", employeeId],
          ["status", "=", "Approved"],
        ]),
        fields: JSON.stringify(["leave_type", "total_leave_days"]),
        limit_page_length: 500,
      },
      headers: buildHeaders(),
    });
    const rows = (res?.data?.data ?? []) as any[];
    for (const r of rows) {
      const k = r.leave_type;
      const v = Number(r.total_leave_days || 0) || 0;
      result[k] = (result[k] || 0) + v;
    }
    return result;
  } catch (err1: any) {
    console.warn('Leave usage attempt 1 failed', err1?.response?.data || err1.message);
  }

  // Attempt 2: Method endpoint
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res2 = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype: 'Leave Application',
        fields: JSON.stringify(["leave_type", "total_leave_days"]),
        filters: JSON.stringify([
          ["employee", "=", employeeId],
          ["status", "=", "Approved"],
        ]),
        limit_page_length: 500,
      },
      headers: buildHeaders(),
    });
    const rows = (res2?.data?.message ?? []) as any[];
    for (const r of rows) {
      const k = r.leave_type;
      const v = Number(r.total_leave_days || 0) || 0;
      result[k] = (result[k] || 0) + v;
    }
    return result;
  } catch (err2: any) {
    console.error('Leave usage attempt 2 failed', err2?.response?.data || err2.message);
    return result;
  }
}

export type ApplyLeaveInput = {
  employee: string;
  leave_type: string;
  from_date: string; // YYYY-MM-DD
  to_date: string;   // YYYY-MM-DD
  description?: string;
  company?: string;
};

// Create a Leave Application for the given employee
export async function applyLeave(input: ApplyLeaveInput): Promise<any> {
  const payload: Record<string, any> = {
    employee: input.employee,
    leave_type: input.leave_type,
    from_date: input.from_date,
    to_date: input.to_date,
  };
  if (input.description) payload.description = input.description;
  if (input.company) payload.company = input.company;

  // Try resource endpoint first
  try {
    const res = await axios.post(`${BASE_URL}/Leave%20Application`, payload, { headers: buildHeaders() });
    return (res?.data?.data ?? res?.data ?? true);
  } catch (err1: any) {
    const server1 = err1?.response?.data;
    console.warn('applyLeave resource failed', server1 || err1.message);
  }

  // Fallback: method endpoint
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const doc = { doctype: 'Leave Application', ...payload };
    const res2 = await axios.post(`${METHOD_URL}/frappe.client.insert`, { doc }, { headers: buildHeaders() });
    return (res2?.data?.message ?? true);
  } catch (err2: any) {
    const server2 = err2?.response?.data;
    console.error('applyLeave method failed', server2 || err2.message);
    throw err2;
  }
}

export type LeaveHistoryItem = {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: string;
  description?: string;
  total_leave_days?: number;
};

// Fetch recent leave applications for an employee
export async function fetchLeaveHistory(employeeId: string, limit: number = 50): Promise<LeaveHistoryItem[]> {
  // Attempt 1: Resource endpoint
  try {
    const res = await axios.get(`${BASE_URL}/Leave%20Application`, {
      params: {
        filters: JSON.stringify([["employee", "=", employeeId]]),
        fields: JSON.stringify([
          "name",
          "leave_type",
          "from_date",
          "to_date",
          "status",
          "description",
          "total_leave_days",
        ]),
        limit_page_length: limit,
        order_by: "modified desc",
      },
      headers: buildHeaders(),
    });
    return (res?.data?.data ?? []) as LeaveHistoryItem[];
  } catch (err1: any) {
    console.warn('fetchLeaveHistory resource failed', err1?.response?.data || err1.message);
  }

  // Attempt 2: Method endpoint
  try {
    if (!METHOD_URL) throw new Error('METHOD_URL not configured');
    const res2 = await axios.get(`${METHOD_URL}/frappe.client.get_list`, {
      params: {
        doctype: 'Leave Application',
        fields: JSON.stringify([
          "name",
          "leave_type",
          "from_date",
          "to_date",
          "status",
          "description",
          "total_leave_days",
        ]),
        filters: JSON.stringify([["employee", "=", employeeId]]),
        limit_page_length: limit,
        order_by: "modified desc",
      },
      headers: buildHeaders(),
    });
    return (res2?.data?.message ?? []) as LeaveHistoryItem[];
  } catch (err2: any) {
    console.error('fetchLeaveHistory method failed', err2?.response?.data || err2.message);
    return [];
  }
}
