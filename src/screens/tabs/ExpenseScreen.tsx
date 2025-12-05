import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, LayoutChangeEvent, TextInput, Alert, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import erpNextService, { fetchExpenseCategories } from '../../services/expenseClaim';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ExpenseScreen() {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Submit' | 'History'>('Submit');
  const segAnim = useRef(new Animated.Value(0)).current; // 0 -> Submit, 1 -> History
  const [segWidth, setSegWidth] = useState(0);
  const [showModal, setShowModal] = useState(false);
  // Use a consistent gap below the AppHeader
  const headerGap = insets.top + 56 + 8; // safe area + header height + small spacing
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState<string>('');
const [categories, setCategories] = useState<string[]>([]);
const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('');
  const [expDate, setExpDate] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [receiptName, setReceiptName] = useState<string>('');
  const [receiptUri, setReceiptUri] = useState<string>('');

// Then in your useEffect, use it like this:
useEffect(() => {
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const fetchedCategories = await erpNextService.fetchExpenseCategories();
       console.log("fetchedCategories====>",fetchedCategories);
      setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(['Travel', 'Meals', 'Office Supplies', 'Software', 'Other']);
    } finally {
      setLoadingCategories(false);
    }
  };
  loadCategories();
}, []);

  const pickReceipt = async () => {
    try {
      // Try DocumentPicker first
      try {
        const DPmod: any = (require('react-native-document-picker') as any);
        const DocumentPicker = DPmod?.default || DPmod;
        if (DocumentPicker?.pickSingle) {
          const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.images, DocumentPicker.types.pdf] });
          const uri = res?.uri || '';
          const name = res?.name || (uri ? uri.split('/').pop() : 'file');
          if (uri) { setReceiptUri(uri); setReceiptName(String(name || 'file')); return; }
        }
      } catch (e: any) {
        // ignore and fall back
      }

      // Fallback to ImagePicker (photo library)
      try {
        const IP: any = require('react-native-image-picker');
        const launchImageLibrary = IP?.launchImageLibrary;
        if (launchImageLibrary) {
          const resp = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
          const asset = resp?.assets?.[0];
          if (asset?.uri) { setReceiptUri(asset.uri); setReceiptName(asset.fileName || 'photo'); return; }
        }
      } catch (e) {
        // ignore
      }

      Alert.alert('Setup Needed', 'Please install react-native-document-picker or react-native-image-picker to pick a receipt file.');
    } catch (err) {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

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

// const handleSubmit = async () => {
//   if (!category || !amount || !expDate) {
//     Alert.alert('Error', 'Please fill in all required fields');
//     return;
//   }
//   try {
//     const expenseData = {
//       category,
//       amount: parseFloat(amount),
//       date: expDate,
//       description: desc
//     };

//     console.log('Submitting expense:', JSON.stringify(expenseData, null, 2));
//     const result = await erpNextService.submitExpenseClaim(expenseData);
//     console.log('API Response:', JSON.stringify(result, null, 2));
    
//     if (result.success) {
//       Alert.alert('Success', 'Expense submitted successfully!');
//       setShowModal(false);
//       setCategory('');
//       setAmount('');
//       setExpDate('');
//       setDesc('');
//     } else {
//       Alert.alert('Error', result.message || 'Failed to submit expense');
//     }
//   } catch (error: any) {  // Add type annotation here
//     console.error('Detailed error:', {
//       message: error.message,
//       response: error.response?.data,
//       status: error.response?.status,
//     });
//     Alert.alert('Error', error.message || 'An error occurred while submitting the expense');
//   }
// };

const handleSubmit = async () => {
  // Basic required validations
  if (!category?.trim() || !amount?.trim() || !expDate?.trim() || !desc?.trim()) {
    Alert.alert('Missing Fields', 'Please fill in category, amount, date and description.');
    return;
  }

  try {
    const employeeId = await AsyncStorage.getItem('employeeId');
    if (!employeeId) {
      Alert.alert('Error', 'Could not determine employee information. Please log in again.');
      return;
    }

    // Build input for service
    const input = {
      employeeId: String(employeeId),
      category: String(category),
      amount: String(amount),
      expenseDate: String(expDate), // expected DD/MM/YYYY by service
      description: String(desc),
      receiptUri: receiptUri || undefined,
      receiptName: receiptName || undefined,
    } as const;

    console.log('[expense] submit input', input);
    const result = await erpNextService.submitExpenseClaim(input as any);
    console.log('[expense] submit result', result);

    if (result?.success) {
      Alert.alert('Success', result.message || 'Expense submitted successfully!');
      setShowModal(false);
      setCategory('');
      setAmount('');
      setExpDate('');
      setDesc('');
      setReceiptUri('');
      setReceiptName('');
    } else {
      Alert.alert('Error', result?.message || 'Failed to submit expense');
    }
  } catch (error: any) {
    console.error('[expense] submit error', error);
    Alert.alert('Error', error?.message || 'An error occurred while submitting the expense');
  }
};


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
              <Pressable style={styles.primaryBtn} onPress={() => setShowModal(true)}>
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
            <ExpenseItem status="Approved" title="Travel" amount="$250.00" desc="Client meeting - Taxi fare" date="10/15/2025" submitted="10/16/2025" />
            <ExpenseItem status="Pending" title="Meals" amount="$45.50" desc="Team lunch during project meeting" date="10/18/2025" submitted="10/18/2025" />
            <ExpenseItem status="Rejected" title="Office Supplies" amount="$89.99" desc="Stationery and printer supplies" date="10/10/2025" submitted="10/11/2025" />
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
                onChangeText={setAmount}
                placeholder="$ 0.00"
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
              style={[styles.primaryBtn, { alignSelf: 'stretch', marginTop: 12 }]}
         onPress={handleSubmit}
            >
              <Text style={styles.primaryBtnText}>Submit Claim</Text>
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
});
