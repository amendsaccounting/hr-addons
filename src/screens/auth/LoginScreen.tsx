import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, Pressable, StyleProp, ViewStyle, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onSignedIn?: () => void;
  onRegister?: () => void;
};

export default function LoginScreen({ onSignedIn, onRegister }: Props) {
  const insets = useSafeAreaInsets();
  let LinearGradientComp: any = null;
  try { LinearGradientComp = require('react-native-linear-gradient').default; } catch {}

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: any) => { setKeyboardVisible(true); setKeyboardHeight(e?.endCoordinates?.height || 0); };
    const onHide = () => { setKeyboardVisible(false); setKeyboardHeight(0); };
    const show = Keyboard.addListener('keyboardDidShow', onShow);
    const hide = Keyboard.addListener('keyboardDidHide', onHide);
    return () => { show.remove(); hide.remove(); };
  }, []);

  const onSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      onSignedIn && onSignedIn();
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {LinearGradientComp ? (
        <LinearGradientComp colors={["#0c0f1e", "#0e1429", "#0c0f1e"]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0c0f1e' }]} />
      )}

      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: insets.top + 28, alignItems: 'center' }}>
          <View style={styles.logoBox}><Text style={{ fontSize: 24 }}>🏢</Text></View>
          <Text style={styles.appName}>ERPNext HR</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>

        <View style={[styles.whiteSection, { paddingBottom: 16 + insets.bottom, bottom: keyboardVisible ? keyboardHeight : 0 } as StyleProp<ViewStyle>] }>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Text style={styles.leftIcon}>📧</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType={Platform.OS === 'ios' ? 'email-address' : 'email-address'}
              autoComplete="email"
              style={styles.input}
              returnKeyType="done"
            />
          </View>

          <Pressable onPress={onSignIn} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
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
            <Text style={{ color: '#6b7280' }}>Don’t have an account? <Text onPress={onRegister} style={styles.link}>Register</Text></Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  appName: { color: '#E5E7EB', fontWeight: '700', marginTop: 10 },
  tagline: { color: '#cbd5e1', marginTop: 4 },
  whiteSection: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  label: { color: '#111827', fontWeight: '600', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f9fafb', height: 44 },
  leftIcon: { marginLeft: 12, marginRight: 6, color: '#6b7280' },
  input: { flex: 1, paddingHorizontal: 8, color: '#111827' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginRight: 8 },
  checkboxChecked: { backgroundColor: '#111827', borderColor: '#111827' },
  cbLabel: { color: '#374151' },
  forgot: { color: '#0b6dff', fontWeight: '600' },
  primaryBtn: { marginTop: 12, backgroundColor: '#0b0b1b', borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or: { color: '#6b7280', marginHorizontal: 10 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, height: 44, backgroundColor: '#f9fafb' },
  secondaryText: { color: '#111827', fontWeight: '600' },
  link: { color: '#0b6dff', fontWeight: '700' },
});






