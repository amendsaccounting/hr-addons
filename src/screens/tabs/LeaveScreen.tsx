import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, TextInput, StatusBar, SectionList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchLeaveAllocations, fetchLeaveUsage, type LeaveAllocation } from '../../services/leave';

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();

  const [employeeId, setEmployeeId] = React.useState<string | null>(null);
  const [allocations, setAllocations] = React.useState<LeaveAllocation[]>([]);
  const [loadingAlloc, setLoadingAlloc] = React.useState(false);
  const [usedByType, setUsedByType] = React.useState<Record<string, number>>({});
  const leaveTypes = React.useMemo(
    () => Array.from(new Set(allocations.map(a => a.leave_type))).filter(Boolean),
    [allocations]
  );

  const requests = React.useMemo(
    () => [
      { id: 'REQ-1005', type: 'Annual Leave', desc: 'Family vacation', from: 'Oct 20, 2025', to: 'Oct 22, 2025', days: 3, status: 'Pending' },
      { id: 'REQ-1004', type: 'Sick Leave', desc: 'Medical appointment', from: 'Oct 10, 2025', to: 'Oct 11, 2025', days: 2, status: 'Approved' },
    ],
    []
  );

  const [showApplyModal, setShowApplyModal] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState<string>('');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('employeeId');
        console.log("id====>",id)       
        setEmployeeId(id);
      } catch (e) {
        console.warn('Failed to read employeeId from storage', e);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!employeeId) return;
    (async () => {
      try {
        setLoadingAlloc(true);
        const [alloc, used] = await Promise.all([
          fetchLeaveAllocations(employeeId),
          fetchLeaveUsage(employeeId).catch(() => ({} as Record<string, number>)),
        ]);
        setAllocations(alloc);
        setUsedByType(used || {});
      } catch (e) {
        console.error('Failed to load leave allocations', e);
      } finally {
        setLoadingAlloc(false);
      }
    })();
  }, [employeeId]);

  const submitLeaveRequest = () => {
    if (!leaveType || !fromDate || !toDate || !reason) {
      Alert.alert('Incomplete', 'Please fill all fields.');
      return;
    }
    Alert.alert('Leave Request', 'Submitted successfully.');
    setShowApplyModal(false);
    setReason('');
    setFromDate('');
    setToDate('');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#090a1a" />
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <Text style={styles.headerSubtitle}>Apply and track your leave</Text>
      </View>
      <SectionList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 28, paddingBottom: 16 }}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        sections={React.useMemo(() => {
          const allocData: any[] = loadingAlloc
            ? [{ __type: 'ALLOC_PLACEHOLDER', text: 'Loading balances…' }]
            : (allocations.length > 0
                ? allocations
                : [{ __type: 'ALLOC_PLACEHOLDER', text: 'No leave allocations found.' }]);
          const applyData: any[] = [{ __type: 'APPLY_CARD' }];
          const requestsData: any[] = requests.length > 0
            ? requests
            : [{ __type: 'REQ_PLACEHOLDER', text: 'No leave requests exist' }];
          return [
            { key: 'alloc', title: 'Leave Balance', data: allocData },
            { key: 'apply', title: undefined, data: applyData },
            { key: 'req', title: 'Leave Requests', data: requestsData },
          ];
        }, [loadingAlloc, allocations, requests])}
        keyExtractor={(item: any, index, section) => item?.name || item?.id || item?.__type || `${section.key}-${index}`}
        renderSectionHeader={({ section }) => (
          !!section.title ? <Text style={[styles.sectionTitle, { marginTop: section.key === 'req' ? 16 : 0 }]}>{section.title}</Text> : null
        )}
        renderItem={React.useCallback(({ item, section }: any) => {
          if (item?.__type === 'ALLOC_PLACEHOLDER') {
            return <Text style={styles.placeholder}>{item.text}</Text>;
          }
          if (item?.__type === 'APPLY_CARD') {
            return (
              <View style={styles.applyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.applyTitle}>Apply for Leave</Text>
                  <Text style={styles.applySubtitle}>Submit a new leave request</Text>
                </View>
                <Pressable
                  onPress={() => { if (!leaveType && leaveTypes.length > 0) setLeaveType(leaveTypes[0]); setShowApplyModal(true); }}
                  style={({ pressed }) => [styles.applyButton, pressed && { opacity: 0.9 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.applyButtonText}>Apply Now</Text>
                </Pressable>
              </View>
            );
          }
          if (section.key === 'alloc') {
            const a = item as LeaveAllocation;
            const total = Number(a.leaves_allocated || 0) || 0;
            const used = Number(usedByType[a.leave_type] || 0) || 0;
            const remaining = Math.max(0, total - used);
            const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100))) : 0;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => { setLeaveType(a.leave_type); setShowApplyModal(true); }}
                style={({ pressed }) => [styles.balanceItemCard, pressed && { opacity: 0.96 }]}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.progressLabel}>{a.leave_type}</Text>
                  <Text style={styles.progressValue}>{used}/{total} days</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              </Pressable>
            );
          }
          if (item?.__type === 'REQ_PLACEHOLDER') {
            return (
              <View style={styles.noRequestsContainer}>
                <Text style={styles.noRequestsText}>{item.text}</Text>
              </View>
            );
          }
          // Requests item
          const r = item as any;
          return (
            <View style={styles.historyItem}>
              <View style={styles.historyTopRow}>
                <Text style={styles.historyType}>{r.type}</Text>
                <View style={[
                  styles.statusPill,
                  r.status === 'Approved' ? styles.statusApproved : r.status === 'Pending' ? styles.statusPending : styles.statusRejected,
                ]}>
                  <Text style={styles.statusText}>{r.status}</Text>
                </View>
              </View>
              <Text style={styles.historyDesc}>{r.desc}</Text>
              <View style={styles.historyDateRow}>
                <Text style={styles.historyDateIcon}>📅</Text>
                <Text style={styles.historyDates}>{r.from}</Text>
                <Text style={styles.historyArrow}> → </Text>
                <Text style={styles.historyDates}>{r.to}</Text>
              </View>
              <Text style={styles.historyDays}>{r.days} days</Text>
            </View>
          );
        }, [usedByType, setShowApplyModal])}
        removeClippedSubviews
        windowSize={8}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
      />

      <Modal
        animationType="slide"
        transparent
        visible={showApplyModal}
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            <Text style={styles.helperText}>Fill in the details below to submit your leave request.</Text>
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.typeRow}>
              {(leaveTypes.length > 0 ? leaveTypes : ['Annual Leave', 'Sick Leave', 'Casual Leave']).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setLeaveType(t)}
                  style={[styles.typeChip, leaveType === t && styles.typeChipSelected]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.typeChipText, leaveType === t && styles.typeChipTextSelected]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>From Date</Text>
            <TextInput
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>To Date</Text>
            <TextInput
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason"
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              multiline
              placeholderTextColor="#9ca3af"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <Pressable onPress={() => setShowApplyModal(false)} style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]}> 
                <Text style={[styles.modalBtnText, { color: '#111827' }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitLeaveRequest} style={[styles.modalBtn, { backgroundColor: '#0b0b1b' }]}> 
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Submit Request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  headerCard: { backgroundColor: '#090a1a', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#cbd5e1', marginTop: 4, fontSize: 12 },
  
  placeholder: { fontSize: 16, color: '#374151' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  balanceItemCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#cbd5e1', padding: 16, marginBottom: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: '#374151', fontSize: 14, fontWeight: '600' },
  progressValue: { color: '#6b7280', fontSize: 12 },
  progressTrack: { height: 10, backgroundColor: '#d1d5db', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#000' },
  applyCard: { backgroundColor: '#0b0b1b', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  applyTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  applySubtitle: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  applyButton: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 12 },
  applyButtonText: { color: '#0b0b1b', fontWeight: '700', fontSize: 14 },
  helperText: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  fieldLabel: { fontSize: 13, color: '#374151', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { height: 44, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, color: '#111827' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8, marginBottom: 8 },
  typeChipSelected: { backgroundColor: '#0b0b1b' },
  typeChipText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  typeChipTextSelected: { color: '#fff' },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginLeft: 10 },
  modalBtnText: { fontWeight: '700' },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  historyList: { paddingBottom: 16 },
  historyItem: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 12 },
  historyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyType: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  historyDesc: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  historyDateIcon: { fontSize: 14, color: '#6b7280', marginRight: 6 },
  historyDates: { fontSize: 13, color: '#374151' },
  historyArrow: { fontSize: 13, color: '#9ca3af', marginHorizontal: 12 },
  historyDays: { fontSize: 13, color: '#111827', fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusApproved: { backgroundColor: '#10b981' },
  statusPending: { backgroundColor: '#f97316' },
  statusRejected: { backgroundColor: '#ef4444' },
});
