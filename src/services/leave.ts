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
    // Attempt 1: Resource endpoint with list-style filters and explicit fields
    const response = await axios.get(`${BASE_URL}/Leave%20Allocation`, {
      params: {
        // ERPNext resource filters are in the form: [["field","op","value"]]
        filters: JSON.stringify([["employee", "=", employeeId]]),
        fields: JSON.stringify([
          "name",
          "employee",
          "leave_type",
          "from_date",
          "to_date",
          // Avoid non-permitted fields like leaves_allocated
          "total_leaves_allocated",
          "new_leaves_allocated",
        ]),
        limit_page_length: 100,
      },
      headers: buildHeaders(),
    });

    // Log the full response
    console.log("Full Leave Allocation Response:", response);

    // Log only the data array
    console.log("Leave Allocations Data:", response.data.data);

    const rows = (response?.data?.data ?? []) as any[];
    return normalizeAllocations(rows);
  } catch (error: any) {
    const server = error?.response?.data;
    console.warn('Leave Allocation attempt 1 failed', server || error.message);

    // Attempt 2: Resource endpoint with dict-style filters, no explicit fields
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
              // Avoid non-permitted fields like leaves_allocated
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
