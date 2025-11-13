import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function LeadScreen() {
  (Ionicons as any)?.loadFont?.();

  const metrics = [
    { key: 'total', label: 'Total Leads', value: '3' },
    { key: 'pipeline', label: 'Pipeline Value', value: '$150k' },
    { key: 'won', label: 'Won', value: '$0k' },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Ionicons name="trending-up" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Sales Leads</Text>
          </View>
          <Text style={styles.headerSubtitle}>Track and manage sales opportunities</Text>

          <View style={styles.metricRow}>
            {metrics.map(m => (
              <View key={m.key} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Search + Add */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#6b7280" style={{ marginHorizontal: 8 }} />
            <TextInput placeholder="Search leads..." placeholderTextColor="#9ca3af" style={styles.searchInput} />
          </View>
          <Pressable style={styles.addBtn} accessibilityRole="button">
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {['All','New','Contacted','Qualified','Prospect'].map((c, idx) => (
            <Pressable key={c} style={[styles.chip, idx === 0 && styles.chipActive]}>
              <Text style={[styles.chipText, idx === 0 && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Lead card */}
        <View style={styles.leadCard}>
          <View style={styles.leadTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.leadCompany}>Tech Solutions Inc</Text>
              <Text style={styles.leadContact}>John Smith</Text>
            </View>
            <Pressable accessibilityRole="button">
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#e7f0ff' }]}>
              <Text style={[styles.badgeText, { color: '#0b6dff' }]}>Qualified</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name="cash-outline" size={14} color="#374151" />
              <Text style={[styles.badgeText, { color: '#374151' }]}>$ 50k</Text>
            </View>
            <Pressable style={[styles.badge, { backgroundColor: '#fff' }, styles.linkBadge]}>
              <Text style={[styles.badgeText, { color: '#111827' }]}>Website</Text>
            </Pressable>
          </View>

          <Text style={styles.notes}>Interested in enterprise package</Text>

          <View style={styles.detailList}>
            <Row icon="mail-outline" text="john@techsolutions.com" />
            <Row icon="call-outline" text="+1 234-567-8901" />
            <Row icon="location-outline" text="New York, NY" />
            <Row icon="time-outline" text="Added: 10/15/2025" />
          </View>
        </View>

        {/* Continuation cards (Leads2.png) */}
        <View style={styles.leadCard}>
          <View style={styles.leadTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.leadCompany}>Global Marketing Ltd</Text>
              <Text style={styles.leadContact}>Sarah Johnson</Text>
            </View>
            <Pressable accessibilityRole="button">
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#fde7cf' }]}>
              <Text style={[styles.badgeText, { color: '#b45309' }]}>Proposal</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name="cash-outline" size={14} color="#374151" />
              <Text style={[styles.badgeText, { color: '#374151' }]}>$ 75k</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#fff' }, styles.linkBadge]}>
              <Text style={[styles.badgeText, { color: '#111827' }]}>Referral</Text>
            </View>
          </View>
          <Text style={styles.notes}>Needs customization for team of 50</Text>
          <View style={styles.detailList}>
            <Row icon="mail-outline" text="sarah@globalmarketing.com" />
            <Row icon="call-outline" text="+1 234-567-8902" />
            <Row icon="location-outline" text="Los Angeles, CA" />
            <Row icon="time-outline" text="Added: 10/10/2025" />
          </View>
        </View>

        <View style={styles.leadCard}>
          <View style={styles.leadTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.leadCompany}>StartUp Ventures</Text>
              <Text style={styles.leadContact}>Mike Chen</Text>
            </View>
            <Pressable accessibilityRole="button">
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#e7f0ff' }]}>
              <Text style={[styles.badgeText, { color: '#0b6dff' }]}>New</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name="cash-outline" size={14} color="#374151" />
              <Text style={[styles.badgeText, { color: '#374151' }]}>$ 25k</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#fff' }, styles.linkBadge]}>
              <Text style={[styles.badgeText, { color: '#111827' }]}>LinkedIn</Text>
            </View>
          </View>
          <View style={styles.detailList}>
            <Row icon="mail-outline" text="mike@startupventures.com" />
            <Row icon="call-outline" text="+1 234-567-8903" />
            <Row icon="location-outline" text="San Francisco, CA" />
            <Row icon="time-outline" text="Added: 10/18/2025" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.row}> 
      <Ionicons name={icon as any} size={14} color="#6b7280" style={{ width: 18 }} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 24 },

  headerCard: {
    backgroundColor: '#090a1a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#cbd5e1', marginTop: 4, fontSize: 12 },

  metricRow: { flexDirection: 'row', marginTop: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  metricLabel: { color: '#6b7280', fontSize: 11 },
  metricValue: { color: '#111827', fontWeight: '700', marginTop: 4 },

  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', height: 40 },
  searchInput: { flex: 1, color: '#111827' },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b1b', borderRadius: 8, marginLeft: 10 },

  chipsRow: { paddingHorizontal: 12, paddingVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f3f4f6', marginRight: 8 },
  chipActive: { backgroundColor: '#0b0b1b' },
  chipText: { color: '#111827', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#fff' },

  leadCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 12, padding: 12, marginTop: 6 },
  leadTop: { flexDirection: 'row', alignItems: 'center' },
  leadCompany: { color: '#111827', fontWeight: '700' },
  leadContact: { color: '#6b7280', marginTop: 2 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  linkBadge: { borderWidth: 1, borderColor: '#e5e7eb' },

  notes: { color: '#374151', marginTop: 12 },
  detailList: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowText: { color: '#374151' },
});
