import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, TextInput, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import { getTimesheets, createTimesheet } from '../../services/timesheetService';
import { useNavigation } from '@react-navigation/native';

type TimesheetItem = {
  name?: string;
  employee?: string;
  status?: string;
  total_hours?: number;
  [key: string]: any;
};

export default function TimesheetListScreen({ onSelect }: { onSelect?: (name: string) => void }) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TimesheetItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const PAGE_SIZE = 15;
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTimesheets(0, PAGE_SIZE);
      try { console.log('[timesheets][list] loaded items', { count: Array.isArray(data) ? data.length : undefined, data }); } catch {}
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setHasMore(arr.length === PAGE_SIZE);
    } catch (e: any) {
      console.log('[timesheets] load error', e?.message || e);
      Alert.alert('Failed', 'Could not load timesheets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtDate = useCallback((v: any): string => {
    try {
      if (!v) return '-';
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return v ? String(v) : '-';
    }
  }, []);

  const startDateOf = (it: any): any => it?.start_date || (Array.isArray(it?.time_logs) && it.time_logs[0]?.from_time) || it?.start_time;
  const submittedDateOf = (it: any): any => it?.submitted_on || it?.modified || it?.creation;

  const onAdd = useCallback(async () => {
    const hrs = parseFloat(hours);
    if (!title.trim()) { Alert.alert('Validation', 'Please enter a title.'); return; }
    if (!Number.isFinite(hrs) || hrs <= 0) { Alert.alert('Validation', 'Enter valid hours > 0'); return; }
    try {
      setSubmitting(true);
      const payload: any = {
        doctype: 'Timesheet',
        // employee resolved server-side from session or service may inject
        time_logs: [
          {
            activity_type: title.trim(),
            hours: hrs,
          },
        ],
      };
      const created = await createTimesheet(payload);
      try { console.log('[timesheets][list] created', created); } catch {}
      setTitle('');
      setHours('');
      setAdding(false);
      await load();
      Alert.alert('Success', 'Timesheet created.');
    } catch (e: any) {
      console.log('[timesheets] create error', e?.message || e);
      Alert.alert('Failed', 'Could not create timesheet.');
    } finally {
      setSubmitting(false);
    }
  }, [title, hours, load]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const offset = items.length;
      const more = await getTimesheets(offset, PAGE_SIZE);
      try { console.log('[timesheets][list] loaded more', { offset, count: Array.isArray(more) ? more.length : undefined }); } catch {}
      const arr = Array.isArray(more) ? more : [];
      setItems(prev => [...prev, ...arr]);
      setHasMore(arr.length === PAGE_SIZE);
    } catch (e: any) {
      console.log('[timesheets] load more error', e?.message || e);
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, PAGE_SIZE, hasMore, loading, loadingMore]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Timesheets</Text>
        <Pressable style={styles.refreshBtn} onPress={load} accessibilityRole="button">
          <Ionicons name="refresh" size={18} color="#111827" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.4 }]}>Title</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
            <Text style={[styles.th, { flex: 1.1 }]}>Start</Text>
            <Text style={[styles.th, { flex: 1 }]}>ID</Text>
            <Text style={[styles.th, { flex: 1.3 }]}>Submitted</Text>
          </View>
          <FlatList
            data={items}
            keyExtractor={(it, idx) => String(it?.name || idx)}
            contentContainerStyle={{ paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.2}
            ListFooterComponent={loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color="#111827" />
              </View>
            ) : null}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  if (item?.name) {
                    if (onSelect) onSelect(item.name);
                    else navigation.navigate('TimesheetDetail', { name: item.name });
                  }
                }}
                accessibilityRole="button"
              >
                <Text numberOfLines={1} style={[styles.td, { flex: 1.4 }]}>{item?.name || '-'}</Text>
                <Text numberOfLines={1} style={[styles.td, { flex: 1 }]}>{item?.status || 'Draft'}</Text>
                <Text numberOfLines={1} style={[styles.td, { flex: 1.1 }]}>{fmtDate(startDateOf(item))}</Text>
                <Text numberOfLines={1} style={[styles.td, { flex: 1 }]}>{item?.employee || '-'}</Text>
                <Text numberOfLines={1} style={[styles.td, { flex: 1.3 }]}>{fmtDate(submittedDateOf(item))}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 6 }} />
              </Pressable>
            )}
            ListEmptyComponent={() => (
              <View style={[styles.center, { paddingVertical: 40 }]}> 
                <Ionicons name="file-tray-outline" size={28} color="#9ca3af" />
                <Text style={styles.emptyText}>No timesheets yet</Text>
              </View>
            )}
          />
        </>
      )}

      {adding ? (
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>New Timesheet</Text>
          <TextInput
            style={styles.input}
            placeholder="Activity / Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Hours (e.g., 2.5)"
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
          />
          <View style={styles.addRow}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setAdding(false)} disabled={submitting}>
              <Text style={[styles.btnText, { color: '#111827' }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onAdd} disabled={submitting}>
              <Text style={[styles.btnText, { color: '#fff' }]}>{submitting ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.fab} onPress={() => setAdding(true)} accessibilityRole="button">
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  refreshBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  sep: { height: 1, backgroundColor: '#E5E7EB', marginLeft: 16 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  td: { color: '#111827', fontSize: 13 },
  emptyText: { marginTop: 8, color: '#9CA3AF' },
  fab: { position: 'absolute', right: 16, bottom: 24, height: 48, width: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', elevation: 2 },
  addCard: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  addTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  addRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minWidth: 96, alignItems: 'center' },
  btnGhost: { backgroundColor: '#F3F4F6' },
  btnPrimary: { backgroundColor: '#111827' },
  btnText: { fontWeight: '600' },
  footer: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});
