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
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

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

const BALANCES_SAMPLE: LeaveBalanceItem[] = [
  { label: 'Annual Leave', used: 12, total: 20 },
  { label: 'Sick Leave', used: 8, total: 10 },
  { label: 'Casual Leave', used: 3, total: 5 },
];

const LEAVE_TYPES = [
  { key: 'annual', label: 'Annual Leave' },
  { key: 'sick', label: 'Sick Leave' },
  { key: 'casual', label: 'Casual Leave' },
];

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const requests: ReqItem[] = REQUESTS_SAMPLE;
  const balances: LeaveBalanceItem[] = BALANCES_SAMPLE;
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

  const headerEl = React.useMemo(() => (
    <ContentHeader balances={balances} onApply={openApply} />
  ), [balances, openApply]);

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
        ListHeaderComponent={headerEl}
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
          {balances.map((b, idx) => (
            <BalanceCard key={idx} label={b.label} valueText={`${b.used}/${b.total}`} progress={b.total ? b.used / b.total : 0} />
          ))}
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
        <Pressable style={styles.flexOne} onPress={onApply} accessibilityLabel="Open apply form">
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
  // utility
  flexOne: { flex: 1 },
  colRightGap: { marginRight: 6 },
  colLeftGap: { marginLeft: 6 },
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
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sheetSub: { color: '#6b7280', fontSize: 12 },
  closeIconBtn: { marginLeft: 10, padding: 6 },
  sheetContent: { marginTop: 10 },
  sheetContentContainer: { paddingBottom: 12 },
  fieldLabel: { color: '#374151', fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  inputRow: { },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: '#111827' },
  dropdownMenu: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  dropdownItemText: { color: '#111827' },
  rowTwo: { flexDirection: 'row', marginTop: 10 },
  col: { flex: 1 },
  inputPressable: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  inputText: { marginLeft: 8, color: '#111827' },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, minHeight: 90, textAlignVertical: 'top', color: '#111827' },
  errorText: { color: '#ef4444', marginTop: 8 },
  sheetActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  actionRightBtn: { marginLeft: 10 },
  // Calendar
  calCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginTop: 10, backgroundColor: '#fff' },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calIconBtn: { padding: 6 },
  calTitle: { fontWeight: '700', color: '#111827' },
  calWeekRow: { flexDirection: 'row', marginTop: 8 },
  calWeekLabel: { flex: 1, textAlign: 'center', color: '#6b7280', fontSize: 12 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  calCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calCellText: { color: '#111827' },
  calCellTextDim: { color: '#d1d5db' },
  calCellDisabled: { opacity: 0.5 },
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
  const sheetMaxHeight = Math.round(Dimensions.get('window').height * 0.78);

  const [leaveType, setLeaveType] = React.useState(LEAVE_TYPES[0]);
  const [fromDate, setFromDate] = React.useState<Date | null>(null);
  const [toDate, setToDate] = React.useState<Date | null>(null);
  const [reason, setReason] = React.useState('');
  const [showType, setShowType] = React.useState(false);
  const [showCal, setShowCal] = React.useState<'from' | 'to' | null>(null);
  const [error, setError] = React.useState('');

  const reset = () => { setLeaveType(LEAVE_TYPES[0]); setFromDate(null); setToDate(null); setReason(''); setShowType(false); setShowCal(null); setError(''); };
  const closeAll = () => { reset(); onClose(); };

  const submit = () => {
    setError('');
    if (!fromDate || !toDate) { setError('Please select both dates.'); return; }
    if (toDate.getTime() < fromDate.getTime()) { setError('To date cannot be earlier than From date.'); return; }
    if (!reason.trim()) { setError('Please enter a reason.'); return; }
    // Here you can call API or navigate; for now just close
    closeAll();
  };

  const fmt = (d: Date | null) => d ? d.toDateString().slice(4) : 'Select date';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={[StyleSheet.absoluteFill, styles.modalBackdrop]} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }], maxHeight: sheetMaxHeight }]}> 
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Apply for Leave</Text>
          </View>
          <Text style={styles.sheetSub}>Fill the details to submit your leave request.</Text>
          <ScrollView style={styles.sheetContent} contentContainerStyle={styles.sheetContentContainer} showsVerticalScrollIndicator={false}>
            {/* Leave Type */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.inputRow}>
              <Pressable style={styles.dropdown} onPress={() => setShowType((v) => !v)}>
                <Text style={styles.dropdownText}>{leaveType.label}</Text>
                <Ionicons name={showType ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
              </Pressable>
            </View>
            {showType && (
              <View style={styles.dropdownMenu}>
                {LEAVE_TYPES.map((t) => (
                  <Pressable key={t.key} style={styles.dropdownItem} onPress={() => { setLeaveType(t); setShowType(false); }}>
                    <Text style={styles.dropdownItemText}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Dates */}
            <View style={styles.rowTwo}>
              <View style={[styles.col, styles.colRightGap]}>
                <Text style={styles.fieldLabel}>From date</Text>
                <Pressable style={styles.inputPressable} onPress={() => setShowCal('from')} accessibilityLabel="Pick from date">
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={styles.inputText}>{fmt(fromDate)}</Text>
                </Pressable>
              </View>
              <View style={[styles.col, styles.colLeftGap]}>
                <Text style={styles.fieldLabel}>To date</Text>
                <Pressable style={styles.inputPressable} onPress={() => setShowCal('to')} accessibilityLabel="Pick to date">
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={styles.inputText}>{fmt(toDate)}</Text>
                </Pressable>
              </View>
            </View>
            {showCal && (
              <CalendarPicker
                initialDate={(showCal === 'from' ? fromDate : toDate) ?? new Date()}
                minDate={showCal === 'to' ? fromDate ?? undefined : undefined}
                maxDate={showCal === 'from' ? toDate ?? undefined : undefined}
                onChange={(d) => {
                  if (showCal === 'from') {
                    setFromDate(d);
                    if (toDate && d.getTime() > toDate.getTime()) setToDate(d);
                  } else {
                    if (fromDate && d.getTime() < fromDate.getTime()) {
                      setError('To date cannot be earlier than From date.');
                      return; // keep calendar open
                    }
                    setToDate(d);
                  }
                  setError('');
                  setShowCal(null);
                }}
                onCancel={() => setShowCal(null)}
              />
            )}

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Type your reason..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.sheetActionsRow}>
              <Pressable style={[styles.applyNowButton, { backgroundColor: '#f3f4f6' }]} onPress={closeAll}>
                <Ionicons name="close" size={16} color="#111827" />
                <Text style={[styles.applyNowText, { color: '#111827' }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.applyNowButton, styles.actionRightBtn, { backgroundColor: '#111827' }]} onPress={submit}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={[styles.applyNowText, { color: '#fff' }]}>Submit</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

// Lightweight inline calendar picker
function CalendarPicker({ initialDate, onChange, onCancel, minDate, maxDate }: { initialDate: Date; onChange: (d: Date) => void; onCancel: () => void; minDate?: Date; maxDate?: Date }) {
  const [cursor, setCursor] = React.useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const start = new Date(year, month, 1);
  const startDay = start.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = Array(startDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (grid.length % 7 !== 0) grid.push(null);

  const label = start.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const minTs = minDate ? sod(minDate) : undefined;
  const maxTs = maxDate ? sod(maxDate) : undefined;

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeader}>
        <Pressable style={styles.calIconBtn} onPress={() => setCursor(new Date(year, month - 1, 1))}>
          <Ionicons name="chevron-back" size={18} color="#111827" />
        </Pressable>
        <Text style={styles.calTitle}>{label}</Text>
        <Pressable style={styles.calIconBtn} onPress={() => setCursor(new Date(year, month + 1, 1))}>
          <Ionicons name="chevron-forward" size={18} color="#111827" />
        </Pressable>
      </View>
      <View style={styles.calWeekRow}>
        {['S','M','T','W','T','F','S'].map((d) => (
          <Text key={d} style={styles.calWeekLabel}>{d}</Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {grid.map((day, i) => {
          const dateObj = day ? new Date(year, month, day) : null;
          const ts = dateObj ? sod(dateObj) : undefined;
          const disabled = !day || (minTs !== undefined && ts! < minTs) || (maxTs !== undefined && ts! > maxTs);
          return (
            <Pressable key={i} style={[styles.calCell, disabled && styles.calCellDisabled]} disabled={disabled} onPress={() => dateObj && onChange(dateObj)}>
              <Text style={[styles.calCellText, (!day || disabled) && styles.calCellTextDim]}>{day ?? ''}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.sheetActionsRow}>
        <Pressable style={[styles.applyNowButton, { backgroundColor: '#f3f4f6' }]} onPress={onCancel}>
          <Ionicons name="close" size={16} color="#111827" />
          <Text style={[styles.applyNowText, { color: '#111827' }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
