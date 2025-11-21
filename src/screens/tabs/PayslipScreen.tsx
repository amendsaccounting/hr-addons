import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

export default function PayslipScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const pay = {
    period: 'Oct 2025',
    employee: 'John Doe',
    empId: 'EMP-0001',
    netPay: 'AED 7,850.00',
    gross: 'AED 9,000.00',
    deductions: 'AED 1,150.00',
    payDate: 'Oct 28, 2025',
    bank: 'HSBC •••• 1234',
    components: [
      { label: 'Basic', amount: 'AED 5,000.00' },
      { label: 'Housing Allowance', amount: 'AED 2,000.00' },
      { label: 'Transport Allowance', amount: 'AED 1,000.00' },
      { label: 'Other Allowance', amount: 'AED 1,000.00' },
    ],
    deductionsList: [
      { label: 'Social Insurance', amount: 'AED 600.00' },
      { label: 'Loan', amount: 'AED 550.00' },
    ],
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b1b" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }] }>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Payslip</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.summaryCard}>
          <Text style={styles.period}>{pay.period}</Text>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPay}>{pay.netPay}</Text>
          <View style={styles.rowBetween}> 
            <Text style={styles.subLabel}>Gross</Text>
            <Text style={styles.subValue}>{pay.gross}</Text>
          </View>
          <View style={styles.rowBetween}> 
            <Text style={styles.subLabel}>Deductions</Text>
            <Text style={styles.subValueDanger}>{pay.deductions}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employee</Text>
          <View style={styles.rowBetween}><Text style={styles.itemLabel}>Name</Text><Text style={styles.itemValue}>{pay.employee}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.itemLabel}>Employee ID</Text><Text style={styles.itemValue}>{pay.empId}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.itemLabel}>Pay Date</Text><Text style={styles.itemValue}>{pay.payDate}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.itemLabel}>Bank</Text><Text style={styles.itemValue}>{pay.bank}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings</Text>
          {pay.components.map((c) => (
            <View key={c.label} style={styles.rowBetween}> 
              <Text style={styles.itemLabel}>{c.label}</Text>
              <Text style={styles.itemValue}>{c.amount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deductions</Text>
          {pay.deductionsList.map((d) => (
            <View key={d.label} style={styles.rowBetween}> 
              <Text style={styles.itemLabel}>{d.label}</Text>
              <Text style={styles.itemValueDanger}>{d.amount}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0b0b1b', paddingBottom: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700' },
  content: { padding: 12 },
  summaryCard: { backgroundColor: '#0b0b1b', borderRadius: 14, padding: 14, marginBottom: 12 },
  period: { color: '#cbd5e1', marginBottom: 6 },
  netPayLabel: { color: '#cbd5e1', fontSize: 12 },
  netPay: { color: '#fff', fontWeight: '800', fontSize: 22, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  subLabel: { color: '#94a3b8' },
  subValue: { color: '#e2e8f0', fontWeight: '600' },
  subValueDanger: { color: '#fecaca', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
  cardTitle: { color: '#111827', fontWeight: '700', marginBottom: 6 },
  itemLabel: { color: '#6b7280' },
  itemValue: { color: '#111827', fontWeight: '600' },
  itemValueDanger: { color: '#b91c1c', fontWeight: '700' },
});
