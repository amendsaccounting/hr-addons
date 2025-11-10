import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, Alert } from 'react-native';

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

  const submit = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      Alert.alert('Missing info', 'Please fill name and email');
      return;
    }
    Alert.alert('Register', 'Submitted (UI only for now)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.iconWrapper}><Text style={{ fontSize: 24 }}>👤</Text></View>
        <Text style={styles.appName}>Create Account</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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
              <Text style={styles.label}>Date of Birth (DD/MM/YYYY)</Text>
              <TextInput value={form.dob} onChangeText={(t) => setField('dob', t)} placeholder="01/01/2000" style={styles.input} keyboardType="numbers-and-punctuation" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Joining (DD/MM/YYYY)</Text>
              <TextInput value={form.dateOfJoining} onChangeText={(t) => setField('dateOfJoining', t)} placeholder="01/10/2025" style={styles.input} keyboardType="numbers-and-punctuation" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput value={form.email} onChangeText={(t) => setField('email', t)} placeholder="name@company.com" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput value={form.countryCode} onChangeText={(t) => setField('countryCode', t)} style={[styles.input, { width: 90, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} />
                <TextInput value={form.phoneNumber} onChangeText={(t) => setField('phoneNumber', t)} style={[styles.input, { flex: 1, marginBottom: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]} placeholder="501234567" keyboardType="phone-pad" />
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerSection: { backgroundColor: '#000', paddingTop: 48, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrapper: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#f9f9f9', color: '#333' },
  phoneInputContainer: { flexDirection: 'row' },
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  genderButton: { flex: 1, height: 48, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, backgroundColor: '#f9f9f9' },
  genderButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  genderText: { fontSize: 16, color: '#666', fontWeight: '500' },
  genderTextSelected: { color: '#fff', fontWeight: '600' },
  registerButton: { height: 52, backgroundColor: '#007AFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 24, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
