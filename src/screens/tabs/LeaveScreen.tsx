import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  type ReqItem = { id: string; title: string; subtitle: string; status: 'Pending' | 'Approved' | 'Rejected' | string; start: string; end: string };
  const requests: ReqItem[] = React.useMemo(() => [
    { id: '1', title: 'Annual Leave', subtitle: 'Family vacation', status: 'Pending', start: 'Oct 20, 2025', end: 'Oct 22, 2025' },
    { id: '2', title: 'Sick Leave', subtitle: 'Flu recovery', status: 'Approved', start: 'Sep 12, 2025', end: 'Sep 13, 2025' },
    { id: '3', title: 'Casual Leave', subtitle: 'Personal errand', status: 'Rejected', start: 'Aug 02, 2025', end: 'Aug 02, 2025' },
  ], []);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}> 
        <Text style={styles.headerTitle}>Leave Management</Text>
        <Text style={styles.headerSub}>Apply and track your leave</Text>
      </View>

      <FlatList
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        data={requests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ContentHeader />}
        renderItem={({ item }) => (
          <RequestCard
            title={item.title}
            subtitle={item.subtitle}
            status={item.status}
            dateRange={{ start: item.start, end: item.end }}
          />
        )}
        ListFooterComponent={<View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={5}
        windowSize={10}
      />
    </View>
  );
}

function BalanceCard({ label, valueText, progress }: { label: string; valueText: string; progress: number }) {
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
}

function ContentHeader() {
  return (
    <View>
      <Text style={styles.sectionTitle}>Leave Balance</Text>
      <BalanceCard label="Annual Leave" valueText="12/20" progress={12/20} />
      <BalanceCard label="Sick Leave" valueText="8/10" progress={8/10} />
      <BalanceCard label="Casual Leave" valueText="3/5" progress={3/5} />

      <Pressable style={styles.applyButton} accessibilityRole="button" accessibilityLabel="Apply for Leave">
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.applyButtonText}>Apply for Leave</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Leave Requests</Text>
    </View>
  );
}

function RequestCard({
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
        <Ionicons name="arrow-forward" size={14} color="#6b7280" style={{ marginHorizontal: 6 }} />
        <Text style={styles.reqDateText}>  {dateRange.end}</Text>
      </View>
    </View>
  );
}

function statusStyle(status: string) {
  switch (status.toLowerCase()) {
    case 'approved':
      return { backgroundColor: '#10b98122', borderColor: '#10b981' };
    case 'rejected':
      return { backgroundColor: '#ef444422', borderColor: '#ef4444' };
    default:
      return { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' };
  }
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

  applyButton: {
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 14,
    backgroundColor: '#0b0b1b',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  applyButtonText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 13 },

  reqTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  reqSubtitle: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#111827' },

  reqDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  reqDateText: { color: '#6b7280', fontSize: 12 },
  reqDateArrow: { color: '#6b7280', marginHorizontal: 6 },
});
