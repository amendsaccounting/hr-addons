import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExpenseScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Expense</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, color: '#333' },
});

