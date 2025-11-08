// Central config: values are generated from .env into config.env.ts
// Do NOT commit real secrets to source control.

import * as Env from './config.env';

// ERPNext API authentication using API Key/Secret.
// Header format: Authorization: token <api_key>:<api_secret>
export const ERP_API_KEY = Env.ERP_API_KEY || '';
export const ERP_API_SECRET = Env.ERP_API_SECRET || '';

// Optional: set a device label to help identify the source of logs in ERPNext.
export const ERP_DEVICE_ID = Env.ERP_DEVICE_ID || 'rn-mobile';

// Optional: direct URLs to ERPNext API endpoints.
export const ERP_URL_RESOURCE = Env.ERP_URL_RESOURCE || '';
export const ERP_URL_METHOD = Env.ERP_URL_METHOD || '';

// Backward-compatibility placeholders (not sourced from .env by default)
export const ERP_BASE_URL = '';
export const ERP_EMPLOYEE_ID = '';

// Mocking options
function bool(v?: string) {
  if (!v) return false;
  const x = v.toString().trim().toLowerCase();
  return x === '1' || x === 'true' || x === 'yes' || x === 'on';
}
export const MOCK_RECENT_HISTORY = bool((Env as any).MOCK_RECENT_HISTORY);
export const MOCK_RECENT_HISTORY_DAYS = Number((Env as any).MOCK_RECENT_HISTORY_DAYS || 7);
