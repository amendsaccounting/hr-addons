import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, Alert } from 'react-native';
import DatePicker from 'react-native-date-picker';
import CountryPicker, { Country, CountryCode, Flag } from 'react-native-country-picker-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  onLogin?: () => void;
};


export default function RegisterScreen({ onLogin }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    dateOfJoining: '',
    email: '',
    countryCode: '+971',
    phoneNumber: '',
  });

  const setField = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [dojDate, setDojDate] = useState<Date | null>(null);
  const [showDOB, setShowDOB] = useState(false);
  const [showDOJ, setShowDOJ] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryIso, setCountryIso] = useState<CountryCode>('AE');

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const openPicker = (which: 'dob' | 'doj') => {
    if (which === 'dob') setShowDOB(true); else setShowDOJ(true);
  };

  const submit = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      Alert.alert('Missing info', 'Please fill name and email');
      return;
    }
    Alert.alert('Register', 'Submitted (UI only)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Ionicons name="business-outline" size={56} color="#fff" style={styles.hrIcon} />
        <Text style={styles.appName}>Create Account</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput value={form.firstName} onChangeText={(t) => setField('firstName', t)} placeholder="John" style={styles.input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput value={form.lastName} onChangeText={(t) => setField('lastName', t)} placeholder="Doe" style={styles.input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity key={g} onPress={() => setField('gender', g)} style={[styles.genderButton, form.gender === g && styles.genderButtonSelected]}>
                    <Text style={[styles.genderText, form.gender === g && styles.genderTextSelected]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity onPress={() => openPicker('dob')} style={[styles.input, styles.pickerInput]}>
                <Text style={[styles.pickerText, { color: form.dob ? '#111827' : '#9ca3af' }]}>
                  {form.dob || 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Joining</Text>
              <TouchableOpacity onPress={() => openPicker('doj')} style={[styles.input, styles.pickerInput]}>
                <Text style={[styles.pickerText, { color: form.dateOfJoining ? '#111827' : '#9ca3af' }]}>
                  {form.dateOfJoining || 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput value={form.email} onChangeText={(t) => setField('email', t)} placeholder="name@company.com" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity onPress={() => setShowCountryPicker(true)} style={[styles.input, { width: 100, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 6 }]}>
                  <Text style={styles.codeText}>{form.countryCode}</Text>
                  <View style={styles.codeRight}>
                    <Flag countryCode={countryIso} flagSize={16} withEmoji={false} />
                    <Text style={styles.arrow}>▾</Text>
                  </View>
                </TouchableOpacity>
                <TextInput
                  value={form.phoneNumber}
                  onChangeText={(t) => setField('phoneNumber', t)}
                  style={[styles.input, { flex: 1, marginBottom: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                  placeholder="501234567"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.registerButton} onPress={submit}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={{ color: '#666' }}>
                Already have an account?{' '}
                <Text style={{ color: '#007AFF', fontWeight: '600' }} onPress={onLogin}>Login</Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Date pickers using react-native-date-picker (modal) */}
        <DatePicker
          modal
          open={showDOB}
          date={dobDate || new Date(1990, 0, 1)}
          mode="date"
          maximumDate={new Date()}
          onConfirm={(d) => { setShowDOB(false); setDobDate(d); setField('dob', formatDate(d)); }}
          onCancel={() => setShowDOB(false)}
        />
        <DatePicker
          modal
          open={showDOJ}
          date={dojDate || new Date()}
          mode="date"
          minimumDate={dobDate || undefined}
          maximumDate={new Date()}
          onConfirm={(d) => { setShowDOJ(false); setDojDate(d); setField('dateOfJoining', formatDate(d)); }}
          onCancel={() => setShowDOJ(false)}
        />

        {/* Country picker modal (native) */}
        <CountryPicker
          countryCode={countryIso}
          withFilter
          withFlag
          withCallingCode
          withFlagButton={false}
          withModal={true}
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
          onSelect={(c: Country) => {
            setCountryIso(c.cca2 as CountryCode);
            const dial = c.callingCode && c.callingCode.length > 0 ? `+${c.callingCode[0]}` : form.countryCode;
            setField('countryCode', dial);
            setShowCountryPicker(false);
          }}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerSection: { backgroundColor: '#000', paddingTop: 48, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrapper: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, display: 'none' as any },
  hrIcon: { marginBottom: 12 },
  appName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#f9f9f9', color: '#333', ...(Platform.OS === 'android' ? { textAlignVertical: 'center' } as any : {}) },
  pickerInput: { justifyContent: 'center' },
  pickerText: { fontSize: 16, ...(Platform.OS === 'android' ? { includeFontPadding: false } as any : {}) },
  codeText: { fontSize: 16, color: '#333', ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20 } as any : {}) },
  codeRight: { flexDirection: 'row', alignItems: 'center' },
  arrow: { color: '#666', marginLeft: 6, ...(Platform.OS === 'android' ? { includeFontPadding: false, lineHeight: 18 } as any : {}) },
  phoneInputContainer: { flexDirection: 'row' },
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  genderButton: { flex: 1, height: 48, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, backgroundColor: '#f9f9f9' },
  genderButtonSelected: { backgroundColor: '#0b0b1b', borderColor: '#0b0b1b' },
  genderText: { fontSize: 16, color: '#666', fontWeight: '500' },
  genderTextSelected: { color: '#fff', fontWeight: '700' },
  registerButton: { height: 52, backgroundColor: '#0b0b1b', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 5, elevation: 8 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});

// Country picker handled by react-native-country-picker-modal
