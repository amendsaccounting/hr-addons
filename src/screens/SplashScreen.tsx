import React from 'react'
import { View, StyleSheet, Image, StatusBar, Text } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { colors } from '../styles/theme'
import { logo } from '../assets/images'

const BG_TOP = '#1b2445'
const BG_BOTTOM = '#161f39'
const ACCENT = '#61C9FF'
// Sizing for the concentric logo wrapper
const HALO = 116
const RING = 96
const CIRCLE = 82

const SplashScreen = () => {
  return (
    <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_TOP} />

      {/* Top logo with soft glow */}
      <View style={styles.topArea} accessible accessibilityLabel="App logo">
        <View style={styles.glowWrap}>
          <View style={styles.halo} />
          <View style={styles.logoRing}>
            <View style={styles.logoCircle}>
              <Image
                source={logo}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                accessibilityLabel="Company logo"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Middle content */}
      <View style={styles.centerArea}>
        <Text style={styles.appName}>ADDON-S HR</Text>
        <View style={styles.nameUnderline} />
        <Text style={styles.subtitle}>Employee Management System</Text>
        <Text style={styles.loading}>Loading...</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.powered}>Powered by ERPNext</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topArea: {
    alignItems: 'center',
  },
  glowWrap: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
    backgroundColor: '#0b2a7a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: CIRCLE / 2,
  },
  centerArea: {
    alignItems: 'center',
  },
  appName: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nameUnderline: {
    marginTop: 10,
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  subtitle: {
    marginTop: 12,
    color: '#c6d0e1',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  loading: {
    marginTop: 32,
    color: '#9aa5b1',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
  },
  powered: {
    color: '#8e9ab3',
    fontSize: 12,
  },
})

export default SplashScreen
