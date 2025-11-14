import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, FlatList } from 'react-native';
 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();

  const balances = [
    { key: 'annual', name: 'Annual Leave', used: 6, total: 30 },
    { key: 'sick', name: 'Sick Leave', used: 2, total: 10 },
    { key: 'casual', name: 'Casual Leave', used: 1, total: 5 },
  ];

  const requests = React.useMemo(
    () => [
      { id: 'REQ-1005', type: 'Annual Leave', desc: 'Family vacation', from: 'Oct 20, 2025', to: 'Oct 22, 2025', days: 3, status: 'Pending' },
      { id: 'REQ-1004', type: 'Sick Leave', desc: 'Medical appointment', from: 'Oct 10, 2025', to: 'Oct 11, 2025', days: 2, status: 'Approved' },
    ],
    []
  );

  const [showApplyModal, setShowApplyModal] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState<string>('Annual Leave');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');

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
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <Text style={styles.headerSubtitle}>Apply and track your leave</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        {balances.map((b) => {
          const pct = Math.min(100, Math.max(0, Math.round((b.used / (b.total || 1)) * 100)));
          return (
            <View key={b.key} style={styles.balanceItemCard}>
              <View style={styles.rowTop}>
                <Text style={styles.progressLabel}>{b.name}</Text>
                <Text style={styles.progressValue}>{b.used}/{b.total} days</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
            </View>
          );
        })}

        <View style={styles.applyCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.applyTitle}>Apply for Leave</Text>
            <Text style={styles.applySubtitle}>Submit a new leave request</Text>
          </View>
          <Pressable
            onPress={() => setShowApplyModal(true)}
            style={({ pressed }) => [styles.applyButton, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </Pressable>
        </View>

        <Text style={styles.historyTitle}>Leave Requests</Text>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.historyList}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <View style={styles.historyTopRow}>
                <Text style={styles.historyType}>{item.type}</Text>
                <View style={[
                  styles.statusPill,
                  item.status === 'Approved' ? styles.statusApproved : item.status === 'Pending' ? styles.statusPending : styles.statusRejected,
                ]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.historyDesc}>{item.desc}</Text>
              <View style={styles.historyDateRow}>
                <Text style={styles.historyDateIcon}>📅</Text>
                <Text style={styles.historyDates}>{item.from}</Text>
                <Text style={styles.historyArrow}> → </Text>
                <Text style={styles.historyDates}>{item.to}</Text>
              </View>
              <Text style={styles.historyDays}>{item.days} days</Text>
            </View>
          )}
        />
      </ScrollView>

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
              {['Annual Leave', 'Sick Leave', 'Casual Leave'].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setLeaveType(t)}
                  style={[styles.typeChip, leaveType === t && styles.typeChipSelected]}
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
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#0b0b1b' },
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
