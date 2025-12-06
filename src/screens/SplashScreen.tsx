import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar, Text, Platform, InteractionManager } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../styles/theme';
let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

// Existing app logo
const logo = require('../assets/images/logo/logo.png');

type Props = {
  onReady?: (next: 'login' | 'tabs') => void;
};

export default function SplashScreen({ onReady }: Props) {
  useEffect(() => {
    let canceled = false;
    const MIN_SPLASH_MS = 600; // keep branding visible briefly

    const run = async () => {
      // Let first frame render before doing any work
      try { await new Promise((r) => InteractionManager.runAfterInteractions(r)); } catch {}

      const waitMin = new Promise((r) => setTimeout(r, MIN_SPLASH_MS));
      const readSid = (async () => {
        try {
          if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
            return await AsyncStorage.getItem('sid');
          }
        } catch {}
        return null;
      })();

      const [sid] = await Promise.all([readSid, waitMin]) as [string | null, any];
      if (canceled) return;
      onReady?.(sid ? 'tabs' : 'login');
    };

    run();
    return () => { canceled = true; };
  }, [onReady]);
  return (
    <LinearGradient
      colors={["#141D35", "#1D2B4C", "#14223E"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Top logo with soft glow */}
      <View style={styles.topLogoContainer}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoGlow} />
          <View style={styles.logoCircle}>
            <Image source={logo} style={styles.logo} resizeMode="cover" />
          </View>
        </View>
      </View>

      {/* Centered title + accent */}
      <View style={styles.centerContent}>
        <Text style={styles.appName}>ADDON-S HR</Text>
        <View style={styles.accent} />
        <Text style={styles.subtitle}>Employee Management System</Text>
      </View>

      {/* Bottom credits */}
      <View style={styles.bottomNoteContainer}>
        <Text style={styles.bottomNote}>Powered by ERPNext</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
  logoWrapper: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  accent: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6EC6FF',
    marginTop: 10,
    marginBottom: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
  },
  topLogoContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomNoteContainer: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomNote: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  version: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 4,
  }
});
