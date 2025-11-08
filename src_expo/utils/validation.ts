// utils/validation.ts

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  dateOfJoining: string;
  email: string;
  phoneNumber: string;
  countryCode?: string; 
}

export interface RegisterFormErrors {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dob?: string;
  dateOfJoining?: string;
  email?: string;
  phoneNumber?: string;
}

export interface ValidationResult {
  isValid: boolean;
  newErrors: RegisterFormErrors;
}

export const validateRegisterForm = (formData: RegisterFormData): ValidationResult => {
  const newErrors: RegisterFormErrors = {};
  let isValid = true;

  // First Name
  if (!formData.firstName.trim()) {
    newErrors.firstName = 'First name is required';
    isValid = false;
  } else if (formData.firstName.trim().length < 2) {
    newErrors.firstName = 'First name must be at least 2 characters';
    isValid = false;
  } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
    newErrors.firstName = 'First name should contain only letters';
    isValid = false;
  }

  // Last Name
  if (!formData.lastName.trim()) {
    newErrors.lastName = 'Last name is required';
    isValid = false;
  } else if (formData.lastName.trim().length < 2) {
    newErrors.lastName = 'Last name must be at least 2 characters';
    isValid = false;
  } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
    newErrors.lastName = 'Last name should contain only letters';
    isValid = false;
  }

  // Gender
  if (!formData.gender) {
    newErrors.gender = 'Please select your gender';
    isValid = false;
  }

  // Date of Birth
  if (!formData.dob) {
    newErrors.dob = 'Date of birth is required';
    isValid = false;
  } else {
    const dobDate = new Date(formData.dob.split('/').reverse().join('-'));
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 18) {
      newErrors.dob = 'You must be at least 18 years old';
      isValid = false;
    }
  }

  // Date of Joining
  if (!formData.dateOfJoining) {
    newErrors.dateOfJoining = 'Date of joining is required';
    isValid = false;
  } else {
    const joiningDate = new Date(formData.dateOfJoining.split('/').reverse().join('-'));
    const today = new Date();
    
    // Check if joining date is in the future
    if (joiningDate > today) {
      newErrors.dateOfJoining = 'Date of joining cannot be in the future';
      isValid = false;
    }
    
    // Check if DOB exists and validate that joining date is after DOB
    if (formData.dob) {
      const dobDate = new Date(formData.dob.split('/').reverse().join('-'));
      
      // Calculate age at joining date
      let ageAtJoining = joiningDate.getFullYear() - dobDate.getFullYear();
      const monthDiff = joiningDate.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && joiningDate.getDate() < dobDate.getDate())) {
        ageAtJoining--;
      }
      
      // Check if person was at least 18 years old at joining date
      if (ageAtJoining < 18) {
        newErrors.dateOfJoining = 'Employee must be at least 18 years old at joining date';
        isValid = false;
      }
      
      // Check if joining date is before DOB (basic validation)
      if (joiningDate < dobDate) {
        newErrors.dateOfJoining = 'Date of joining cannot be before date of birth';
        isValid = false;
      }
    }
  }

  // Email
  if (!formData.email.trim()) {
    newErrors.email = 'Email is required';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    newErrors.email = 'Please enter a valid email address';
    isValid = false;
  }

  // Phone Number
  if (!formData.phoneNumber.trim()) {
    newErrors.phoneNumber = 'Phone number is required';
    isValid = false;
  } else if (!/^\d{7,15}$/.test(formData.phoneNumber.trim())) {
    newErrors.phoneNumber = 'Phone number must be 7-15 digits';
    isValid = false;
  }

  return { isValid, newErrors };
};