import { ERP_API_KEY, ERP_API_SECRET, ERP_BASE_URL, ERP_DEVICE_ID, ERP_URL_RESOURCE, ERP_EMPLOYEE_ID, ERP_URL_METHOD } from '../config';

export type LogType = 'IN' | 'OUT';

function requireConfig() {
  if (!ERP_API_KEY || !ERP_API_SECRET) {
    throw new Error('ERP API key/secret are not configured');
  }
  if (!ERP_URL_RESOURCE && !ERP_BASE_URL) {
    throw new Error('Provide ERP_URL_RESOURCE or ERP_BASE_URL');
  }
}

export function formatDateTimeForERP(d: Date) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function authHeader() {
  return `token ${ERP_API_KEY}:${ERP_API_SECRET}`;
}

export async function postEmployeeCheckin(logType: LogType, time: Date, opts?: { deviceId?: string; employeeId?: string }) {
  requireConfig();
  const resourceBase = ERP_URL_RESOURCE && ERP_URL_RESOURCE.trim().length > 0
    ? ERP_URL_RESOURCE
    : `${ERP_BASE_URL.replace(/\/$/, '')}/api/resource`;
  const url = `${resourceBase.replace(/\/$/, '')}/Employee%20Checkin`;
  const payload: any = {
    log_type: logType,
    time: formatDateTimeForERP(time),
  };
  const employee = opts?.employeeId || ERP_EMPLOYEE_ID;
  if (employee) payload.employee = employee;
  if (opts?.deviceId || ERP_DEVICE_ID) payload.device_id = opts?.deviceId ?? ERP_DEVICE_ID;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && (j.exception || j.exc_type || j._server_messages || j.message)) {
        msg = j.message || j.exception || j.exc_type || j._server_messages || msg;
      }
    } catch {}
    throw new Error(`ERPNext check-in failed: ${msg}`);
  }

  return res.json();
}

export type EmployeeCheckin = {
  name: string;
  employee?: string;
  log_type: LogType;
  time: string; // ERP returns string
};

export async function fetchEmployeeCheckins(params: {
  employeeId?: string;
  from: Date; // inclusive
  to: Date; // exclusive
  limit?: number;
}) {
  requireConfig();
  const resourceBase = ERP_URL_RESOURCE && ERP_URL_RESOURCE.trim().length > 0
    ? ERP_URL_RESOURCE
    : `${ERP_BASE_URL.replace(/\/$/, '')}/api/resource`;

  const fields = encodeURIComponent(JSON.stringify(['name', 'employee', 'log_type', 'time']));
  const filters: any[] = [
    ['time', '>=', formatDateTimeForERP(params.from)],
    ['time', '<', formatDateTimeForERP(params.to)],
  ];
  if (params.employeeId) filters.unshift(['employee', '=', params.employeeId]);
  const filtersStr = encodeURIComponent(JSON.stringify(filters));
  const orderBy = encodeURIComponent('time asc');
  const limit = params.limit ?? 1000;

  const url = `${resourceBase.replace(/\/$/, '')}/Employee%20Checkin?fields=${fields}&filters=${filtersStr}&order_by=${orderBy}&limit_page_length=${limit}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authHeader(),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {}
    throw new Error(`ERPNext fetch checkins failed: ${msg}`);
  }
  const data = await res.json();
  // ERPNext returns { data: [...] }
  return (data?.data ?? []) as EmployeeCheckin[];
}

// Password login for ERPNext (verifies user credentials).
// Uses /api/method/login with form-encoded body (usr, pwd).
export async function loginWithPassword(username: string, password: string) {
  const methodBase = (ERP_URL_METHOD && ERP_URL_METHOD.trim().length > 0)
    ? ERP_URL_METHOD
    : (ERP_BASE_URL ? `${ERP_BASE_URL.replace(/\/$/, '')}/api/method` : '');
  if (!methodBase) throw new Error('ERP_URL_METHOD or ERP_BASE_URL must be set for login');

  const url = `${methodBase.replace(/\/$/, '')}/login`;
  const form = new URLSearchParams();
  form.append('usr', username);
  form.append('pwd', password);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && (j.message || j.exc || j.exception)) msg = j.message || j.exc || j.exception;
    } catch {}
    throw new Error(msg);
  }
  try {
    return await res.json();
  } catch {
    return { ok: true } as any;
  }
}
