import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, Platform, StyleProp, ViewStyle, 
  KeyboardAvoidingView, Alert, StatusBar, ScrollView, Keyboard, 
  TouchableWithoutFeedback, Image 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateEmail } from '../../utils/validators';
import { getUserByEmail, getEmployeeByEmail } from '../../services/erpApi';
import { logo } from '../../assets/images';
import TextField from '../../components/ui/TextField';
import Button from '../../components/ui/Button';

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

    setLoading(true);
    try {
      const user = await getUserByEmail(email.trim());
      if (!user) {
        setEmailError('Email does not exist.');
        return;
      }

      await AsyncStorage.setItem('userEmail', user.email);

      const employee = await getEmployeeByEmail(user.email);
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
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(null); }}
                onBlur={() => setEmailError(validateEmail(email))}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailError || undefined}
                icon="📧"
              />

              <Button
                title={loading ? 'Please wait…' : 'Continue'}
                onPress={onContinue}
                disabled={loading}
                style={{ marginTop: 12 }}
              />

              <View style={styles.dividerRow}>
                <View style={styles.line} />
                <Text style={styles.or}>OR</Text>
                <View style={styles.line} />
              </View>

              <Button
                title="📷  Mark Attendance with Face"
                variant="secondary"
                style={{ marginTop: 4 }}
              />

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
});
