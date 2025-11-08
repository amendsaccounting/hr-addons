import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE } from '@env';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `token ${ERP_APIKEY}:${ERP_SECRET}`,
};

// ✅ Check if a user exists by email
export const getUserByEmail = async (email) => {
  try {
    const response = await fetch(
      `${ERP_URL_RESOURCE}/User?filters=[["email","=","${email}"]]`,
      { headers }
    );
    const data = await response.json();
       console.log("getUserByEmail===>",data);
    return data?.data?.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
};

// ✅ Create a new user
export const createUser = async (userData) => {
  try {
    const response = await fetch(`${ERP_URL_RESOURCE}/User`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    console.log("createUser=====>",data);
    if (data?.data) return data.data;
    console.log('Create user error:', data);
    return null;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

// ✅ Update user by email
export const updateUser = async (email, updatedFields) => {
  try {
    const response = await fetch(`${ERP_URL_RESOURCE}/User/${email}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedFields),
    });
    const data = await response.json();
    console.log("updateUser======>",data)
    if (data?.data) return data.data;
    console.log('Update user error:', data);
    return null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};

// ✅ Create a new employee
export const createEmployee = async (employeeData) => {
  try {
    const response = await fetch(`${ERP_URL_RESOURCE}/Employee`, {
      method: 'POST',
      headers,
      body: JSON.stringify(employeeData),
    });
    const data = await response.json();
    console.log("employ====>",data);
    if (data?.data) return data.data;
    console.log('Create employee error:', data);
    return null;
  } catch (error) {
    console.error('Error creating employee:', error);
    return null;
  }
};
