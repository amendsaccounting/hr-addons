import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TextInput, Pressable, StyleProp, ViewStyle, KeyboardAvoidingView, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateEmail } from '../../utils/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByEmail, getEmployeeByEmail } from '../../services/erpApi'


type Props = {
  onSignedIn?: () => void;
  onRegister?: () => void;
};

export default function LoginScreen({ onSignedIn, onRegister }: Props) {
  const insets = useSafeAreaInsets();
  let LinearGradientComp: any = null;
  try { LinearGradientComp = require('react-native-linear-gradient').default; } catch {}
  let IoniconsComp: any = null;
  try { IoniconsComp = require('react-native-vector-icons/Ionicons').default; } catch {}
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // KeyboardAvoidingView will handle shifting content to avoid the keyboard

  const onContinue = async () => {
  if (loading) return;
  const err = validateEmail(email);
  if (err) { 
    setEmailError(err); 
    return; 
  }
  setLoading(true);
  try {
    const user = await getUserByEmail(email.trim());
    console.log("user===>",user);
    
    if (!user) {
      Alert.alert('Not Found', 'Email does not exist.');
      return;
    }
    await AsyncStorage.setItem('userEmail', user.email);
    const employee = await getEmployeeByEmail(user.email);
    console.log("employee===>",employee);
    if (employee) {
      await AsyncStorage.setItem('employeeId', employee.name);
    }
    onSignedIn && onSignedIn();
  } catch (error) {
    console.log('Login error:', error);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0f1e" />
      {LinearGradientComp ? (
        <LinearGradientComp colors={["#0c0f1e", "#0e1429", "#0c0f1e"]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0c0f1e' }]} />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.logoBox}>
            {IoniconsComp ? (<IoniconsComp name="business-outline" size={24} color="#030213" />) : (<Text style={{ fontSize: 24 }}>🏢</Text>)}
          </View>
          <Text style={styles.appName}>ADDON-S HR</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>

        <View style={[
          styles.whiteSection,
          { paddingBottom: 16 + insets.bottom } as StyleProp<ViewStyle>,
        ]}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            {IoniconsComp ? (
              <IoniconsComp name="mail-outline" size={16} color="#6b7280" style={styles.leftIcon} />
            ) : (
              <Text style={styles.leftIcon}>📧</Text>
            )}
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(null); }}
              onBlur={() => setEmailError(validateEmail(email))}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType={Platform.OS === 'ios' ? 'email-address' : 'email-address'}
              autoComplete="email"
              style={styles.input}
              returnKeyType="done"
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <Pressable onPress={onContinue} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.primaryBtnText}>{loading ? 'Please wait…' : 'Continue'}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.or}>OR</Text>
            <View style={styles.line} />
          </View>

          <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.95 }]}>
            <Text style={{ marginRight: 8 }}>📷</Text>
            <Text style={styles.secondaryText}>Mark Attendance with Face</Text>
          </Pressable>

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: '#6b7280' }}>Don't have an account? <Text onPress={onRegister} style={styles.link}>Register</Text></Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  appName: { color: '#E5E7EB', fontWeight: '700', marginTop: 10 },
  tagline: { color: '#cbd5e1', marginTop: 4 },
  header: { alignItems: 'center', position: 'relative', zIndex: 2, elevation: 6 },
  whiteSection: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, zIndex: 1, elevation: 0, justifyContent: 'flex-end', minHeight: 140 },
  label: { color: '#111827', fontWeight: '600', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f9fafb', height: 44 },
  leftIcon: { marginLeft: 12, marginRight: 6, color: '#6b7280' },
  input: { flex: 1, paddingHorizontal: 8, color: '#111827' },
  errorText: { color: '#ef4444', marginTop: 6 },
  primaryBtn: { marginTop: 12, backgroundColor: '#0b0b1b', borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or: { color: '#6b7280', marginHorizontal: 10 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, height: 44, backgroundColor: '#f9fafb' },
  secondaryText: { color: '#111827', fontWeight: '600' },
  link: { color: '#0b6dff', fontWeight: '700' },
});
