// services/timesheetApi.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ERP_URL_RESOURCE = 'https://addonsajith.frappe.cloud/api/resource';

export const getTimesheets = async (offset: number = 0, limit: number = 15) => {
  const employeeId = await AsyncStorage.getItem('employeeId');
  const response = await axios.get(
    `${ERP_URL_RESOURCE}/Timesheet`,
    {
      params: {
        filters: JSON.stringify([["employee", "=", employeeId]]),
        limit_start: offset,
        limit_page_length: limit,
      },
    }
  );
  try {
    console.log('[timesheetService] getTimesheets response', {
      status: response.status,
      offset,
      limit,
      count: Array.isArray(response?.data?.data) ? response.data.data.length : undefined,
    });
  } catch {}
  return response.data.data; // Array of timesheets
};

export const createTimesheet = async (timesheet: any) => {
  const response = await axios.post(`${ERP_URL_RESOURCE}/Timesheet`, timesheet);
  try {
    console.log('[timesheetService] createTimesheet payload', timesheet);
    console.log('[timesheetService] createTimesheet response', {
      status: response.status,
      data: response?.data,
    });
  } catch {}
  return response.data;
};

export const updateTimesheet = async (name: string, timesheet: any) => {
  const response = await axios.put(`${ERP_URL_RESOURCE}/Timesheet/${name}`, timesheet);
  try {
    console.log('[timesheetService] updateTimesheet payload', { name, timesheet });
    console.log('[timesheetService] updateTimesheet response', {
      status: response.status,
      data: response?.data,
    });
  } catch {}
  return response.data;
};

export const getTimesheet = async (name: string) => {
  const response = await axios.get(`${ERP_URL_RESOURCE}/Timesheet/${name}`);
  try {
    console.log('[timesheetService] getTimesheet response', {
      status: response.status,
      name,
      hasData: !!response?.data?.data,
    });
  } catch {}
  return response.data?.data;
};
