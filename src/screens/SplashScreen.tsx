import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../styles/theme';

// Use require() to avoid default export interop on RN assets
const logo = require('../assets/images/logo/logo.png');

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.center}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator color={colors.white} style={{ marginTop: 16 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});
