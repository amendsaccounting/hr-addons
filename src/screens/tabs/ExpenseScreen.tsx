import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExpenseScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b1b" />
      <View style={{ height: insets.top, backgroundColor: '#0b0b1b', position: 'absolute', top: 0, left: 0, right: 0 }} />
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <Text style={styles.headerSubtitle}>Manage your expenses</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.placeholder}>Expense screen content goes here.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  headerCard: { backgroundColor: '#0b0b1b', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  placeholder: { fontSize: 16, color: '#374151' },
});
