import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, LayoutChangeEvent } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExpenseScreen() {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Submit' | 'History'>('Submit');
  const segAnim = useRef(new Animated.Value(0)).current; // 0 -> Submit, 1 -> History
  const [segWidth, setSegWidth] = useState(0);

  const onTabChange = (tab: 'Submit' | 'History') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    Animated.timing(segAnim, {
      toValue: tab === 'Submit' ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const onSegLayout = (e: LayoutChangeEvent) => {
    setSegWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.screen}>
      {/* Fixed header */}
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Expense Reimbursement</Text>
        </View>
        <Text style={styles.headerSubtitle}>Submit and track your expense claims</Text>

        <View style={styles.metricRow}>
          <Metric label="Total" value="$385.49" />
          <Metric label="Pending" value="$45.50" accent="#f59e0b" />
          <Metric label="Approved" value="$250.00" accent="#059669" />
        </View>
      </View>

      {/* Scrollable content filling remaining space */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Tabs */}
        <View style={styles.segmentWrap} onLayout={onSegLayout}>
          {/* Animated indicator */}
          {segWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentIndicator,
                {
                  width: (segWidth - 6) / 2,
                  transform: [
                    {
                      translateX: segAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [3, 3 + (segWidth - 6) / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          <Pressable onPress={() => onTabChange('Submit')} style={styles.segmentBtn}>
            <Text style={[styles.segmentText, activeTab === 'Submit' && styles.segmentTextActive]}>Submit</Text>
          </Pressable>
          <Pressable onPress={() => onTabChange('History')} style={styles.segmentBtn}>
            <Text style={[styles.segmentText, activeTab === 'History' && styles.segmentTextActive]}>History</Text>
          </Pressable>
        </View>

        {activeTab === 'Submit' ? (
          <>
            {/* Submit new expense card */}
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="cash-outline" size={26} color="#111827" />
              </View>
              <Text style={styles.cardTitle}>Submit New Expense</Text>
              <Text style={styles.cardSubtitle}>Create a reimbursement request for your business expenses</Text>
              <Pressable style={styles.primaryBtn}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>New Expense Claim</Text>
              </Pressable>
            </View>

            {/* Tips box */}
            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>Tips for Quick Approval</Text>
              {[
                'Always attach clear receipt images',
                'Provide detailed descriptions',
                'Submit claims within 30 days',
                'Ensure amounts match receipts',
              ].map((t) => (
                <View key={t} style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* History list */}
            <ExpenseItem status="Approved" title="Travel" amount="$250.00" desc="Client meeting - Taxi fare" date="10/15/2025" submitted="10/16/2025" />
            <ExpenseItem status="Pending" title="Meals" amount="$45.50" desc="Team lunch during project meeting" date="10/18/2025" submitted="10/18/2025" />
            <ExpenseItem status="Rejected" title="Office Supplies" amount="$89.99" desc="Stationery and printer supplies" date="10/10/2025" submitted="10/11/2025" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function ExpenseItem({ status, title, amount, desc, date, submitted }: { status: 'Approved' | 'Pending' | 'Rejected'; title: string; amount: string; desc: string; date: string; submitted: string }) {
  const map = {
    Approved: { color: '#059669', bg: '#e8faf3', icon: 'checkmark-circle' as const },
    Pending: { color: '#b45309', bg: '#fde7cf', icon: 'time-outline' as const },
    Rejected: { color: '#dc2626', bg: '#fde2e2', icon: 'close-circle' as const },
  } as const;
  const s = map[status];
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyTitle}>{title}</Text>
          <View style={[styles.statusPill, { backgroundColor: s.bg }] }>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={[styles.statusText, { color: s.color }]}>{status}</Text>
          </View>
        </View>
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <Text style={styles.historyDesc}>{desc}</Text>
      <View style={styles.historyMetaRow}>
        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
        <Text style={styles.metaText}>{date}</Text>
        <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginLeft: 12 }} />
        <Text style={styles.metaText}>Submitted {submitted}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingBottom: 24 },

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
  metricCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 },
  metricLabel: { color: '#6b7280', fontSize: 11 },
  metricValue: { color: '#111827', fontWeight: '700', marginTop: 4 },

  // Segmented control
  segmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 16,
    height: 36,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    backgroundColor: '#0b0b1b',
    borderRadius: 10,
  },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  segmentText: { color: '#111827', fontWeight: '700' },
  segmentTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 12, padding: 14, marginTop: 12, alignItems: 'center' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  cardTitle: { color: '#111827', fontWeight: '700', marginTop: 12 },
  cardSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 4, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0b0b1b', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginTop: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },

  tipBox: { backgroundColor: '#eef5ff', borderRadius: 12, borderWidth: 1, borderColor: '#c7dbff', padding: 12, margin: 12 },
  tipTitle: { color: '#111827', fontWeight: '700', marginBottom: 6 },
  tipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tipText: { color: '#374151' },

  // History styles
  historyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 12, padding: 12, marginTop: 12 },
  historyTop: { flexDirection: 'row', alignItems: 'center' },
  historyTitle: { color: '#111827', fontWeight: '700' },
  amount: { color: '#111827', fontWeight: '700' },
  historyDesc: { color: '#6b7280', marginTop: 6 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaText: { color: '#6b7280', marginLeft: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 },
  statusText: { fontWeight: '700', marginLeft: 6, fontSize: 12 },
});
