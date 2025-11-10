import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
 
import AppHeader from '../../components/AppHeader';

export default function LeadScreen() {
  return (
    <View style={styles.screen}>
      <AppHeader title="Leads" subtitle="Track your sales leads" bgColor="#0b0b1b" statusBarStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.placeholder}>Lead screen content goes here.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  
  placeholder: { fontSize: 16, color: '#374151' },
});
