import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, FlatList, Alert, RefreshControl } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listAllLeads, deleteLead, type Lead } from '../../services/leadService';

export default function LeadScreen() {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const [searchDebounceId, setSearchDebounceId] = useState<any>(null);

  console.log("leadsssdata====>",leads);
  

  const statusChips = useMemo(() => ['All', 'Lead', 'Open', 'Replied', 'Qualified', 'Converted'], []);

  const load = async (opts?: { showSpinner?: boolean }) => {
    if (opts?.showSpinner) setLoading(true);
    try {
      const rows = await listAllLeads({ search: query || undefined, status: status === 'All' ? undefined : status, pageSize: 200, hardCap: 20000 });
      setLeads(rows);
    } catch (e: any) {
      Alert.alert('Leads', e?.message || 'Failed to load leads');
    } finally {
      if (opts?.showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    load({ showSpinner: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounced search when typing
  useEffect(() => {
    if (searchDebounceId) clearTimeout(searchDebounceId);
    const id = setTimeout(() => {
      load({ showSpinner: true });
    }, 400);
    setSearchDebounceId(id);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onDelete = async (name: string) => {
    Alert.alert('Delete Lead', 'Are you sure you want to delete this lead?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const ok = await deleteLead(name);
          if (ok) await load();
          else Alert.alert('Leads', 'Unable to delete lead');
        } catch {
          Alert.alert('Leads', 'Unable to delete lead');
        }
      } },
    ]);
  };

  const metrics = useMemo(() => ([
    { key: 'total', label: 'Total Leads', value: String(leads.length) },
    { key: 'pipeline', label: 'Pipeline Value', value: '-' },
    { key: 'won', label: 'Won', value: '-' },
  ]), [leads.length]);

  return (
    <View style={styles.screen}>
      {/* Fixed Header */}
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
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

      <View style={{ flex: 1 }}>
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#6b7280" style={{ marginHorizontal: 8 }} />
              <TextInput
                placeholder="Search leads..."
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => load({ showSpinner: true })}
                returnKeyType="search"
              />
              {loading ? (
                <ActivityIndicator size="small" style={styles.searchSpinner} />
              ) : (
                !!query && (
                  <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </Pressable>
                )
              )}
            </View>
            <Pressable style={styles.addBtn} accessibilityRole="button" onPress={() => Alert.alert('Add Lead', 'Implement create lead form here.') }>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsRowContent}
          >
            {statusChips.map((c) => (
              <Pressable key={c} style={[styles.chip, status === c && styles.chipActive]} onPress={() => setStatus(c)}>
                <Text style={[styles.chipText, status === c && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        {loading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={leads}
            keyExtractor={(item) => item.name}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.container}
            renderItem={({ item }) => (
              <View style={styles.leadCard}>
                <View style={styles.leadTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadCompany}>{item.company_name || item.lead_name || '—'}</Text>
                    {!!item.lead_name && <Text style={styles.leadContact}>{item.lead_name}</Text>}
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => onDelete(item.name)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
                <View style={styles.badgeRow}>
                  {!!item.status && (
                    <View style={[styles.badge, { backgroundColor: '#e7f0ff' }]}>
                      <Text style={[styles.badgeText, { color: '#0b6dff' }]}>{item.status}</Text>
                    </View>
                  )}
                  {!!item.source && (
                    <View style={[styles.badge, { backgroundColor: '#fff' }, styles.linkBadge]}>
                      <Text style={[styles.badgeText, { color: '#111827' }]}>{item.source}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailList}>
                  {!!item.email_id && <Row icon="mail-outline" text={item.email_id} />}
                  {!!item.mobile_no && <Row icon="call-outline" text={item.mobile_no} />}
                  {!!item.territory && <Row icon="location-outline" text={item.territory} />}
                </View>
              </View>
            )}
            ListEmptyComponent={!loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={60} color="#cbd5e1" />
                <Text style={{ marginTop: 8, color: '#6b7280' }}>No leads found</Text>
              </View>
            ) : null}
          />
        )}
      </View>
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
  container: { paddingBottom: 24, paddingTop: 0 },

  headerCard: {
    backgroundColor: '#090a1a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
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

  // Match card width: searchRow sits inside searchSection (which already has paddingHorizontal: 16)
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, marginTop: 6, marginBottom: 12 },
  searchSection: { paddingHorizontal: 16, paddingTop: 6 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', height: 40 },
  searchInput: { flex: 1, color: '#111827' },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b1b', borderRadius: 10, marginLeft: 10 },
  clearBtn: { paddingHorizontal: 8, height: '100%', justifyContent: 'center' },
  searchSpinner: { paddingHorizontal: 8 },

  chipsRow: { paddingHorizontal: 0, paddingVertical: 6, marginBottom: 6, marginTop: 6 },
  chipsRowContent: { paddingRight: 16, alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: '#f3f4f6', marginRight: 8 },
  chipActive: { backgroundColor: '#0b0b1b' },
  chipText: { color: '#111827', fontWeight: '600', fontSize: 12, paddingHorizontal: 4, lineHeight: 16 },
  chipTextActive: { color: '#fff' },

  leadCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 16, padding: 14, marginTop: 10 },
  leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  leadCompany: { color: '#111827', fontWeight: '700' },
  leadContact: { color: '#6b7280', marginTop: 2 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  linkBadge: { borderWidth: 1, borderColor: '#e5e7eb' },

  notes: { color: '#374151', marginTop: 10 },
  detailList: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowText: { color: '#374151' },
});
