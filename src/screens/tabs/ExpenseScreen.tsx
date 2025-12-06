import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, LayoutChangeEvent, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitExpenseClaim, fetchExpenseCategories, fetchExpenseHistory } from '../../services/expenseClaim';
import { onboardingService } from '../../services/onboardingService';

export default function ExpenseScreen() {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Submit' | 'History'>('Submit');
  const segAnim = useRef(new Animated.Value(0)).current;
  const [segWidth, setSegWidth] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const headerGap = insets.top + 56 + 8; 
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [expDate, setExpDate] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [receiptName, setReceiptName] = useState<string>('');
  const [receiptUri, setReceiptUri] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [history, setHistory] = useState<Array<{ name: string; status: string; total: number; currency?: string | null; date?: string | null; created?: string | null; category?: string | null; description?: string | null }>>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const didLoadHistory = useRef(false);

  // No category fetching in UI-only mode

  const pickReceipt = useCallback(() => {
    setReceiptUri('placeholder://receipt');
    setReceiptName('receipt.jpg');
  }, []);

  // Ensure amount input contains only digits and decimal point (no currency symbol)
  const onAmountChange = useCallback((t: string) => {
    const cleaned = String(t || '').replace(/[^0-9.]/g, '');
    setAmount(cleaned);
  }, []);

  const onTabChange = useCallback((tab: 'Submit' | 'History') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    Animated.timing(segAnim, {
      toValue: tab === 'Submit' ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, segAnim]);

  const onSegLayout = useCallback((e: LayoutChangeEvent) => {
    setSegWidth(e.nativeEvent.layout.width);
  }, []);

  const loadCategories = useCallback(async () => {
    if (loadingCategories) return;
    try {
      setLoadingCategories(true);
      try { console.log('[expense] loadCategories start'); } catch {}
      const list = await fetchExpenseCategories().catch((e) => { try { console.warn('[expense] loadCategories error', e?.response?.data || e?.message || e); } catch {}; return [] as string[]; });
      setCategories(Array.isArray(list) ? list : []);
      try { console.log('[expense] loadCategories success', { count: Array.isArray(list) ? list.length : 0 }); } catch {}
    } catch (err) {
      try { console.warn('Expense categories load failed', err); } catch {}
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [loadingCategories]);

  useEffect(() => {
    if (showModal && categories.length === 0) {
      loadCategories();
    }
  }, [showModal, categories.length, loadCategories]);

  // Helpers for history view
  const formatAmount = useCallback((n: number, currency?: string | null): string => {
    const v = Number(n || 0);
    const symbol = currency && typeof currency === 'string' && currency.length <= 4 ? `${currency} ` : '$ ';
    try { return symbol + v.toFixed(2); } catch { return symbol + String(v); }
  }, []);

  const toMmDdYyyy = useCallback((s?: string | null): string => {
    if (!s) return '';
    try {
      const d = new Date(String(s).replace(' ', 'T'));
      if (isNaN(d.getTime())) return String(s);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = String(d.getFullYear());
      return `${mm}/${dd}/${yyyy}`;
    } catch { return String(s); }
  }, []);

  const resolveEmployeeId = useCallback(async (): Promise<string | null> => {
    try { console.log('[expense] resolveEmployeeId start'); } catch {}
    let employeeId = await AsyncStorage.getItem('employeeId');
    if (!employeeId) {
      try {
        const raw = await AsyncStorage.getItem('employeeData');
        if (raw) {
          const obj = JSON.parse(raw);
          employeeId = [
            obj?.name,
            obj?.employee,
            obj?.employee_id,
            obj?.employeeId,
            obj?.data?.name,
            obj?.data?.employee,
            obj?.data?.employee_id,
            obj?.data?.employeeId,
          ].find((v: any) => typeof v === 'string' && v.trim().length > 0) || null;
        }
      } catch {}
    }
    if (!employeeId) {
      const email = (await AsyncStorage.getItem('user_id')) || (await AsyncStorage.getItem('userEmail'));
      if (email) {
        try {
          const { getEmployeeIdByEmail, getEmployeeByEmail } = require('../../services/erpApi');
          let empId = await getEmployeeIdByEmail(email);
          if (!empId) {
            const emp = await getEmployeeByEmail(email);
            empId = emp?.name ? String(emp.name) : '';
          }
          if (empId) {
            employeeId = empId;
            try { await AsyncStorage.setItem('employeeId', employeeId); } catch {}
          }
        } catch {}
      }
    }
    try { console.log('[expense] resolveEmployeeId done', employeeId); } catch {}
    return employeeId || null;
  }, []);

  const loadHistory = useCallback(async () => {
    if (loadingHistory) return;
    setLoadingHistory(true);
    try {
      const employeeId = await resolveEmployeeId();
      if (!employeeId) { setHistory([]); return; }
      try { console.log('[expense] loadHistory start', { employeeId }); } catch {}
      const rows = await fetchExpenseHistory(employeeId, 50).catch((e) => { try { console.warn('[expense] loadHistory error', e?.response?.data || e?.message || e); } catch {}; return [] as any[]; });
      try { console.log('[expense] loadHistory rows', rows); } catch {}
      const mapped = (rows || []).map((r: any) => ({
        name: r.name,
        status: String(r.status || 'Pending'),
        total: Number(r.total || 0) || 0,
        currency: r.currency || null,
        date: r.posting_date || r.modified || r.creation || null,
        created: r.creation || null,
        category: r.expense_type || null,
        description: r.description || null,
      }));
      try { console.log('[expense] loadHistory mapped', mapped); } catch {}
      setHistory(mapped);
      try { console.log('[expense] loadHistory success', { count: mapped.length }); } catch {}
    } finally { setLoadingHistory(false); }
  }, [resolveEmployeeId, loadingHistory]);

  useEffect(() => {
    if (activeTab === 'History' && !didLoadHistory.current) {
      didLoadHistory.current = true;
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    const cat = String(category || '').trim();
    const amt = Number(String(amount || '').replace(/[^0-9.\-]/g, '')) || 0;
    const rawDate = String(expDate || '').trim();
    const description = String(desc || '').trim();
    try { console.log('[expense] submit click', { cat, amt, rawDate, hasReceipt: !!receiptUri }); } catch {}

    if (!cat) { Alert.alert('Missing field', 'Please choose a category.'); return; }
    if (!amt || !(amt > 0)) { Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.'); return; }
    if (!rawDate) { Alert.alert('Missing field', 'Please enter the expense date.'); return; }

    // Accept dd/mm/yyyy or yyyy-mm-dd; normalize to YYYY-MM-DD
    const toIsoDate = (s: string) => {
      const t = s.trim();
      const m1 = t.match(/^([0-3]?\d)[/.-]([0-1]?\d)[/.-](\d{4})$/); // dd/mm/yyyy
      if (m1) {
        const dd = m1[1].padStart(2, '0');
        const mm = m1[2].padStart(2, '0');
        const yyyy = m1[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      const m2 = t.match(/^(\d{4})[-/.]([0-1]?\d)[-/.]([0-3]?\d)$/); // yyyy-mm-dd
      if (m2) {
        const yyyy = m2[1];
        const mm = m2[2].padStart(2, '0');
        const dd = m2[3].padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return t; // as-is; backend may validate
    };
    const expense_date = toIsoDate(rawDate);

    try {
      setSubmitting(true);
      try { console.log('[expense] resolving employeeId'); } catch {}
      // Resolve employeeId from storage
      let employeeId = await AsyncStorage.getItem('employeeId');
      if (!employeeId) {
        try {
          const raw = await AsyncStorage.getItem('employeeData');
          if (raw) {
            const obj = JSON.parse(raw);
            employeeId = [
              obj?.name,
              obj?.employee,
              obj?.employee_id,
              obj?.employeeId,
              obj?.data?.name,
              obj?.data?.employee,
              obj?.data?.employee_id,
              obj?.data?.employeeId,
            ].find((v: any) => typeof v === 'string' && v.trim().length > 0) || null;
          }
        } catch {}
      }
      // Try resolving via user email if still missing (same pattern as HomeScreen)
      if (!employeeId) {
        const email = (await AsyncStorage.getItem('user_id')) || (await AsyncStorage.getItem('userEmail'));
        if (email) {
          try {
            const { getEmployeeIdByEmail, getEmployeeByEmail } = require('../../services/erpApi');
            let empId = await getEmployeeIdByEmail(email);
            if (!empId) {
              const emp = await getEmployeeByEmail(email);
              empId = emp?.name ? String(emp.name) : '';
            }
            if (empId) {
              employeeId = empId;
              try { await AsyncStorage.setItem('employeeId', employeeId); } catch {}
            }
          } catch {}
        }
      }
      try { console.log('[expense] employeeId resolved', employeeId); } catch {}
      if (!employeeId) { Alert.alert('Not ready', 'Employee ID not found.'); return; }

      // Resolve company for employee (used by ERP to infer default accounts)
      let company: string | undefined = undefined;
      try {
        const c = await onboardingService.getEmployeeCompany(String(employeeId));
        if (c) company = String(c);
      } catch {}
      try { console.log('[expense] employee company', company || null); } catch {}

      const payload = {
        employee: String(employeeId),
        expense_type: cat,
        amount: amt,
        expense_date,
        description,
        company,
        // receipt info is currently UI-only; uploading can be added later
      } as const;
      try { console.log('[expense] submit payload', payload); } catch {}
      const result = await submitExpenseClaim(payload as any);
      try { console.log('[expense] submit result', result); } catch {}

      Alert.alert('Submitted', 'Your expense claim has been submitted.');
      setShowModal(false);
      setCategory('');
      setAmount('');
      setExpDate('');
      setDesc('');
      setReceiptUri('');
      setReceiptName('');
      // Refresh history tab after successful submit
      try {
        didLoadHistory.current = false;
        setActiveTab('History');
        // Kick off load explicitly for immediate refresh
        loadHistory();
      } catch {}
    } catch (err: any) {
      try { console.error('[expense] submit error', err?.response?.data || err?.message || err); } catch {}
      const raw = err?.response?.data || err;
      const msg = raw?.message || err?.message || 'Submission failed';
      const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (/set the default account for the\s*expense claim type/i.test(text)) {
        Alert.alert(
          'Setup Required',
          'Please set a Default Account for this Expense Claim Type in ERPNext (Expense Claim Type > Accounts), then try again.'
        );
      } else {
        Alert.alert('Failed', String(text));
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, category, amount, expDate, desc]);


  return (
    <View style={styles.screen}>
      {false && (
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
      )}

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
              <Pressable style={styles.primaryBtn} onPress={() => { setCategory(''); setAmount(''); setExpDate(''); setDesc(''); setReceiptUri(''); setReceiptName(''); setShowModal(true); }}>
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
            {loadingHistory ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator size="small" color="#6b7280" />
                <Text style={[styles.cardSubtitle, { marginTop: 8 }]}>Loading history...</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.card, { alignItems: 'center', paddingVertical: 28, alignSelf: 'stretch', marginHorizontal: 16, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent' }] }>
                  <Image
                    source={require('../../assets/images/expense/expense.png')}
                    style={{ width: 120, height: 120, opacity: 0.18 }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.cardTitle, { marginTop: 12 }]}>No expense history</Text>
                  <Text style={[styles.cardSubtitle, { textAlign: 'center' }]}>Your expense claims will appear here.</Text>
                </View>
              </View>
            ) : (
              history.map((h) => (
                <ExpenseItem
                  key={h.name}
                  status={/approved/i.test(h.status) ? 'Approved' : /reject/i.test(h.status) ? 'Rejected' : 'Pending'}
                  title={h.category || 'Expense Claim'}
                  amount={`${formatAmount(h.total, h.currency)}`}
                  desc={h.description ? String(h.description) : ''}
                  date={toMmDdYyyy(h.date || h.modified || h.creation || null)}
                  submitted={toMmDdYyyy(h.created || h.modified || h.date || null)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
      {showModal && (
        <View style={[styles.modalOverlay, { top: headerGap }]}>
          <View style={[
            styles.modalCard,
            { paddingBottom: insets.bottom + 12, maxHeight: Math.max(320, Math.round(Dimensions.get('window').height - headerGap - insets.bottom - 8)) }
          ]}>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Expense Claim</Text>
              <Pressable onPress={() => setShowModal(false)} accessibilityRole="button">
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Submit a new expense reimbursement request</Text>
            <Text style={styles.fieldLabel}>Category <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <Pressable style={styles.inputRow} onPress={() => setCategoryOpen((v) => !v)}>
              <Ionicons name="list-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
              <Text style={[styles.placeholderText, { color: category ? '#111827' : '#9ca3af' }]}>{category || 'Select category'}</Text>
              <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
            </Pressable>
            {categoryOpen && (
              <View style={styles.dropdown}>
                {loadingCategories ? (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.dropdownText}>Loading categories...</Text>
                  </View>
                ) : categories.length > 0 ? (
                  categories.map((opt) => (
                    <Pressable 
                      key={opt} 
                      style={styles.dropdownItem} 
                      onPress={() => { 
                        setCategory(opt); 
                        setCategoryOpen(false); 
                      }}
                    >
                      <Text style={styles.dropdownText}>{opt}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.dropdownText}>No categories found</Text>
                  </View>
                )}
              </View>
            )}
            <Text style={styles.fieldLabel}>Amount <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
              <TextInput
                value={amount}
                onChangeText={onAmountChange}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                style={styles.textInput}
              />
            </View>

            {/* Date */}
            <Text style={styles.fieldLabel}>Expense Date <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
              <TextInput
                value={expDate}
                onChangeText={setExpDate}
                placeholder="dd/mm/yyyy"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
                style={styles.textInput}
              />
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <View style={[styles.inputRow, { height: 90, alignItems: 'flex-start', paddingTop: 8 }] }>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Describe the expense..."
                placeholderTextColor="#9ca3af"
                multiline
                style={[styles.textInput, { textAlignVertical: 'top' }]}
              />
            </View>

            {/* Receipt upload */}
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Receipt (Optional)</Text>
            <View style={styles.uploadBox}>
              {receiptUri ? (
                <>
                  <Ionicons name="document-text-outline" size={22} color="#2563eb" />
                  <Text style={styles.fileName}>{receiptName || 'Selected file'}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <Pressable style={[styles.secondaryBtn, { marginRight: 8 }]} onPress={() => { setReceiptName(''); setReceiptUri(''); }}>
                      <Ionicons name="trash-outline" size={14} color="#111827" />
                      <Text style={styles.secondaryBtnText}>Remove</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={pickReceipt}>
                      <Ionicons name="swap-vertical" size={14} color="#111827" />
                      <Text style={styles.secondaryBtnText}>Change</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={22} color="#6b7280" />
                  <Text style={[styles.placeholderText, { color: '#6b7280', marginTop: 8 }]}>Upload receipt image</Text>
                  <Pressable style={styles.secondaryBtn} onPress={pickReceipt}>
                    <Ionicons name="document-outline" size={14} color="#111827" />
                    <Text style={styles.secondaryBtnText}>Choose File</Text>
                  </Pressable>
                </>
              )}
            </View>

            <Pressable
              style={[
                styles.primaryBtn,
                { alignSelf: 'stretch', marginTop: 12, opacity: submitting ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Submitting...' : 'Submit Claim'}</Text>
            </Pressable>
            </ScrollView>
          </View>
        </View>
      )}
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.historyTitle}>{title}</Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg, marginLeft: 8, marginTop: 0 }]}>
              <Ionicons name={s.icon} size={14} color={s.color} />
              <Text style={[styles.statusText, { color: s.color }]}>{status}</Text>
            </View>
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
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b1b', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginTop: 14 },
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

  // Modal styles
  modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'stretch' },
  modalCard: { backgroundColor: '#fff', width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  modalContent: { paddingBottom: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#111827', fontWeight: '700' },
  modalSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  fieldLabel: { color: '#111827', fontWeight: '700', marginTop: 12 },
  inputRow: { height: 40, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#f9fafb', marginTop: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  leftIcon: { color: '#6b7280', marginRight: 6 },
  placeholderText: { color: '#9ca3af', flex: 1 },
  fileName: { color: '#111827', marginTop: 8 },
  textInput: { flex: 1, color: '#111827' },
  uploadBox: { borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 8 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  secondaryBtnText: { color: '#111827', fontWeight: '700', marginLeft: 6 },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10 },
  dropdownText: { color: '#111827' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
