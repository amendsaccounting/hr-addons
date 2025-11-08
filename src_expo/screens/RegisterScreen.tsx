import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import CountryPicker from 'react-native-country-picker-modal';
import { validateRegisterForm,RegisterFormData } from '../utils/validation';
import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE, COMPANY_NAME } from '@env';
import {getUserByEmail,updateUser, createUser, createEmployee} from '../services/erpApi'
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const navigation=useNavigation()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    dateOfJoining: '',
    email: '',
    phoneNumber: '',
    countryCode: '+971',
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    dateOfJoining: '',
    email: '',
    phoneNumber: '',
  });
  const [selectedGender, setSelectedGender] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showJoiningDatePicker, setShowJoiningDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [joiningDate, setJoiningDate] = useState(new Date());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryCode, setCountryCode] = useState('AE');

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('en-GB');
      handleInputChange('dob', formattedDate);
    }
  };

    const handleJoiningDateChange = (event, selectedDate) => {
    setShowJoiningDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setJoiningDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('en-GB');
      handleInputChange('dateOfJoining', formattedDate);
    }
  }

  const onSelectCountry = (country) => {
    setCountryCode(country.cca2);
    handleInputChange('countryCode', `+${country.callingCode[0]}`);
  };

const convertToYYYYMMDD = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return '';
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const handleRegister = async () => {
  try {
    const { isValid, newErrors } = validateRegisterForm(formData as RegisterFormData);
    setErrors(newErrors);
    if (!isValid) {
      console.log('Form validation failed');
      return;
    }
    // Step 2: Prepare formatted data
    const formattedDOB = convertToYYYYMMDD(formData.dob);
    const formattedJoiningDate = convertToYYYYMMDD(formData.dateOfJoining);
    const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
    // Step 3: Check if user already exists in ERPNext
    const existingUser = await getUserByEmail(formData.email);
    if (existingUser) {
      console.log('User exists, updating phone number...'); 
      const updateResponse = await updateUser(formData.email, {
        phone: fullPhoneNumber,
      });
      if (updateResponse) {
        alert('User phone number updated successfully!');
        navigation.navigate("Dashboard");
      } else {
        alert('Failed to update user. Please try again.');
      }
    } else {
      console.log('User not found, creating a new user...');
      // Step 4: Create new user
      const userResponse = await createUser({
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        date_of_birth: formattedDOB,
        phone: fullPhoneNumber,
      });
console.log("userResponse====>",userResponse)
      if (!userResponse) {
        alert('Failed to create user.');
        return;
      }
      console.log('User created successfully.');
      const employeeResponse = await createEmployee({
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        date_of_birth: formattedDOB,
        date_of_joining: formattedJoiningDate,
        company: COMPANY_NAME,
        user_id: formData.email,
        personal_email: formData.email,
        cell_number: fullPhoneNumber,
      });
console.log("employeeResponse====>",employeeResponse)
      if (employeeResponse) {
        alert('User and Employee created successfully!');
        navigation.navigate("Dashboard");
      } else {
        alert('Failed to create employee record.');
      }
    }
  } catch (error) {
    console.error('ERPNext Registration Error:', error);
    alert('Something went wrong during registration. Please try again.');
  }
};

const handleLogin=()=>{
  navigation.navigate("Login")
}

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.iconWrapper}>
          <Ionicons name="business-outline" size={36} color="#000" />
        </View>
        <Text style={styles.appName}>Addon-s HR</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.formSection}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            {/* First Name */}
              <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                placeholder="Enter your first name"
                value={formData.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                placeholderTextColor="#999"
              />
              {errors.firstName ? (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              ) : null}
            </View>

              <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                placeholder="Enter your last name"
                value={formData.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                placeholderTextColor="#999"
              />
              {errors.lastName ? (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              ) : null}
            </View>

     <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      selectedGender === gender && styles.genderButtonSelected,
                      errors.gender && styles.genderButtonError,
                    ]}
                    onPress={() => {
                      setSelectedGender(gender);
                      handleInputChange('gender', gender);
                    }}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        selectedGender === gender && styles.genderTextSelected,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender ? (
                <Text style={styles.errorText}>{errors.gender}</Text>
              ) : null}
            </View>

       <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.inputWithIcon, errors.dob && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#666"
                  style={styles.leftIcon}
                />
                <TextInput
                  style={styles.inputWithLeftIcon}
                  placeholder="DD/MM/YYYY"
                  value={formData.dob}
                  placeholderTextColor="#999"
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              {errors.dob ? (
                <Text style={styles.errorText}>{errors.dob}</Text>
              ) : null}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

     <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Joining</Text>
              <TouchableOpacity
                style={[styles.inputWithIcon, errors.dateOfJoining && styles.inputError]}
                onPress={() => setShowJoiningDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#666"
                  style={styles.leftIcon}
                />
                <TextInput
                  style={styles.inputWithLeftIcon}
                  placeholder="DD/MM/YYYY"
                  value={formData.dateOfJoining}
                  placeholderTextColor="#999"
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              {errors.dateOfJoining ? (
                <Text style={styles.errorText}>{errors.dateOfJoining}</Text>
              ) : null}
            </View>

                {showJoiningDatePicker && (
              <DateTimePicker
                value={joiningDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleJoiningDateChange}
                maximumDate={new Date()}
              />
            )}

                <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>
     <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.phoneInputContainer, errors.phoneNumber && styles.inputError]}>
                <TouchableOpacity
                  style={styles.countryCodeButton}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <CountryPicker
                    countryCode={countryCode}
                    withFilter
                    withFlag
                    withCallingCode
                    withEmoji
                    onSelect={onSelectCountry}
                    visible={showCountryPicker}
                    onClose={() => setShowCountryPicker(false)}
                    containerButtonStyle={styles.countryPickerButton}
                  />
                  <Text style={styles.countryCodeText}>{formData.countryCode}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter your phone number"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleInputChange('phoneNumber', text)}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phoneNumber ? (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
backgroundColor: '#fff', 
  },
  headerSection: {
    backgroundColor: '#000',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  // White Form Section
  formSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
      paddingBottom: 0
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  // Date Picker Input
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  leftIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  inputWithLeftIcon: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  // Phone Input
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  countryPickerButton: {
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  // Gender Buttons
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#f9f9f9',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Register Button
  registerButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default RegisterScreen;