import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, radii } from '../../styles/theme';
import TextField from '../../components/ui/TextField';
import { loginWithPassword } from '../../services/authentication';
let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}
const logo = require('../../assets/images/logo/logo.png');

type Props = {
  onSignedIn?: () => void;
  onRegister?: () => void;
};

export default function LoginScreen({ onSignedIn, onRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setServerError(null);
    const usr = String(email || '').trim();
    const pwd = String(password || '');
    if (!usr || !pwd) { setServerError('Email and password are required'); return; }
    const isEmailLike = /.+@.+\..+/.test(usr);
    if (!isEmailLike) { setServerError('Enter a valid email'); return; }
    setLoading(true);
    try {
      const result = await loginWithPassword(usr, pwd);
      console.log("result===>",result); 
      if (result.ok) {
        try {
          const pairs: [string, string][] = [];
          const rawCookie = result.cookie || '';
          if (rawCookie) {
            const m = /^sid=([^;]+)/i.exec(rawCookie);
            const sidVal = m && m[1] ? m[1] : rawCookie.replace(/^sid=/i, '');
            pairs.push(['sid', sidVal]);
          }
          if (result.userImage) pairs.push(['user_image', String(result.userImage)]);
          if (result.userId) pairs.push(['user_id', String(result.userId)]);
          pairs.push(['userEmail', usr]);
          if (result.employeeId) pairs.push(['employeeId', String(result.employeeId)]);
          if (result.fullName) pairs.push(['full_name', String(result.fullName)]);
          if (pairs.length) {
            if (AsyncStorage && typeof AsyncStorage.multiSet === 'function') {
              await AsyncStorage.multiSet(pairs);
            } else {
              try { console.log('[login] AsyncStorage unavailable; skipping persist'); } catch {}
            }
          }
          // Store employee object if returned by login
          try {
            if (result.employee && typeof AsyncStorage.setItem === 'function') {
              await AsyncStorage.setItem('employeeData', JSON.stringify(result.employee));
            }
          } catch {}
        } catch (storeErr) {
          try { console.log('[login] failed to persist session data', storeErr); } catch {}
        }
        onSignedIn?.();
      } else {
        setServerError(result.error || result.message || 'Login failed');
      }
    } catch (e: any) {
      setServerError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#141D35", "#1D2B4C", "#14223E"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        keyboardOpeningTime={0}
        extraScrollHeight={Platform.select({ ios: 24, android: 32 }) as number}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top logo (matches splash styling) */}
        <View style={styles.topLogoContainer}>
          <View style={styles.logoWrapper}>
            <View style={styles.logoGlow} />
            <View style={styles.logoCircle}>
              <Image source={logo} style={styles.logo} resizeMode="cover" />
            </View>
          </View>
          <Text style={styles.companyName}>ADDON-S</Text>
          <Text style={styles.signInSubtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.bottomPanel}>
          {/* Email */}
          <TextField
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); if (serverError) setServerError(null); }}
            placeholder="Enter your email"
            placeholderTextColor="rgba(255,255,255,0.6)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            rowStyle={styles.tfRow}
            labelStyle={styles.tfLabel}
            style={styles.tfInput}
          />

          {/* Password */}
          <View style={{ height: spacing.lg }} />
          <TextField
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); if (serverError) setServerError(null); }}
            placeholder="Enter your password"
            placeholderTextColor="rgba(255,255,255,0.6)"
            secureTextEntry={!showPassword}
            rowStyle={styles.tfRow}
            labelStyle={styles.tfLabel}
            style={styles.tfInput}
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            onRightPress={() => setShowPassword((v) => !v)}
          />

          {/* Login button */}
          {serverError ? (
            <Text style={{ color: '#ff6b6b', marginTop: spacing.sm }}>{serverError}</Text>
          ) : null}

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8} style={[styles.button, loading && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.muted}>Don't have an account? </Text>
            <TouchableOpacity onPress={onRegister}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
          </View>
          </View>
      </KeyboardAwareScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.select({ ios: 8, android: 0 }) as number,
  },
  topLogoContainer: {
    alignItems: 'center',
    marginTop: 90,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 55,
    backgroundColor: 'rgba(110,198,255,0.10)',
    shadowColor: '#6EC6FF',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({ android: { elevation: 6 } }),
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#0C2C67',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  companyName: {
    marginTop: spacing.sm,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  signInSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPanel: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 1.5,
  },
  tfLabel: { color: 'rgba(255,255,255,0.95)' },
  tfRow: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tfInput: { color: '#fff' },
  button: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    backgroundColor: '#6EC6FF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0B1224',
    fontWeight: '600',
    fontSize: 16,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  muted: {
    color: 'rgba(255,255,255,0.75)',
  },
  link: {
    color: '#6EC6FF',
    fontWeight: '600',
  },
});
