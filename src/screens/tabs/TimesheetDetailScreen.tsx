import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import { useRoute } from '@react-navigation/native';
import { getTimesheet } from '../../services/timesheetService';

type RouteParams = { name?: string };

export default function TimesheetDetailScreen({ name }: { name?: string }) {
  const route = useRoute<any>();
  const tsName: string | undefined = name ?? route?.params?.name;
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (tsName) {
          const d = await getTimesheet(tsName);
          try { console.log('[timesheets][detail] loaded', { name: tsName, data: d }); } catch {}
          if (mounted) setDoc(d);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tsName]);

  const logs: any[] = Array.isArray(doc?.time_logs) ? doc.time_logs : [];
  const fmtDateTime = (v: any): string => {
    try {
      if (!v) return '-';
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return v ? String(v) : '-';
    }
  };

  return (
    <View style={styles.screen}>
      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator />
        </View>
      ) : !doc ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="alert-circle-outline" size={28} color="#9ca3af" />
          <Text style={{ color: '#6b7280', marginTop: 8 }}>Timesheet not found</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{doc?.name || 'Timesheet'}</Text>
            <Text style={styles.sub}>
              {(doc?.status || 'Draft') + (typeof doc?.total_hours === 'number' ? ` • ${doc.total_hours}h` : '')}
            </Text>
            {doc?.employee ? <Text style={styles.meta}>Employee: {String(doc.employee)}</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>Time Logs</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.4 }]}>Activity</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>From</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>To</Text>
            <Text style={[styles.th, { width: 60, textAlign: 'right' }]}>Hours</Text>
          </View>
          <FlatList
            data={logs}
            keyExtractor={(it, idx) => String(it?.name || idx)}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  try { console.log('[timesheets][detail] log tapped', item); } catch {}
                  setSelectedLog(item);
                }}
                accessibilityRole="button"
              >
                <Text numberOfLines={1} style={[styles.td, { flex: 1.4 }]}>{item?.activity_type || 'Activity'}</Text>
                <Text numberOfLines={1} style={[styles.td, { flex: 1.2 }]}>{fmtDateTime(item?.from_time)}</Text>
                <Text numberOfLines={1} style={[styles.td, { flex: 1.2 }]}>{fmtDateTime(item?.to_time)}</Text>
                <Text numberOfLines={1} style={[styles.td, { width: 60, textAlign: 'right' }]}>{typeof item?.hours === 'number' ? `${item.hours}h` : '-'}</Text>
              </Pressable>
            )}
            ListEmptyComponent={() => (
              <View style={[styles.center, { paddingVertical: 24 }]}>
                <Ionicons name="file-tray-outline" size={24} color="#9ca3af" />
                <Text style={{ color: '#9ca3af', marginTop: 6 }}>No time logs</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
          {selectedLog && (
            <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 200 }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedLog(null)}>
                <View style={styles.backdrop} />
              </Pressable>
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Time Log Details</Text>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Customer</Text><Text style={styles.detailValue}>{selectedLog?.custom_customer || selectedLog?.customer || selectedLog?.customer_name || '-'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Activity Type</Text><Text style={styles.detailValue}>{selectedLog?.activity_type || '-'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>From Time</Text><Text style={styles.detailValue}>{fmtDateTime(selectedLog?.from_time)}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>To Time</Text><Text style={styles.detailValue}>{fmtDateTime(selectedLog?.to_time)}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Task Details</Text><Text style={styles.detailValue}>{selectedLog?.custom_task_details || selectedLog?.task_details || selectedLog?.description || '-'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Hrs</Text><Text style={styles.detailValue}>{typeof selectedLog?.hours === 'number' ? String(selectedLog.hours) : '-'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Project</Text><Text style={styles.detailValue}>{selectedLog?.project || '-'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Task</Text><Text style={styles.detailValue}>{selectedLog?.task || '-'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Project Name</Text><Text style={styles.detailValue}>{selectedLog?.project_name || '-'}</Text></View>
                <Pressable style={styles.closeBtn} onPress={() => setSelectedLog(null)} accessibilityRole="button"><Text style={styles.closeBtnText}>Close</Text></Pressable>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerCard: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sub: { marginTop: 4, color: '#6b7280' },
  meta: { marginTop: 4, color: '#6b7280' },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, color: '#111827', fontWeight: '600' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  sep: { height: 1, backgroundColor: '#E5E7EB', marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  td: { color: '#111827', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  detailCard: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  detailLabel: { color: '#6B7280', width: 120 },
  detailValue: { color: '#111827', flex: 1, textAlign: 'right' },
  closeBtn: { marginTop: 14, backgroundColor: '#111827', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '600' },
});
