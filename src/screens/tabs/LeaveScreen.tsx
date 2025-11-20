import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Modal,
  StatusBar,
  TextInput,
  Alert,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();
import { computeLeaveBalances, fetchLeaveHistory, applyLeave } from '../../services/leave';
import DateTimePicker from '@react-native-community/datetimepicker';

// Types and sample data kept outside to avoid redeclaration on re-renders
type ReqItem = {
  id: string;
  title: string;
  subtitle: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  start: string;
  end: string;
};

type LeaveBalanceItem = {
  label: string;
  used: number;
  total: number;
};

const REQUESTS_SAMPLE: ReqItem[] = [];

// Balances are fetched from ERP; keep a minimal placeholder type for UI

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = React.useState<ReqItem[]>(REQUESTS_SAMPLE);
  const [employeeId, setEmployeeId] = React.useState<string | null>(null);
  const [balances, setBalances] = React.useState<LeaveBalanceItem[]>([]);
  const [loadingBalances, setLoadingBalances] = React.useState(false);
  const [loadingRequests, setLoadingRequests] = React.useState(false);
  const [applyVisible, setApplyVisible] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const openApply = React.useCallback(() => setApplyVisible(true), []);
  const closeApply = React.useCallback(() => setApplyVisible(false), []);

  const keyExtractor = React.useCallback((item: ReqItem) => item.id, []);
  const renderItem = React.useCallback(({ item }: { item: ReqItem }) => {
    if (loadingRequests) return <SkeletonRequestCard />;
    return (
      <RequestCard
        title={item.title}
        subtitle={item.subtitle}
        status={item.status}
        dateRange={{ start: item.start, end: item.end }}
      />
    );
  }, [loadingRequests]);

  // Load logged-in employee ID (fast local lookup similar to Attendance screen)
  useEffect(() => {
    (async () => {
      try {
        const [id, raw] = await AsyncStorage
          .multiGet(['employeeId', 'employeeData'])
          .then(rows => [rows.find(r=>r[0]==='employeeId')?.[1], rows.find(r=>r[0]==='employeeData')?.[1]]);
        if (id) {
          setEmployeeId(id);
        } else if (raw) {
          try {
            const obj = JSON.parse(raw);
            const cand = [
              obj?.name,
              obj?.employee,
              obj?.employee_id,
              obj?.employeeId,
              obj?.data?.name,
              obj?.data?.employee,
              obj?.data?.employee_id,
              obj?.data?.employeeId,
            ].find((v:any)=> typeof v === 'string' && v.trim().length>0);
            if (cand) setEmployeeId(String(cand));
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // Fetch leave balances from ERP using Leave Allocation and usage
  useEffect(() => {
    if (!employeeId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingBalances(true);
        const list = await computeLeaveBalances(employeeId);
        if (!mounted) return;
        const mapped: LeaveBalanceItem[] = (list || []).map(b => ({
          label: b.leave_type,
          used: b.used,
          total: b.allocated,
        }));
        setBalances(mapped);
      } catch (err) {
        try { console.warn('Leave balances load failed', err); } catch {}
        if (mounted) setBalances([]);
      } finally {
        mounted && setLoadingBalances(false);
      }
    })();
    return () => { mounted = false; };
  }, [employeeId, refreshKey]);

  // Fetch leave applications for requests list (latest first)
  useEffect(() => {
    if (!employeeId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingRequests(true);
        const items = await fetchLeaveHistory(employeeId, 100);
        if (!mounted) return;
        const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
        const mapped: ReqItem[] = (items || []).map((h: any) => ({
          id: String(h?.name || ''),
          title: String(h?.leave_type || ''),
          subtitle: String(h?.description || ''),
          status: String(h?.status || ''),
          start: h?.from_date ? fmt(String(h.from_date)) : '',
          end: h?.to_date ? fmt(String(h.to_date)) : '',
        }));
        setRequests(mapped);
      } catch (err) {
        try { console.warn('Leave requests load failed', err); } catch {}
        if (mounted) setRequests([]);
      } finally {
        mounted && setLoadingRequests(false);
      }
    })();
    return () => { mounted = false; };
  }, [employeeId, refreshKey]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#090a1a" animated />
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}> 
        <Text style={styles.headerTitle}>Leave Management</Text>
        <Text style={styles.headerSub}>Apply and track your leave</Text>
      </View>

      <FlatList
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        data={loadingRequests ? Array.from({ length: 6 }, (_, i) => ({ id: `s-${i}`, title: '', subtitle: '', status: '', start: '', end: '' })) as any : requests}
        keyExtractor={keyExtractor}
        ListHeaderComponent={<ContentHeader balances={balances} onApply={openApply} loading={loadingBalances} />}
        renderItem={renderItem}
        ListEmptyComponent={loadingRequests ? null : <EmptyRequests />}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={5}
        windowSize={10}
      />

      <BottomApplyModal
        visible={applyVisible}
        onClose={closeApply}
        employeeId={employeeId}
        onApplied={() => setRefreshKey((k) => k + 1)}
        types={React.useMemo(() => Array.from(new Set(balances.map(b => b.label))).filter(Boolean), [balances])}
      />
    </View>
  );
}

const BalanceCard = React.memo(function BalanceCard({ label, valueText, progress }: { label: string; valueText: string; progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress || 0));
  const width = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: clamped, duration: 450, useNativeDriver: false }).start();
  }, [clamped, width]);

  const barWidth = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.cardValue}>{valueText}</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: barWidth }]} />
      </View>
    </View>
  );
});

function ContentHeader({ balances, onApply, loading }: { balances: LeaveBalanceItem[]; onApply?: () => void; loading?: boolean }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Leave Balance</Text>
      {loading ? (
        <>
          {Array.from({ length: 3 }).map((_, idx) => (
            <View key={`sk-balance-${idx}`} style={[styles.card, styles.skeletonCard]}>
              <View style={styles.cardRow}>
                <View style={[styles.skeletonBar, { width: 120, height: 12 }]} />
                <View style={[styles.skeletonBar, { width: 48, height: 12 }]} />
              </View>
              <View style={[styles.progressTrack, { marginTop: 12 }]}>
                <View style={[styles.skeletonBar, { height: 6, borderRadius: 6 }]} />
              </View>
            </View>
          ))}
        </>
      ) : balances && balances.length > 0 ? (
        <>
          {balances.map((b, idx) => {
            const remaining = Math.max(0, (b.total || 0) - (b.used || 0));
            const progress = b.total ? remaining / b.total : 0;
            return (
              <BalanceCard
                key={idx}
                label={b.label}
                valueText={`${remaining}/${b.total}`}
                progress={progress}
              />
            );
          })}
        </>
      ) : (
        <View style={[styles.card, styles.emptyCard]}>
          <View style={styles.emptyRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#6b7280" />
            <Text style={styles.emptyTitle}>No leave balance yet</Text>
          </View>
          <Text style={styles.emptySubtitle}>Balances will appear once allocated.</Text>
        </View>
      )}

      <View style={styles.applyWrapper}>
        <Pressable style={{ flex: 1 }} onPress={onApply} accessibilityLabel="Open apply form">
          <Text style={styles.applyTitle}>Apply for Leave</Text>
          <Text style={styles.applySubtitle}>Submit a new leave request</Text>
        </Pressable>
        <Pressable
          style={styles.applyNowButton}
          accessibilityRole="button"
          accessibilityLabel="Apply now"
          onPress={onApply}
        >
          <Ionicons name="add" size={16} color="#111827" />
          <Text style={styles.applyNowText}>Apply now</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Leave Requests</Text>
    </View>
  );
}

const RequestCard = React.memo(function RequestCard({
  title,
  subtitle,
  status,
  dateRange,
}: {
  title: string;
  subtitle: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  dateRange: { start: string; end: string };
}) {
  return (
    <View style={[styles.card, { paddingVertical: 12 }]}> 
      <View style={styles.reqTopRow}>
        <View>
          <Text style={styles.reqTitle}>{title}</Text>
          <Text style={styles.reqSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.badge, statusStyle(status)]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.reqDateRow}>
        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
        <Text style={styles.reqDateText}>{dateRange.start}  </Text>
        <Ionicons name="arrow-forward" size={14} color="#6b7280" style={styles.arrowIcon} />
        <Text style={styles.reqDateText}>  {dateRange.end}</Text>
      </View>
    </View>
  );
});

function SkeletonRequestCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}> 
      <View style={styles.reqTopRow}>
        <View>
          <View style={[styles.skeletonBar, { width: 140, height: 12, marginBottom: 8 }]} />
          <View style={[styles.skeletonBar, { width: 200, height: 10 }]} />
        </View>
        <View style={[styles.skeletonPill, { width: 70, height: 20 }]} />
      </View>
      <View style={[styles.reqDateRow, { marginTop: 12 }]}>
        <View style={[styles.skeletonCircle, { marginRight: 6 }]} />
        <View style={[styles.skeletonBar, { width: 100, height: 10 }]} />
        <View style={[styles.skeletonBar, { width: 12, height: 10, marginHorizontal: 8 }]} />
        <View style={[styles.skeletonBar, { width: 100, height: 10 }]} />
      </View>
    </View>
  );
}

const STATUS_STYLES = {
  approved: { backgroundColor: '#10b98122', borderColor: '#10b981' },
  rejected: { backgroundColor: '#ef444422', borderColor: '#ef4444' },
  pending: { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' },
} as const;

function statusStyle(status: string) {
  const key = String(status || '').toLowerCase() as keyof typeof STATUS_STYLES;
  return STATUS_STYLES[key] ?? STATUS_STYLES.pending;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, marginTop: 8 },
  contentContainer: { paddingBottom: 32 },
  skeletonBar: { backgroundColor: '#e5e7eb', borderRadius: 6 },
  skeletonCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#e5e7eb' },
  skeletonPill: { borderRadius: 999, backgroundColor: '#e5e7eb' },
  skeletonCard: { backgroundColor: '#ffffff' },

  headerCard: {
    backgroundColor: '#090a1a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },

  sectionTitle: { marginTop: 14, marginBottom: 8, marginLeft: 16, fontSize: 14, fontWeight: '700', color: '#111827' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#111827', fontSize: 13 },
  cardValue: { color: '#6b7280', fontSize: 12 },

  progressTrack: { height: 6, backgroundColor: '#eef0f3', borderRadius: 6, marginTop: 12, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: '#0b0b1b', borderRadius: 6 },

  // Removed old full-width apply button styles (now using wrapper)

  reqTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  reqSubtitle: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#111827' },

  reqDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  reqDateText: { color: '#6b7280', fontSize: 12,marginHorizontal:5 },
  arrowIcon: { marginHorizontal: 6 },
  applyWrapper: {
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 14,
    backgroundColor: '#0b0b1b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0b0b1b',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applyTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  applySubtitle: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  applyNowButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  applyNowText: { color: '#111827', fontWeight: '700', marginLeft: 6, fontSize: 12 },
  listFooter: { height: 12 },
  emptyCard: { alignItems: 'flex-start' },
  emptyRow: { flexDirection: 'row', alignItems: 'center' },
  emptyTitle: { marginLeft: 8, color: '#111827', fontWeight: '700' },
  emptySubtitle: { color: '#6b7280', fontSize: 12, marginTop: 8 },
  // Modal / sheet styles
  modalRoot: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  modalBackdrop: { backgroundColor: 'transparent' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
  },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sheetSub: { color: '#6b7280', fontSize: 12 },
  fieldLabel: { color: '#111827', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 6 },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputPressable: { justifyContent: 'center' },
  inputText: { color: '#111827', fontSize: 13 },
  inputPlaceholder: { color: '#9ca3af', fontSize: 13 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLeft: { flexDirection: 'row', alignItems: 'center' },
  fieldValue: { marginLeft: 8 },
  fieldChevron: { marginLeft: 8 },
  helperText: { color: '#6b7280', fontSize: 12, marginTop: 8, marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#eef0f3', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  col: { flex: 1 },
  dropdownPanel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  dropdownText: { color: '#111827', fontSize: 13 },
  dropdownEmpty: { color: '#6b7280', fontSize: 13 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnCancel: { backgroundColor: '#fff', borderColor: '#e5e7eb' },
  btnPrimary: { backgroundColor: '#0b0b1b', borderColor: '#0b0b1b' },
  btnText: { fontSize: 13, fontWeight: '700' },
  btnCancelText: { color: '#111827' },
  btnPrimaryText: { color: '#fff' },
  btnBlock: { flex: 1, justifyContent: 'center' },
  // Calendar styles
});

const ListFooter = React.memo(() => <View style={styles.listFooter} />);

const EmptyRequests = React.memo(() => (
  <View style={[styles.card, styles.emptyCard]}> 
    <View style={styles.emptyRow}>
      <Ionicons name="mail-open-outline" size={18} color="#6b7280" />
      <Text style={styles.emptyTitle}>No leave requests yet</Text>
    </View>
    <Text style={styles.emptySubtitle}>Tap "Apply now" to submit your first request.</Text>
  </View>
));

// Bottom sheet-style modal for applying leave
const BottomApplyModal = React.memo(function BottomApplyModal({ visible, onClose, types, employeeId, onApplied }: { visible: boolean; onClose: () => void; types?: string[]; employeeId?: string | null; onApplied?: () => void }) {
  const insets = useSafeAreaInsets();
  const slide = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [visible, slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const backdropOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  const [leaveType, setLeaveType] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);
  const [showTypeMenu, setShowTypeMenu] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const fmt = (d: Date) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const todayStart = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const onCancel = React.useCallback(() => {
    setLeaveType('');
    setFromDate('');
    setToDate('');
    setReason('');
    setShowFromPicker(false);
    setShowToPicker(false);
    setShowTypeMenu(false);
    onClose();
  }, [onClose]);

  const onSubmit = React.useCallback(async () => {
    if (submitting) return;
    if (!employeeId) { Alert.alert('Not ready', 'Employee ID not found. Try again.'); return; }
    if (!leaveType || !fromDate || !toDate || !reason) {
      Alert.alert('Incomplete', 'Please fill all fields.');
      return;
    }
    const f = new Date(fromDate); f.setHours(0,0,0,0);
    const t = new Date(toDate); t.setHours(0,0,0,0);
    const now0 = new Date(); now0.setHours(0,0,0,0);
    if (f < now0) { Alert.alert('Invalid date', 'From date cannot be in the past.'); return; }
    if (t < now0) { Alert.alert('Invalid date', 'To date cannot be in the past.'); return; }
    if (t < f) { Alert.alert('Invalid range', 'To date cannot be before From date.'); return; }
    try {
      setSubmitting(true);
      await applyLeave({
        employee: String(employeeId),
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        description: reason,
      });
      Alert.alert('Submitted', 'Your leave request has been submitted.');
      onClose();
      onApplied && onApplied();
      setTimeout(() => { setLeaveType(''); setFromDate(''); setToDate(''); setReason(''); }, 0);
    } catch (err: any) {
      const data = err?.response?.data || {};
      const rawException: string = String(data?.exception || '');
      const excType: string = String(data?.exc_type || '');
      let title = 'Error';
      let msg = err?.response?.data?.message || err?.message || 'Failed to submit leave.';
      try {
        if (excType.includes('OverlapError') || rawException.includes('OverlapError')) {
          title = 'Already Applied';
          const html = rawException || '';
          // Try to extract details: leave type and date range from server text
          const typeMatch = html.match(/applied for\s+([^<]+?)\s+between/i);
          const dateMatch = html.match(/between\s+(\d{1,2}-\d{1,2}-\d{4})\s+and\s+(\d{1,2}-\d{1,2}-\d{4})/i);
          const docMatch = html.match(/>([^<]+)<\/?a>/i);
          const urlMatch = html.match(/href=\"([^\"]+)\"/i);
          const type = typeMatch?.[1]?.trim();
          const d1 = dateMatch?.[1];
          const d2 = dateMatch?.[2];
          const docname = docMatch?.[1];
          const url = urlMatch?.[1];
          const fmtNice = (dstr?: string) => {
            if (!dstr) return '';
            const [dd, mm, yyyy] = dstr.split('-').map((s) => parseInt(s, 10));
            if (!yyyy || !mm || !dd) return dstr;
            const dt = new Date(yyyy, mm - 1, dd);
            if (isNaN(dt.getTime())) return dstr;
            return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
          };
          const niceFrom = fmtNice(d1);
          const niceTo = fmtNice(d2);
          const rangeText = niceFrom && niceTo ? `${niceFrom} to ${niceTo}` : (d1 && d2 ? `${d1} to ${d2}` : 'these dates');
          const typeText = type ? type : 'leave';
          const docText = docname ? ` (${docname})` : '';
          msg = `You already have a ${typeText} from ${rangeText}.${docText ? ` View: ${docText}` : ''}`;

          if (url) {
      Alert.alert(
  "⚠️ Leave Conflict",
  
  "These dates already have a leave request. Please adjust your selection.",
  [
    { text: "🔄 Adjust Dates", style: "cancel" },
  ]
);
            return;
          }
        }
      } catch {}
      Alert.alert(title, String(msg));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, employeeId, leaveType, fromDate, toDate, reason, onClose, onApplied]);


  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={[StyleSheet.absoluteFill, styles.modalBackdrop]} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
        </Pressable>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 12) : 0} style={{ width: '100%' }}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}> 
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Apply for Leave</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color="#111827" />
            </Pressable>
          </View>
          <Text style={styles.sheetSub}>Fill the details to submit your leave request.</Text>
          <View style={{ height: 12 }} />
          <Text style={styles.fieldLabel}>Leave Type</Text>
          <Pressable
            onPress={() => setShowTypeMenu(v => !v)}
            accessibilityRole="button"
            style={[styles.textInput, styles.inputPressable, styles.fieldRow]}
          >
            <View style={styles.fieldLeft}>
              <Ionicons name="layers-outline" size={16} color="#6b7280" />
              <Text style={[leaveType ? styles.inputText : styles.inputPlaceholder, styles.fieldValue]}>
                {leaveType || 'Select leave type'}
              </Text>
            </View>
            <Ionicons style={styles.fieldChevron} name={showTypeMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {showTypeMenu && (
            <View style={styles.dropdownPanel}>
              {(types && types.length > 0) ? (
                types.map((t) => (
                  <Pressable key={t} onPress={() => { setLeaveType(t); setShowTypeMenu(false); }} style={styles.dropdownItem}>
                    <Text style={styles.dropdownText}>{t}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.dropdownItem}><Text style={styles.dropdownEmpty}>No leave types</Text></View>
              )}
            </View>
          )}
          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>From</Text>
              <Pressable
                onPress={() => { setShowFromPicker(v => !v); if (showToPicker) setShowToPicker(false); setShowTypeMenu(false); }}
                accessibilityRole="button"
                style={[styles.textInput, styles.inputPressable, styles.fieldRow]}
              >
                <View style={styles.fieldLeft}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={[fromDate ? styles.inputText : styles.inputPlaceholder, styles.fieldValue]}>
                    {fromDate || 'YYYY-MM-DD'}
                  </Text>
                </View>
                <Ionicons style={styles.fieldChevron} name={showFromPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
              </Pressable>
              {showFromPicker && (
                <DateTimePicker
                  value={fromDate ? new Date(fromDate) : todayStart}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={todayStart}
                  maximumDate={toDate ? new Date(toDate) : undefined}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setShowFromPicker(false);
                    if (selected) {
                      const picked = new Date(selected);
                      picked.setHours(0, 0, 0, 0);
                      if (picked < todayStart) {
                        Alert.alert('Invalid date', 'From date cannot be in the past.');
                        return;
                      }
                      const pickedStr = fmt(picked);
                      setFromDate(pickedStr);
                      if (toDate) {
                        const to = new Date(toDate);
                        to.setHours(0, 0, 0, 0);
                        if (to < picked) {
                          setToDate(pickedStr);
                        }
                      }
                    }
                  }}
                />
              )}
            </View>
            <View style={[styles.col, { marginLeft: 8 }]}>
              <Text style={styles.fieldLabel}>To</Text>
              <Pressable
                onPress={() => { setShowToPicker(v => !v); if (showFromPicker) setShowFromPicker(false); setShowTypeMenu(false); }}
                accessibilityRole="button"
                style={[styles.textInput, styles.inputPressable, styles.fieldRow]}
              >
                <View style={styles.fieldLeft}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={[toDate ? styles.inputText : styles.inputPlaceholder, styles.fieldValue]}>
                    {toDate || 'YYYY-MM-DD'}
                  </Text>
                </View>
                <Ionicons style={styles.fieldChevron} name={showToPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
              </Pressable>
              {showToPicker && (
                <DateTimePicker
                  value={toDate ? new Date(toDate) : (fromDate ? new Date(fromDate) : todayStart)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={fromDate ? new Date(fromDate) : todayStart}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setShowToPicker(false);
                    if (selected) {
                      const picked = new Date(selected);
                      picked.setHours(0, 0, 0, 0);
                      if (picked < todayStart) {
                        Alert.alert('Invalid date', 'To date cannot be in the past.');
                        return;
                      }
                      if (fromDate) {
                        const from = new Date(fromDate);
                        from.setHours(0, 0, 0, 0);
                        if (picked < from) {
                          Alert.alert('Invalid range', 'To date cannot be before From date.');
                          setToDate(fmt(from));
                          return;
                        }
                      }
                      setToDate(fmt(picked));
                    }
                  }}
                />
              )}
            </View>
          </View>
          <Text style={styles.helperText}>Same-day leave allowed. Past dates disabled automatically.</Text>
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Reason</Text>
          <TextInput
            placeholder="Brief reason for leave"
            placeholderTextColor="#9ca3af"
            value={reason}
            onChangeText={setReason}
            style={[styles.textInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
            multiline
            numberOfLines={4}
          />

          

          <View style={styles.actionsRow}>
            <Pressable style={[styles.btn, styles.btnCancel, styles.btnBlock]} onPress={onCancel} accessibilityLabel="Cancel">
              <Ionicons name="close" size={16} color="#111827" />
              <Text style={[styles.btnText, styles.btnCancelText, { marginLeft: 6 }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary, styles.btnBlock]} onPress={onSubmit} accessibilityLabel="Submit">
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={[styles.btnText, styles.btnPrimaryText, { marginLeft: 6 }]}>Submit</Text>
            </Pressable>
          </View>
          </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

// Custom inline calendar removed; using native DateTimePicker








