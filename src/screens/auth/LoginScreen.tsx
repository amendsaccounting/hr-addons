import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, Platform, StyleProp, ViewStyle, 
  KeyboardAvoidingView, Alert, StatusBar, ScrollView, Keyboard, 
  TouchableWithoutFeedback, Image, 
  Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateEmail, validateRequired } from '../../utils/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logo } from '../../assets/images';
import TextField from '../../components/ui/TextField';
import Button from '../../components/ui/Button';
import { loginWithPassword, isPasswordAuthConfigured } from '../../services/authentication';
import { getEmployeeByEmail, getEmployeeIdByEmail } from '../../services/erpApi';
import { storeSessionSidCookie } from '../../services/secureStore';

type Props = {
  onSignedIn?: () => void;
  onRegister?: () => void;
};

export default function LoginScreen({ onSignedIn, onRegister }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);

  let LinearGradientComp: any = null;
  try { LinearGradientComp = require('react-native-linear-gradient').default; } catch {}

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onHide = () => {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 30);
    };
    const d = Keyboard.addListener('keyboardDidHide', onHide);
    return () => d.remove();
  }, []);

  const onContinue = async () => {
    if (loading) return;

    const err = validateEmail(email);
    if (err) { 
      setEmailError(err); 
      return; 
    }
    const perr = validateRequired('Password', password);
    if (perr) {
      setPasswordError(perr);
      return;
    }

    if (!isPasswordAuthConfigured()) {
      Alert.alert('Not Configured', 'Password login is not configured. Please set ERP_URL_METHOD or ERP_URL_RESOURCE in .env.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithPassword(email.trim(), password);
      console.log('[login] loginWithPassword response', res);
      if (res.ok) {
        if (res.cookie) {
          const saved = await storeSessionSidCookie(res.cookie);
          console.log('[login] stored SID cookie in secure storage:', saved);
        }
        try {
          await AsyncStorage.setItem('userEmail', email.trim());
          if (res.fullName) { await AsyncStorage.setItem('userFullName', res.fullName); }
          if (res.userImage) { await AsyncStorage.setItem('userImage', res.userImage); }
          if (res.userId) { await AsyncStorage.setItem('userId', res.userId); }
          let empId = await getEmployeeIdByEmail(email.trim());
          if (!empId) {
            const employee = await getEmployeeByEmail(email.trim());
            empId = employee?.name ? String(employee.name) : null;
          }
          if (empId) {
            await AsyncStorage.setItem('employeeId', empId);
            console.log('[login] stored employeeId:', empId);
          } else {
            console.log('[login] employee not found for email, continuing without employeeId');
          }
        } catch (e) {
          console.log('[login] failed storing user/employee info:', e);
        }
        onSignedIn && onSignedIn();
      } else {
        Alert.alert('Login Failed', res.error || 'Invalid credentials');
      }
    } catch (error) {
      console.log('Password login error:', error);
      Alert.alert('Login Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

//   const handleMicrosoftLogin = async () => {
//   try {
//     const result = await loginWithMicrosoft();
//     const email = result.additionalParameters?.email || '';
//     if (!email.endsWith('@yourcompany.com')) {
//       Alert.alert('Unauthorized', 'Please use your company email.');
//       return;
//     }

//     await AsyncStorage.setItem('userEmail', email);

//     const employee = await getEmployeeByEmail(email);
//     if (employee) {
//       await AsyncStorage.setItem('employeeId', employee.name);
//     }

//     onSignedIn && onSignedIn();
//   } catch (err) {
//     Alert.alert('Login Failed', 'Could not sign in with Microsoft.');
//   }
// };

// Microsoft login removed for password-based authentication


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0f1e" />
      
      {LinearGradientComp ? (
        <LinearGradientComp 
          colors={["#0c0f1e", "#0e1429", "#0c0f1e"]} 
          start={{x:0,y:0}} end={{x:1,y:1}} 
          style={StyleSheet.absoluteFillObject} 
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0c0f1e' }]} />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
              <View style={styles.logoBox}>
                <Image source={logo} style={styles.logoImage} accessibilityIgnoresInvertColors />
              </View>
              <Text style={styles.appName}>ADDON-S</Text>
              <Text style={styles.tagline}>Sign in to your account</Text>
            </View>
            <View style={[
              styles.whiteSectionBase,
              styles.whiteSectionFlow,
              { paddingBottom: 16 + insets.bottom } as StyleProp<ViewStyle>,
            ]}>
              
              <TextField
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(null); }}
                onBlur={() => setEmailError(validateEmail(email))}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                errorText={emailError || undefined}
                leftIcon="mail-outline"
              />

              <View style={{ height: 12 }} />

              <TextField
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(null); }}
                onBlur={() => setPasswordError(validateRequired('Password', password))}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                errorText={passwordError || undefined}
                leftIcon="lock-closed-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightPress={() => setShowPassword(p => !p)}
              />

              <Button
                title={loading ? 'Please wait…' : 'Login'}
                onPress={onContinue}
                disabled={loading}
                style={{ marginTop: 12 }}
              />

              {/* Removed Microsoft login for password-based authentication */}

              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <Text style={{ color: '#6b7280' }}>
                  Don't have an account?{' '}
                  <Text onPress={onRegister} style={styles.link}>Register</Text>
                </Text>
              </View>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  appName: { color: '#E5E7EB', fontWeight: '700', marginTop: 10 },
  tagline: { color: '#cbd5e1', marginTop: 4 },
  header: { alignItems: 'center', position: 'relative', zIndex: 2, elevation: 6 },
  logoImage: { width: 40, height: 40, resizeMode: 'contain', borderRadius: 8 },
  whiteSectionBase: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, justifyContent: 'flex-end', minHeight: 140 },
  whiteSectionFlow: { marginTop: 'auto' },
  label: { color: '#111827', fontWeight: '600', marginBottom: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or: { color: '#6b7280', marginHorizontal: 10 },
  link: { color: '#0b6dff', fontWeight: '700' },
    outlookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0078D4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 4,
  },
  outlookButtonPressed: {
    opacity: 0.7,
  },
  outlookContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outlookLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  outlookText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

});
