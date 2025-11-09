import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

type Props = {
  onSignedIn?: () => void;
  onRegister?: () => void;
};

export default function LoginScreen({ onSignedIn, onRegister }: Props) {
  let LinearGradientComp: any = null;
  let IoniconsComp: any = null;
  let AsyncStorageMod: any = null;
  try { LinearGradientComp = require('react-native-linear-gradient').default; } catch {}
  try { IoniconsComp = require('react-native-vector-icons/Ionicons').default; } catch {}
  try { AsyncStorageMod = require('@react-native-async-storage/async-storage').default; } catch {}

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Demo: accept any creds and store a simple flag so Splash can route to Dashboard next launch
      if (AsyncStorageMod && remember) {
        await AsyncStorageMod.setItem('employeeData', JSON.stringify({ user: username || 'demo' }));
      }
      onSignedIn && onSignedIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {LinearGradientComp ? (
        <LinearGradientComp colors={["#0f1224", "#151a33", "#0f1224"]} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0f1224' }]} />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 28 }}>
          <View style={styles.headerWrap}>
            <View style={styles.iconCircle}>
              {IoniconsComp ? (
                <IoniconsComp name="business" size={36} color="#111" />
              ) : (
                <Text style={{ fontSize: 28 }}>🏢</Text>
              )}
            </View>
            <Text style={styles.company}>ADDON-S HR</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputRow}>
              <Text style={styles.leftIcon}>👤</Text>
              <TextInput
                placeholder="Enter your username"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <View style={styles.inputRow}>
              <Text style={styles.leftIcon}>🔒</Text>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>

            <View style={styles.rowBetween}>
              <Pressable style={styles.checkboxRow} onPress={() => setRemember(!remember)}>
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                </View>
                <Text style={styles.cbLabel}>Remember me</Text>
              </Pressable>
              <Pressable>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable onPress={signIn} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.or}>OR</Text>
              <View style={styles.line} />
            </View>

            <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}>
              <Text style={{ marginRight: 8 }}>📷</Text>
              <Text style={styles.secondaryText}>Mark Attendance with Face</Text>
            </Pressable>

            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Text style={{ color: '#6b7280' }}>
                Don't have an account?{' '}
                <Text style={styles.link} onPress={onRegister}>Register</Text>
              </Text>
            </View>
          </View>

          <View style={styles.footerNote}>
            <Text style={{ color: '#E5E7EB', fontSize: 12 }}>
              Demo: <Text style={{ color: '#fff' }}>Enter any username and password to continue</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  company: { color: '#E5E7EB', marginTop: 8, fontWeight: '700' },
  subtitle: { color: '#cbd5e1', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12 },
  label: { color: '#111827', fontWeight: '600', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f9fafb', height: 44 },
  leftIcon: { marginLeft: 12, marginRight: 6, color: '#6b7280' },
  input: { flex: 1, paddingHorizontal: 8, color: '#111827' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginRight: 8 },
  checkboxChecked: { backgroundColor: '#111827', borderColor: '#111827' },
  cbLabel: { color: '#374151' },
  link: { color: '#0b6dff', fontWeight: '600' },
  primaryBtn: { marginTop: 12, backgroundColor: '#0b0b1b', borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or: { color: '#6b7280', marginHorizontal: 10 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, height: 44, backgroundColor: '#f9fafb' },
  secondaryText: { color: '#111827', fontWeight: '600' },
  footerNote: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
});

