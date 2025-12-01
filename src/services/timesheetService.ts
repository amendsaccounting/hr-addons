// services/timesheetApi.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ERP_URL_RESOURCE = 'https://addonsajith.frappe.cloud/api/resource';

export const getTimesheets = async () => {
  const employeeId = await AsyncStorage.getItem('employeeId');
  const response = await axios.get(
    `${ERP_URL_RESOURCE}/Timesheet`,
    { params: { filters: JSON.stringify([["employee", "=", employeeId]]) } }
  );
  return response.data.data; // Array of timesheets
};

export const createTimesheet = async (timesheet: any) => {
  const response = await axios.post(`${ERP_URL_RESOURCE}/Timesheet`, timesheet);
  return response.data;
};

export const updateTimesheet = async (name: string, timesheet: any) => {
  const response = await axios.put(`${ERP_URL_RESOURCE}/Timesheet/${name}`, timesheet);
  return response.data;
};
