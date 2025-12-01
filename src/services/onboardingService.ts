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

function headers() {
  return { Authorization: `token ${API_KEY}:${API_SECRET}`, 'Content-Type': 'application/json' } as Record<string, string>;
}

export type CompanyPayload = {
  company_name: string;
  company_url: string;
};

export type CompanyDoc = {
  name: string;
  company_name: string;
  company_url?: string | null;
};

// Utility to get full URL for methods/resources
function getFullUrl(path: string) {
  if (path.startsWith('http')) return path;
  return BASE_URL + '/' + path.replace(/^\/+/, '');
}

export const onboardingService = {
  getCompanyByName: async (name: string): Promise<CompanyDoc | null> => {
    try {
      const res = await axios.get(`${BASE_URL}/Company/${encodeURIComponent(name)}`, { headers: headers() });
      return res?.data?.data ?? null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Create a new company
   */
  createCompany: async (payload: CompanyPayload): Promise<CompanyDoc> => {
    const res = await axios.post(`${BASE_URL}/Company`, payload, { headers: headers() });
    return res?.data?.data;
  },

  /**
   * Update an existing company
   */
  updateCompany: async (companyId: string, payload: CompanyPayload): Promise<CompanyDoc> => {
    const res = await axios.put(`${BASE_URL}/Company/${encodeURIComponent(companyId)}`, payload, { headers: headers() });
    return res?.data?.data;
  },

  /**
   * Check if employee has a company already
   * Returns company ID if exists
   */
  getEmployeeCompany: async (employeeId: string): Promise<string | null> => {
    try {
      const res = await axios.get(`${BASE_URL}/Employee/${encodeURIComponent(employeeId)}`, { headers: headers() });
      const company = res?.data?.data?.company ?? null;
      return company;
    } catch (e) {
      return null;
    }
  },
};
