import { 
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, 
  Platform, Keyboard, TouchableWithoutFeedback, ScrollView, Alert 
} from 'react-native';
import React, { memo, useRef, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../components/CustomInput';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE, COMPANY_NAME } from '@env';
import CountryPicker from 'react-native-country-picker-modal';

const registerSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  dob: yup.string().required('Date of Birth is required'),
  gender: yup.string().required('Gender is required'),
});


const BottomSection = memo(({ onLogin }) => (
  <View style={styles.bottomContainer}>
    <Text style={styles.bottomText}>Already have an account? </Text>
    <TouchableOpacity onPress={onLogin} activeOpacity={0.7}>
      <Text style={styles.registerText}>Sign In</Text>
    </TouchableOpacity>
  </View>
));

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [countryCode, setCountryCode] = useState('AE'); 
  const [callingCode, setCallingCode] = useState('971'); 
  const [generatedEmail, setGeneratedEmail] = useState('');
  const scrollViewRef = useRef(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
  } = useForm({
    resolver: yupResolver(registerSchema),
    mode: 'onChange',
defaultValues: {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  dob: '',
  gender: '',
},
  });

  const firstName = watch('firstName');

  const onSelectCountry = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

const onSubmit = async (data) => {
  try {
    const email = data.email.toLowerCase();
    console.log('Entered Email:', email);
    const headers = {
      Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}`,
      'Content-Type': 'application/json',
    };
    let userExists = false;
    let userName = '';
    try {
      const userCheckResponse = await axios.get(`${ERP_URL_RESOURCE}/User/${email}`, { headers });
      if (userCheckResponse.data && userCheckResponse.data.data) {
        userExists = true;
        userName = userCheckResponse.data.data.name;
      }
    } catch (err) {
      if (err.response?.status !== 404) throw err;
    }
    if (userExists) {
      const updatePayload = {
        mobile_no: data.phoneNumber,
        cell_number: data.phoneNumber,
      };
      await axios.put(`${ERP_URL_RESOURCE}/User/${userName}`, updatePayload, { headers });
      console.log('User updated with new number:', updatePayload);
    } else {
      const createPayload = {
        email,
        first_name: data.firstName,
        last_name: data.lastName,
        enabled: 1,
        mobile_no: data.phoneNumber,
        cell_number: data.phoneNumber,
        send_welcome_email: 0,
      };
      await axios.post(`${ERP_URL_RESOURCE}/User`, createPayload, { headers });
      console.log('User created:', createPayload);
    }

    Alert.alert('Success', 'User registered or updated successfully!');
    navigation.navigate('Dashboard');

  } catch (error) {
    console.error('ERPNext Registration Error:', error.response?.data || error.message);
    Alert.alert('Error', 'Registration failed. Please check your details or try again later.');
  }
};

  const handleLogin = () => navigation.navigate('Login');

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <View style={styles.hrLogoBox}>
            <Ionicons name="business-outline" size={36} color="#030213" />
          </View>
          <Text style={styles.appName}>ADDON-S HR</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>
      </View>

      <View style={styles.whiteContainer}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
   keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
                     automaticallyAdjustKeyboardInsets={true}
            >
              <View style={styles.formContainer}>
                {/* First Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <CustomInput
                        placeholder="Enter your first name"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        iconName="person-outline"
                        error={errors.firstName}
                      />
                    )}
                  />
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                </View>

                {/* Last Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <CustomInput
                        placeholder="Enter your last name"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        iconName="person-outline"
                        error={errors.lastName}
                      />
                    )}
                  />
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
                </View>

                {/* Email (Auto-Generated) */}
                       <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email</Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <CustomInput
                        placeholder="Enter your email"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        iconName="mail-outline"
                        error={errors.email}
                      />
                    )}
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                </View>

{/* Date of Birth */}
<View style={styles.fieldContainer}>
  <Text style={styles.label}>Date of Birth</Text>
  <Controller
    control={control}
    name="dob"
    render={({ field: { onChange, value } }) => (
      <TouchableOpacity
        style={styles.datePicker}
        onPress={async () => {
          try {
            const { action, year, month, day } = await import('react-native').then(({ DatePickerAndroid }) =>
              DatePickerAndroid.open({
                mode: 'spinner',
                date: new Date(),
              })
            );
            if (action !== DatePickerAndroid.dismissedAction) {
              const selectedDate = `${day}/${month + 1}/${year}`;
              onChange(selectedDate);
            }
          } catch {
            console.log('Date Picker cancelled');
          }
        }}
      >
        <Ionicons name="calendar-outline" size={20} color="#666" style={{ marginRight: 10 }} />
        <Text style={{ color: value ? '#000' : '#999' }}>
          {value ? value : 'Select your date of birth'}
        </Text>
      </TouchableOpacity>
    )}
  />
  {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}
</View>

{/* Gender */}
<View style={styles.fieldContainer}>
  <Text style={styles.label}>Gender</Text>
  <Controller
    control={control}
    name="gender"
    render={({ field: { onChange, value } }) => (
      <View style={styles.genderContainer}>
        {['Male', 'Female', 'Other'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.genderButton,
              value === option && styles.genderSelected,
            ]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.genderText,
                value === option && styles.genderTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  />
  {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}
</View>
                {/* Phone Number */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Phone Number</Text>
                  <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CountryPicker
                          countryCode={countryCode}
                          withFilter
                          withFlag
                          withCallingCode
                          withAlphaFilter
                          onSelect={onSelectCountry}
                          containerButtonStyle={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <CustomInput
                            placeholder="Enter your phone number"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            iconName="call-outline"
                            keyboardType="phone-pad"
                            error={errors.phoneNumber}
                          />
                        </View>
                      </View>
                    )}
                  />
                  {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.signInButton, (!isValid || !isDirty) && styles.buttonDisabled]}
                  onPress={handleSubmit(onSubmit)}
                  activeOpacity={0.8}
                  disabled={!isValid || !isDirty}
                >
                  <Text style={styles.signInButtonText}>Create Account</Text>
                </TouchableOpacity>

                <BottomSection onLogin={handleLogin} />
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

export default RegisterScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030213',
  },
  headerSection: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  hrLogoBox: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '400',
  },
  whiteContainer: {
    flex: 0.7,
    backgroundColor: '#fff',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formContainer: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  optionalText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  signInButton: {
    backgroundColor: '#030213',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
  },
  registerText: {
    fontSize: 14,
    color: '#030213',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  datePicker: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#fff',
},

genderContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 8,
},

genderButton: {
  flex: 1,
  marginHorizontal: 4,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  alignItems: 'center',
  backgroundColor: '#fff',
},

genderSelected: {
  backgroundColor: '#007bff20',
  borderColor: '#007bff',
},

genderText: {
  color: '#000',
  fontSize: 14,
},

genderTextSelected: {
  color: '#007bff',
  fontWeight: '600',
},

});