import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { logo as appLogo } from '../assets/images';
import { colors } from '../styles/theme';

type Props = {
  onContinue?: () => void;
};

const SplashScreen: React.FC<Props> = ({ onContinue }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient
        colors={[colors.primary, '#0c0f1e', '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.centerContent}>
          <View style={styles.logoCircle}>
            <Image source={appLogo} style={styles.logo} resizeMode="cover" />
          </View>

          <Text style={styles.appName}>HR Addons</Text>
          <Text style={styles.tagline}>
            Smart HR on the go — attendance, leave, expenses and more
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryBtn}
            onPress={onContinue}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© Addon‑S L.L.C</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  gradient: { flex: 1 },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#1f2937',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: { width: '100%', height: '100%' },
  appName: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 8,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { alignItems: 'center', paddingBottom: 18 },
  footerText: { color: '#94a3b8', fontSize: 12 },
});
