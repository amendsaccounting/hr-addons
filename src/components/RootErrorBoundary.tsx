import * as React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
let DevSettings: any = null;
try { DevSettings = require('react-native').DevSettings; } catch {}

type State = { error?: Error; info?: { componentStack?: string } };

export default class RootErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    try { console.error('[RootErrorBoundary] caught error:', error, info); } catch {}
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children as any;
    const stack = String(error?.stack || info?.componentStack || '');
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>{String(error.message || 'Unknown error')}</Text>
          <ScrollView style={styles.stackBox} contentContainerStyle={{ padding: 12 }}>
            <Text style={styles.stackText}>{stack}</Text>
          </ScrollView>
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.primary]} onPress={() => { try { DevSettings?.reload?.(); } catch {} }}>
              <Text style={[styles.btnText, styles.primaryText]}>Reload App</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.secondary]} onPress={() => { try { console.log('[RootErrorBoundary stack]', stack); } catch {} }}>
              <Text style={[styles.btnText, styles.secondaryText]}>Log Stack</Text>
            </Pressable>
          </View>
          <Text style={styles.env}>{Platform.OS.toUpperCase()} • {__DEV__ ? 'DEV' : 'PROD'}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0b1b', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 720, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280' },
  stackBox: { marginTop: 12, maxHeight: 240, backgroundColor: '#0b0b1b', borderRadius: 8 },
  stackText: { color: '#e5e7eb', fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  primary: { backgroundColor: '#0b0b1b' },
  primaryText: { color: '#fff' },
  secondary: { backgroundColor: '#f3f4f6' },
  secondaryText: { color: '#111827' },
  btnText: { fontWeight: '700' },
  env: { marginTop: 10, color: '#9ca3af', fontSize: 12, textAlign: 'right' },
});

