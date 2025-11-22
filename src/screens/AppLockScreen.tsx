import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Mode = 'verify' | 'setup';

export default function AppLockScreen({ onUnlocked, onCancel }: { onUnlocked: () => void; onCancel?: () => void }) {
  // TEMP: App lock disabled — immediately unlock and skip PIN UI
  // Commenting out logic by short-circuiting the component render.
  React.useEffect(() => { onUnlocked(); }, []);
  return null;

  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('verify');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const lockScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const existing = await AsyncStorage.getItem('app_lock_pin');
        if (!cancelled) {
          setStoredPin(existing);
          setMode(existing ? 'verify' : 'setup');
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const targetLen = useMemo(() => (mode === 'verify' && storedPin ? storedPin.length : 4), [mode, storedPin]);
  const canSubmit = useMemo(() => {
    const expected = mode === 'verify' ? (storedPin?.length || 4) : 4;
    return pin.length === expected;
  }, [pin, mode, storedPin]);

  const clearPin = () => setPin('');

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

  const pulse = () => {
    Animated.sequence([
      Animated.spring(lockScale, { toValue: 1.1, useNativeDriver: true }),
      Animated.spring(lockScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (value?: string) => {
    const attempt = value ?? pin;
    if (attempt === (storedPin || '')) { clearPin(); pulse(); onUnlocked(); }
    else { shake(); clearPin(); Alert.alert('App Lock', 'Incorrect PIN'); }
  };

  const handleSetupFlow = async (value?: string) => {
    if (setupStep === 'enter') {
      const current = value ?? pin;
      if (current.length < 4) return; // wait
      setFirstPin(current);
      setPin('');
      setSetupStep('confirm');
    } else {
      const current = value ?? pin;
      if (current !== firstPin) { shake(); Alert.alert('App Lock', 'PINs do not match'); setPin(''); return; }
      try {
        await AsyncStorage.setItem('app_lock_pin', current);
        setStoredPin(current);
        setPin(''); setFirstPin('');
        pulse();
        onUnlocked();
      } catch {
        Alert.alert('App Lock', 'Failed to save PIN');
      }
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    if (mode === 'verify') await handleVerify();
    else await handleSetupFlow();
  };

  const onReset = async () => {
    Alert.alert('Reset PIN', 'Clear the app lock PIN?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { try { await AsyncStorage.removeItem('app_lock_pin'); setStoredPin(null); setMode('setup'); setPin(''); setFirstPin(''); setSetupStep('enter'); } catch {} } },
    ]);
  };

  // UI helpers
  const dots = Array(targetLen).fill(0).map((_, i) => i < pin.length);
  const translateX = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  const onDigit = async (d: string) => {
    const maxLen = mode === 'verify' ? (storedPin?.length || 4) : 4;
    if (pin.length >= maxLen) return;
    const next = pin + d;
    setPin(next);
    if (mode === 'verify') {
      const expectedLen = storedPin?.length || 4;
      if (next.length === expectedLen) {
        // small delay for UX
        setTimeout(() => { handleVerify(next); }, 120);
      }
    } else {
      if (setupStep === 'enter' && next.length >= 4) {
        // allow OK or auto-advance on 6+; we'll keep manual OK
      }
      if (setupStep === 'confirm' && next.length === firstPin.length) {
        setTimeout(() => { handleSetupFlow(next); }, 120);
      }
    }
  };

  const onBackspace = () => {
    if (!pin.length) return;
    setPin(pin.slice(0, -1));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 16}
      style={styles.wrap}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.center}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={{ alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale: lockScale }] }}>
                <Ionicons name={mode === 'verify' ? 'lock-closed' : (setupStep === 'enter' ? 'keypad' : 'lock-open')} size={36} color="#0b0b1b" />
              </Animated.View>
            </View>
            <Text style={[styles.title, { textAlign: 'center', marginTop: 8 }]}>
              {mode === 'verify' ? 'Enter App PIN' : setupStep === 'enter' ? 'Create a PIN' : 'Confirm PIN'}
            </Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>
              {mode === 'verify' ? 'Unlock to continue' : 'Protect access to your HR data'}
            </Text>

            <Animated.View style={[styles.dotsRow, { transform: [{ translateX }] }] }>
              {dots.map((filled, i) => (
                <View key={i} style={[styles.dot, filled && styles.dotFilled]} />
              ))}
            </Animated.View>

            <View style={styles.keypad}>
              {[['1','2','3'], ['4','5','6'], ['7','8','9'], ['del','0','ok']].map((row, idx) => (
                <View key={idx} style={styles.keypadRow}>
                  {row.map((k) => (
                    <Pressable
                      key={k}
                      style={[styles.key, k==='ok' ? styles.keyPrimary : (k==='del' ? styles.keySecondary : null)]}
                      onPress={() => {
                        if (k === 'del') onBackspace();
                        else if (k === 'ok') onSubmit();
                        else onDigit(k);
                      }}
                    >
                      {k === 'del' ? (
                        <Ionicons name="backspace" size={22} color="#111827" />
                      ) : k === 'ok' ? (
                        <Text style={styles.keyPrimaryText}>{mode === 'verify' ? 'OK' : (setupStep === 'enter' ? 'Next' : 'OK')}</Text>
                      ) : (
                        <Text style={styles.keyText}>{k}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <View style={[styles.btnRow, { marginTop: 8 }]}>
              {!!storedPin && (
                <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onReset}>
                  <Text style={styles.btnSecondaryText}>Reset PIN</Text>
                </Pressable>
              )}
              {onCancel && (
                <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onCancel}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0b1b' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 6, backgroundColor: '#e5e7eb' },
  dotFilled: { backgroundColor: '#0b0b1b' },
  keypad: { marginTop: 12 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  key: { flex: 1, height: 54, marginHorizontal: 6, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 18, fontWeight: '800', color: '#111827' },
  keyPrimary: { backgroundColor: '#0b0b1b' },
  keySecondary: { backgroundColor: '#e5e7eb' },
  keyPrimaryText: { color: '#fff', fontWeight: '800' },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnSecondary: { backgroundColor: '#f3f4f6' },
  btnPrimary: { backgroundColor: '#0b0b1b' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: '#111827' },
});
