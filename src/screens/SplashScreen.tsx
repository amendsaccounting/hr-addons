import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: { onFinish?: (nextTab: 'Dashboard' | 'Login') => void }) {
  let LinearGradientComp: any = null;
  let IoniconsComp: any = null;
  let AsyncStorageMod: any = null;
  try { LinearGradientComp = require('react-native-linear-gradient').default; } catch {}
  try { IoniconsComp = require('react-native-vector-icons/Ionicons').default; } catch {}
  try { AsyncStorageMod = require('@react-native-async-storage/async-storage').default; } catch {}
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();

    Animated.timing(progressAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start(async () => {
      let next: 'Dashboard' | 'Login' = 'Login';
      try {
        const emp = AsyncStorageMod ? await AsyncStorageMod.getItem('employeeData') : null;
        if (emp) next = 'Dashboard';
      } catch {}
      onFinish && onFinish(next);
    });
  }, [fadeAnim, scaleAnim, progressAnim, onFinish]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1f36" />
      {LinearGradientComp ? (
        <LinearGradientComp colors={["#1a1f36", "#2d3561", "#1a1f36"]} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a1f36' }]} />
      )}

      <View style={styles.topSection}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.logoCircle}>
            {IoniconsComp ? (
              <IoniconsComp name="people" size={64} color="#fff" />
            ) : (
              <Text style={{ fontSize: 56, color: '#fff' }}>👥</Text>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={styles.middleSection}>
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.appName}>ADDON-S HR</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Employee Management System</Text>
        </Animated.View>
      </View>

      <View style={styles.bottomSection}>
        <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.poweredBy}>Powered by ERPNext</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1f36' },
  topSection: { flex: 4, justifyContent: 'center', alignItems: 'center', paddingTop: height * 0.1 },
  logoContainer: { justifyContent: 'center', alignItems: 'center' },
  logoCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  middleSection: { flex: 4, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  textContainer: { alignItems: 'center' },
  appName: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1, marginBottom: 16 },
  divider: { width: 60, height: 3, backgroundColor: '#64b5f6', borderRadius: 2, marginBottom: 16 },
  tagline: { fontSize: 16, color: '#b0bec5', letterSpacing: 0.5, fontWeight: '400' },
  bottomSection: { flex: 2, justifyContent: 'space-between', alignItems: 'center', paddingBottom: 40 },
  loadingContainer: { width: '100%', alignItems: 'center', paddingHorizontal: 60 },
  progressBarContainer: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressBar: { height: '100%', backgroundColor: '#64b5f6', borderRadius: 2 },
  loadingText: { fontSize: 14, color: '#90a4ae', fontWeight: '500', letterSpacing: 1 },
  footer: { alignItems: 'center' },
  poweredBy: { fontSize: 12, color: '#78909c', fontWeight: '400' },
  version: { fontSize: 11, color: '#546e7a', fontWeight: '300' },
});
