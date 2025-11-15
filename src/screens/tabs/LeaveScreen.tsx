import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, TextInput, StatusBar, SectionList, Platform, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { todayStart, adjustFromOnPick, adjustToOnPick, validateRange } from '../../utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchLeaveAllocations, fetchLeaveUsage, fetchLeaveHistory, applyLeave, type LeaveAllocation } from '../../services/leave';

// Memoized row components to reduce re-renders
const BalanceCard: React.FC<{ title: string; used: number; total: number; pct: number; onPress: () => void; }>
  = React.memo(({ title, used, total, pct, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.balanceItemCard, pressed && { opacity: 0.96 }]}>
    <View style={styles.rowTop}>
      <Text style={styles.progressLabel}>{title}</Text>
      <Text style={styles.progressValue}>{used}/{total} days</Text>
    </View>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  </Pressable>
));

const ApplyCard: React.FC<{ onPress: () => void }>
  = React.memo(({ onPress }) => (
  <View style={styles.applyCard}>
    <View style={{ flex: 1 }}>
      <Text style={styles.applyTitle}>Apply for Leave</Text>
      <Text style={styles.applySubtitle}>Submit a new leave request</Text>
    </View>
    <Pressable onPress={onPress} style={({ pressed }) => [styles.applyButton, pressed && { opacity: 0.9 }]} accessibilityRole="button">
      <Text style={styles.applyButtonText}>Apply Now</Text>
    </Pressable>
  </View>
));

const RequestItem: React.FC<{ type: string; desc: string; from: string; to: string; status: string; days: number }>
  = React.memo(({ type, desc, from, to, status, days }) => (
  <View style={styles.historyItem}>
    <View style={styles.historyTopRow}>
      <Text style={styles.historyType}>{type}</Text>
      <View style={[
        styles.statusPill,
        status === 'Approved' ? styles.statusApproved : status === 'Pending' ? styles.statusPending : styles.statusRejected,
      ]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
    <Text style={styles.historyDesc}>{desc}</Text>
    <View style={styles.historyDateRow}>
      <Text style={styles.historyDateIcon}>📅</Text>
      <Text style={styles.historyDates}>{from}</Text>
      <Text style={styles.historyArrow}> → </Text>
      <Text style={styles.historyDates}>{to}</Text>
    </View>
    <Text style={styles.historyDays}>{days} days</Text>
  </View>
));

const SkeletonBalanceCard: React.FC = React.memo(() => {
  const pulse = React.useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => { loop.stop(); };
  }, [pulse]);
  const a = { opacity: pulse } as const;
  return (
    <View style={styles.balanceItemCard}>
      <Animated.View style={[styles.skelLine, a, { width: '55%', height: 14 }]} />
      <View style={{ height: 10 }} />
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.skelFill, a]} />
      </View>
    </View>
  );
});

// Skeleton for Leave Requests while history loads
const SkeletonRequestCard: React.FC = React.memo(() => {
  const pulse = React.useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => { loop.stop(); };
  }, [pulse]);
  const a = { opacity: pulse } as const;
  return (
    <View style={styles.historyItem}>
      <Animated.View style={[styles.skelLine, a, { width: '40%', height: 14 }]} />
      <View style={{ height: 8 }} />
      <Animated.View style={[styles.skelLine, a, { width: '85%', height: 10 }]} />
      <View style={{ height: 8 }} />
      <Animated.View style={[styles.skelLine, a, { width: '60%', height: 10 }]} />
    </View>
  );
});

const LIST_CONTENT_STYLE = { padding: 16, paddingTop: 28, paddingBottom: 16 } as const;

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

  const [requests, setRequests] = React.useState<Array<{ id: string; type: string; desc: string; from: string; to: string; days: number; status: string }>>([]);

  const [showApplyModal, setShowApplyModal] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState<string>('');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);
  const today = React.useMemo(() => todayStart(), []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await AsyncStorage.getItem('employeeId');
        if (mounted) setEmployeeId(id);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (!employeeId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingAlloc(true);
        const [alloc, used, history] = await Promise.all([
          fetchLeaveAllocations(employeeId),
          fetchLeaveUsage(employeeId).catch(() => ({} as Record<string, number>)),
          fetchLeaveHistory(employeeId).catch(() => [] as any[]),
        ]);
        if (!mounted) return;
        setAllocations(alloc);
        setUsedByType(used || {});
        setRequests((history || []).map((h: any) => ({
          id: h.name,
          type: h.leave_type,
          desc: h.description || '',
          from: h.from_date,
          to: h.to_date,
          days: typeof h.total_leave_days === 'number' ? h.total_leave_days : Math.max(1, Math.round((new Date(h.to_date).getTime() - new Date(h.from_date).getTime()) / 86400000) + 1),
          status: h.status,
        })));
      } catch {}
      finally {
        mounted && setLoadingAlloc(false);
      }
    })();
    return () => { mounted = false; };
  }, [employeeId]);

  const submitLeaveRequest = React.useCallback(async () => {
    if (!leaveType || !fromDate || !toDate || !reason) {
      Alert.alert('Incomplete', 'Please fill all fields.');
      return;
    }
    const check = validateRange(fromDate, toDate, today);
    if (!check.ok) { Alert.alert('Invalid date(s)', check.error || 'Please correct date range.'); return; }
    if (!employeeId) { Alert.alert('Missing employee', 'Please log in again.'); return; }
    try {
      setSubmitting(true);
      const created = await applyLeave({
        employee: employeeId,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        description: reason,
      });
      const daysCalc = (() => {
        const f = new Date(fromDate); const t = new Date(toDate);
        if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
        return Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000) + 1);
      })();
      const newItem = {
        id: (created && (created.name || created?.data?.name || created?.message?.name)) || `${leaveType}-${Date.now()}`,
        type: leaveType,
        desc: reason,
        from: fromDate,
        to: toDate,
        days: daysCalc,
        status: 'Pending',
      };
      setRequests(prev => [newItem, ...prev]);
      Alert.alert('Leave Request', 'Submitted successfully.');
      setShowApplyModal(false);
      setReason('');
      setFromDate('');
      setToDate('');
      try {
        setLoadingAlloc(true);
        const [alloc, used, history] = await Promise.all([
          fetchLeaveAllocations(employeeId),
          fetchLeaveUsage(employeeId).catch(() => ({} as Record<string, number>)),
          fetchLeaveHistory(employeeId).catch(() => [] as any[]),
        ]);
        setAllocations(alloc);
        setUsedByType(used || {});
        setRequests((history || []).map((h: any) => ({
          id: h.name,
          type: h.leave_type,
          desc: h.description || '',
          from: h.from_date,
          to: h.to_date,
          days: typeof h.total_leave_days === 'number' ? h.total_leave_days : Math.max(1, Math.round((new Date(h.to_date).getTime() - new Date(h.from_date).getTime()) / 86400000) + 1),
          status: h.status,
        })));
      } catch {}
      finally { setLoadingAlloc(false); }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to submit leave request.';
      Alert.alert('Error', String(msg));
    } finally {
      setSubmitting(false);
    }
  }, [leaveType, fromDate, toDate, reason, today, employeeId]);

  const onOpenApply = React.useCallback((presetType?: string) => {
    if (presetType) setLeaveType(presetType);
    else if (!leaveType && leaveTypes.length > 0) setLeaveType(leaveTypes[0]);
    setShowApplyModal(true);
  }, [leaveType, leaveTypes]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#090a1a" />
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <Text style={styles.headerSubtitle}>Apply and track your leave</Text>
      </View>
      <SectionList
        style={styles.list}
        contentContainerStyle={LIST_CONTENT_STYLE}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        sections={React.useMemo(() => {
          const allocData: any[] = loadingAlloc
            ? [0, 1, 2].map(i => ({ __type: 'ALLOC_LOADING', id: i }))
            : (allocations.length > 0
                ? allocations
                : [{ __type: 'ALLOC_EMPTY', text: 'No leave allocations found.' }]);
          const applyData: any[] = [{ __type: 'APPLY_CARD' }];
          const requestsData: any[] = loadingAlloc
            ? [0, 1].map(i => ({ __type: 'REQ_LOADING', id: i }))
            : (requests.length > 0
                ? requests
                : [{ __type: 'REQ_PLACEHOLDER', text: 'No leave requests exist' }]);
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
          if (item?.__type === 'ALLOC_LOADING') {
            return <SkeletonBalanceCard />;
          }
          if (item?.__type === 'ALLOC_EMPTY') {
            return <Text style={styles.placeholder}>{item.text}</Text>;
          }
          if (item?.__type === 'REQ_LOADING') {
            return <SkeletonRequestCard />;
          }
          if (item?.__type === 'APPLY_CARD') {
            return <ApplyCard onPress={() => onOpenApply()} />;
          }
          if (section.key === 'alloc') {
            const a = item as LeaveAllocation;
            const total = Number(a.leaves_allocated || 0) || 0;
            const used = Number(usedByType[a.leave_type] || 0) || 0;
            const remaining = Math.max(0, total - used);
            const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100))) : 0;
            return (
              <BalanceCard
                title={a.leave_type}
                used={used}
                total={total}
                pct={pct}
                onPress={() => onOpenApply(a.leave_type)}
              />
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
          return <RequestItem type={r.type} desc={r.desc} from={r.from} to={r.to} status={r.status} days={r.days} />;
        }, [usedByType, onOpenApply])}
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
            <Pressable
              onPress={() => { setShowFromPicker(v => !v); if (showToPicker) setShowToPicker(false); }}
              accessibilityRole="button"
              style={[styles.input, styles.inputPressable]}
            >
              <Text style={fromDate ? styles.inputText : styles.inputPlaceholder}>
                {fromDate || 'YYYY-MM-DD'}
              </Text>
            </Pressable>

            <Text style={styles.fieldLabel}>To Date</Text>
            <Pressable
              onPress={() => { setShowToPicker(v => !v); if (showFromPicker) setShowFromPicker(false); }}
              accessibilityRole="button"
              style={[styles.input, styles.inputPressable]}
            >
              <Text style={toDate ? styles.inputText : styles.inputPlaceholder}>
                {toDate || 'YYYY-MM-DD'}
              </Text>
            </Pressable>

            {showFromPicker && (
              <DateTimePicker
                value={fromDate ? new Date(fromDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowFromPicker(false);
                  if (selected) {
                    const { from, to } = adjustFromOnPick(selected, toDate, today);
                    setFromDate(from);
                    if (to) setToDate(to);
                  }
                }}
                minimumDate={today}
                maximumDate={toDate ? new Date(toDate) : undefined}
              />
            )}

            {showToPicker && (
              <DateTimePicker
                value={toDate ? new Date(toDate) : (fromDate ? new Date(fromDate) : new Date())}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowToPicker(false);
                  if (selected) {
                    const { to, from } = adjustToOnPick(selected, fromDate, today);
                    setToDate(to);
                    if (from) setFromDate(from);
                  }
                }}
                minimumDate={fromDate ? new Date(new Date(fromDate).setHours(0,0,0,0)) : today}
              />
            )}

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
              <Pressable disabled={submitting} onPress={submitLeaveRequest} style={[styles.modalBtn, { backgroundColor: submitting ? '#6b7280' : '#0b0b1b' }]}> 
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
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
  skelLine: { backgroundColor: '#e5e7eb', borderRadius: 6 },
  skelFill: { height: '100%', backgroundColor: '#e5e7eb' },
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
  // For Pressable date inputs
  inputPressable: { justifyContent: 'center' },
  inputText: { color: '#111827', fontSize: 14 },
  inputPlaceholder: { color: '#9ca3af', fontSize: 14 },
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

