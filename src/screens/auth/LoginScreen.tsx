import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, radii } from '../../styles/theme';
import TextField from '../../components/ui/TextField';
const logo = require('../../assets/images/logo/logo.png');

type Props = {
  onSignedIn?: () => void;
  onRegister?: () => void;
};

export default function LoginScreen({ onSignedIn, onRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const disabled = useMemo(() => email.trim().length === 0 || password.length === 0, [email, password]);

  const handleLogin = () => {
    if (disabled) return;
    // Placeholder: call your auth here, then notify parent
    onSignedIn?.();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={["#141D35", "#1D2B4C", "#14223E"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
            onChangeText={setEmail}
            placeholder="name@example.com"
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
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.6)"
            secureTextEntry
            rowStyle={styles.tfRow}
            labelStyle={styles.tfLabel}
            style={styles.tfInput}
          />

          {/* Login button */}
          <TouchableOpacity onPress={handleLogin} activeOpacity={0.8} disabled={disabled} style={[styles.button, disabled && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.muted}>Don't have an account? </Text>
            <TouchableOpacity onPress={onRegister}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  topLogoContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
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
    justifyContent: 'flex-end',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
