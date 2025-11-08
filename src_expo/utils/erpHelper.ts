import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE } from '@env';

// export const postAttendance = async (employee: string, clockType: 'IN' | 'OUT', time: string, date: string, location: string) => {
//   try {
//     const response = await fetch(`${ERP_URL_RESOURCE}/Employee Checkin`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `token ${ERP_APIKEY}:${ERP_SECRET}`,
//       },
//       body: JSON.stringify({
//         employee,
//         log_type: clockType,
//         time,
//         date,
//         location,
//       }),
//     });

//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error('ERP Attendance Error:', error);
//     throw error;
//   }
// };

export const postAttendance = async (
  employee: string,
  clockType: 'IN' | 'OUT',
  time: string,
  date: string,
  location: string
) => {
  try {
    const response = await fetch(`${ERP_URL_RESOURCE}/Employee Checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${ERP_APIKEY}:${ERP_SECRET}`,
      },
      body: JSON.stringify({
        employee,
        log_type: clockType,
        time,
        date,
        device_id: location, // <-- use the correct fieldname
      }),
    });

    const data = await response.json();
    console.log('ERPNext Response:', data); 
    return data;
  } catch (error) {
    console.error('ERP Attendance Error:', error);
    throw error;
  }
}