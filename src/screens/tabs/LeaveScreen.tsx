import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Modal,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();
import { computeLeaveBalances } from '../../services/leave';

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

const REQUESTS_SAMPLE: ReqItem[] = [
  { id: '1', title: 'Annual Leave', subtitle: 'Family vacation', status: 'Pending', start: 'Oct 20, 2025', end: 'Oct 22, 2025' },
  { id: '2', title: 'Sick Leave', subtitle: 'Flu recovery', status: 'Approved', start: 'Sep 12, 2025', end: 'Sep 13, 2025' },
  { id: '3', title: 'Casual Leave', subtitle: 'Personal errand', status: 'Rejected', start: 'Aug 02, 2025', end: 'Aug 02, 2025' },
];

// Balances are fetched from ERP; keep a minimal placeholder type for UI

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const requests: ReqItem[] = REQUESTS_SAMPLE;
  const [employeeId, setEmployeeId] = React.useState<string | null>(null);
  const [balances, setBalances] = React.useState<LeaveBalanceItem[]>([]);
  const [loadingBalances, setLoadingBalances] = React.useState(false);
  const [applyVisible, setApplyVisible] = React.useState(false);

  const openApply = React.useCallback(() => setApplyVisible(true), []);
  const closeApply = React.useCallback(() => setApplyVisible(false), []);

  const keyExtractor = React.useCallback((item: ReqItem) => item.id, []);
  const renderItem = React.useCallback(({ item }: { item: ReqItem }) => (
    <RequestCard
      title={item.title}
      subtitle={item.subtitle}
      status={item.status}
      dateRange={{ start: item.start, end: item.end }}
    />
  ), []);

  // Load logged-in employee ID (fast local lookup similar to Attendance screen)
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  }, [employeeId]);

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
        data={requests}
        keyExtractor={keyExtractor}
        ListHeaderComponent={<ContentHeader balances={balances} onApply={openApply} />}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyRequests />}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={5}
        windowSize={10}
      />

      <BottomApplyModal visible={applyVisible} onClose={closeApply} />
    </View>
  );
}

const BalanceCard = React.memo(function BalanceCard({ label, valueText, progress }: { label: string; valueText: string; progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress || 0));
  const width = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
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

const ContentHeader = React.memo(function ContentHeader({ balances, onApply }: { balances: LeaveBalanceItem[]; onApply?: () => void }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Leave Balance</Text>
      {balances && balances.length > 0 ? (
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
});

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
  reqDateText: { color: '#6b7280', fontSize: 12 },
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sheetSub: { color: '#6b7280', fontSize: 12 },
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
const BottomApplyModal = React.memo(function BottomApplyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const slide = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [visible, slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const backdropOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={[StyleSheet.absoluteFill, styles.modalBackdrop]} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}> 
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Apply for Leave</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color="#111827" />
            </Pressable>
          </View>
          <Text style={styles.sheetSub}>Fill the details to submit your leave request.</Text>
          {/* Placeholder action; hook up to form/navigation if needed */}
          <Pressable style={[styles.applyNowButton, { alignSelf: 'flex-end', marginTop: 12 }]} onPress={onClose}>
            <Ionicons name="checkmark" size={16} color="#111827" />
            <Text style={styles.applyNowText}>Submit</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
});
