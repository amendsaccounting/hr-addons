import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Animated, 
  Easing, 
  LayoutChangeEvent, 
  TextInput, 
  Alert, 
  Dimensions, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  fetchExpenseHistory, 
  submitExpenseClaimSimple, 
  fetchExpenseClaimTypes,
  parseAmount,
  toISODateFromUser,
  ERPValidationError,
  ERPConfigError,
  ExpenseClaimHistoryItem 
} from '../../services/expenseClaim';

// Type definitions
interface ExpenseType {
  name: string;
  default_account: string | null;
}

interface ExpenseClaimForm {
  category: ExpenseType | null;
  amount: string;
  expDate: string;
  desc: string;
  receiptName: string;
  receiptUri: string;
}

export default function ExpenseScreen() {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Submit' | 'History'>('Submit');
  const segAnim = useRef(new Animated.Value(0)).current;
  const [segWidth, setSegWidth] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const MODAL_TOP_GAP = 12;

  // Modal form state
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [formData, setFormData] = useState<ExpenseClaimForm>({
    category: null,
    amount: '',
    expDate: '',
    desc: '',
    receiptName: '',
    receiptUri: ''
  });

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<ExpenseClaimHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Fixed metrics calculation - handle undefined/empty history
  const metrics = useMemo(() => {
    // Ensure history is an array before using reduce
    const safeHistory = Array.isArray(history) ? history : [];
    
    const total = safeHistory.reduce((sum, item) => sum + (item.total_claimed_amount || 0), 0);
    const pending = safeHistory
      .filter(item => item.status?.toLowerCase().includes('pending'))
      .reduce((sum, item) => sum + (item.total_claimed_amount || 0), 0);
    const approved = safeHistory
      .filter(item => item.status?.toLowerCase().includes('approved') || item.status?.toLowerCase().includes('paid'))
      .reduce((sum, item) => sum + (item.total_claimed_amount || 0), 0);

    return {
      total: `$${total.toFixed(2)}`,
      pending: `$${pending.toFixed(2)}`,
      approved: `$${approved.toFixed(2)}`
    };
  }, [history]);

  // Enhanced file picker with better error handling
  const pickReceipt = async () => {
    try {
      // Try DocumentPicker first
      try {
        const DPmod: any = await import('react-native-document-picker');
        const DocumentPicker = DPmod?.default || DPmod;
        if (DocumentPicker?.pickSingle) {
          const res = await DocumentPicker.pickSingle({ 
            type: [DocumentPicker.types.images, DocumentPicker.types.pdf] 
          });
          const uri = res?.uri || '';
          const name = res?.name || (uri ? uri.split('/').pop() : 'file');
          if (uri) { 
            setFormData(prev => ({ ...prev, receiptUri: uri, receiptName: String(name || 'file') })); 
            return; 
          }
        }
      } catch (e: any) {
        if (!e?.message?.includes('cancel')) {
          console.warn('DocumentPicker failed:', e);
        }
      }

      // Fallback to ImagePicker
      try {
        const IP: any = await import('react-native-image-picker');
        const launchImageLibrary = IP?.launchImageLibrary || IP?.default?.launchImageLibrary;
        if (launchImageLibrary) {
          const resp = await launchImageLibrary({ 
            mediaType: 'photo', 
            selectionLimit: 1,
            quality: 0.8 
          });
          const asset = resp?.assets?.[0];
          if (asset?.uri) { 
            setFormData(prev => ({ ...prev, receiptUri: asset.uri, receiptName: asset.fileName || 'photo' })); 
            return; 
          }
        }
      } catch (e) {
        console.warn('ImagePicker failed:', e);
      }

      Alert.alert(
        'Setup Needed', 
        'Please install react-native-document-picker or react-native-image-picker to pick a receipt file.'
      );
    } catch (err) {
      console.error('File picker error:', err);
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

  // Enhanced employee ID loading
  useEffect(() => {
    const loadEmployeeId = async () => {
      try {
        const rows = await AsyncStorage.multiGet(['employeeId', 'employeeData']);
        const map = Object.fromEntries(rows || []);
        
        // Try direct employeeId first
        const id = map['employeeId'];
        if (id) { 
          setEmployeeId(id); 
          return; 
        }
        
        // Parse employeeData for employee ID
        const raw = map['employeeData'];
        if (raw) {
          try {
            const obj = JSON.parse(raw);
            const candidate = [
              obj?.name,
              obj?.employee,
              obj?.employee_id,
              obj?.employeeId,
              obj?.data?.name,
              obj?.data?.employee,
              obj?.data?.employee_id,
              obj?.data?.employeeId,
            ].find((v: any) => typeof v === 'string' && v.trim().length > 0);
            
            if (candidate) {
              setEmployeeId(String(candidate).trim());
            }
          } catch (parseError) {
            console.warn('Failed to parse employeeData:', parseError);
          }
        }
      } catch (error) {
        console.error('Failed to load employee ID:', error);
      }
    };

    loadEmployeeId();
  }, []);

  // Enhanced expense history loading with pull-to-refresh
  const loadExpenseHistory = async () => {
    if (!employeeId) {
      setHistory([]);
      return;
    }
    
    try {
      setLoadingHistory(true);
      const list = await fetchExpenseHistory(employeeId, 100);
      // Ensure we always set an array, even if the API returns undefined/null
      setHistory(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Expense history load failed', err);
      Alert.alert('Error', 'Failed to load expense history');
      setHistory([]); // Ensure history is always an array
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'History') {
      loadExpenseHistory();
    }
  }, [activeTab, employeeId, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenseHistory();
  };

  // Enhanced expense types loading
  useEffect(() => {
    let mounted = true;
    
    const loadExpenseTypes = async () => {
      try {
        setLoadingTypes(true);
        const list = await fetchExpenseClaimTypes(200);
        if (!mounted) return;
        setTypes(Array.isArray(list) ? list : []);
      } catch (error) {
        console.warn('Failed to load expense types:', error);
        if (mounted) setTypes([]);
      } finally {
        if (mounted) setLoadingTypes(false);
      }
    };

    loadExpenseTypes();
    return () => { mounted = false; };
  }, []);

  // Form handling functions
  const updateFormData = (updates: Partial<ExpenseClaimForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setFormData({
      category: null,
      amount: '',
      expDate: '',
      desc: '',
      receiptName: '',
      receiptUri: ''
    });
    setCategoryOpen(false);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    if (!formData.category) {
      Alert.alert('Missing Category', 'Please select a category.');
      return false;
    }
    
    if (!formData.amount || parseAmount(formData.amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return false;
    }
    
    if (!formData.expDate) {
      Alert.alert('Missing Date', 'Please enter expense date.');
      return false;
    }
    
    const isoDate = toISODateFromUser(formData.expDate);
    if (!isoDate) {
      Alert.alert('Invalid Date', 'Please enter a valid date in DD/MM/YYYY or YYYY-MM-DD format.');
      return false;
    }
    
    if (!formData.desc.trim()) {
      Alert.alert('Missing Description', 'Please enter a brief description.');
      return false;
    }
    
    if (!employeeId) {
      Alert.alert('Not Ready', 'Employee profile not loaded yet. Please try again.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      await submitExpenseClaimSimple({
        employee: employeeId!,
        category: formData.category!.name,
        amount: formData.amount,
        expenseDate: formData.expDate,
        description: formData.desc,
      });
      
      Alert.alert('Success', 'Your expense claim has been submitted successfully.');
      closeModal();
      setRefreshKey(prev => prev + 1);
      setActiveTab('History');
      
    } catch (err: any) {
      console.error('Submission error:', err);
      
      let errorMessage = 'Failed to submit claim. Please try again.';
      
      if (err instanceof ERPValidationError) {
        errorMessage = err.message;
      } else if (err instanceof ERPConfigError) {
        errorMessage = 'System configuration error. Please contact support.';
      } else if (err?.response?.data) {
        const serverData = err.response.data;
        errorMessage = serverData.message || serverData._error_message || serverData.exc || serverData.exception || errorMessage;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Submission Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.screen}>
      <View 
        style={[styles.headerCard, { paddingTop: insets.top + 12 }]} 
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.headerRow}>
          <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Expense Reimbursement</Text>
        </View>
        <Text style={styles.headerSubtitle}>Submit and track your expense claims</Text>

        <View style={styles.metricRow}>
          <Metric label="Total" value={metrics.total} />
          <Metric label="Pending" value={metrics.pending} accent="#f59e0b" />
          <Metric label="Approved" value={metrics.approved} accent="#059669" />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        <View style={styles.segmentWrap} onLayout={onSegLayout}>
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
            <Text style={[styles.segmentText, activeTab === 'Submit' && styles.segmentTextActive]}>
              Submit
            </Text>
          </Pressable>
          <Pressable onPress={() => onTabChange('History')} style={styles.segmentBtn}>
            <Text style={[styles.segmentText, activeTab === 'History' && styles.segmentTextActive]}>
              History
            </Text>
          </Pressable>
        </View>

        {activeTab === 'Submit' ? (
          <>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="cash-outline" size={26} color="#111827" />
              </View>
              <Text style={styles.cardTitle}>Submit New Expense</Text>
              <Text style={styles.cardSubtitle}>
                Create a reimbursement request for your business expenses
              </Text>
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
            {/* History list */}
            {loadingHistory ? (
              <View style={[styles.card, { alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={{ color: '#6b7280', marginTop: 8 }}>Loading expense claims…</Text>
              </View>
            ) : !history || history.length === 0 ? (
              <View style={[styles.card, { alignItems: 'center' }]}>
                <Ionicons name="file-tray-outline" size={20} color="#6b7280" />
                <Text style={{ color: '#111827', fontWeight: '700', marginTop: 6 }}>No expense claims yet</Text>
                <Text style={{ color: '#6b7280', marginTop: 2 }}>Submit your first claim to see it here.</Text>
              </View>
            ) : (
              history.map((h) => {
                const amount = h?.total_claimed_amount || 0;
                const amountStr = `$${amount.toFixed(2)}`;
                const postingDate = formatDisplayDate(h?.posting_date || '');
                const statusRaw = String(h?.status || '').toLowerCase();
                const status: 'Approved' | 'Pending' | 'Rejected' = 
                  statusRaw.includes('reject') ? 'Rejected' :
                  (statusRaw.includes('approve') || statusRaw.includes('paid')) ? 'Approved' : 'Pending';
                
                return (
                  <ExpenseItem
                    key={String(h.name)}
                    status={status}
                    title={h.remarks || 'Expense Claim'}
                    amount={amountStr}
                    desc={h.remarks || 'Expense claim'}
                    date={postingDate}
                    submitted={postingDate}
                  />
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Modal */}
      {showModal && headerHeight > 0 && (
        <View style={[styles.modalOverlay, { top: headerHeight + MODAL_TOP_GAP }]}>
          <View style={[
            styles.modalCard,
            { 
              paddingBottom: insets.bottom + 12, 
              maxHeight: Math.max(320, Math.round(Dimensions.get('window').height - headerHeight - MODAL_TOP_GAP - insets.bottom - 8)) 
            }
          ]}>
            <ScrollView 
              contentContainerStyle={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Expense Claim</Text>
                <Pressable onPress={closeModal} accessibilityRole="button">
                  <Ionicons name="close" size={20} color="#111827" />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>Submit a new expense reimbursement request</Text>

              {/* Category */}
              <Text style={styles.fieldLabel}>
                Expense Claim Type<Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <Pressable style={styles.inputRow} onPress={() => setCategoryOpen((v) => !v)}>
                <Ionicons name="list-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
                <Text style={[styles.placeholderText, { color: formData.category ? '#111827' : '#9ca3af' }]}>
                  {formData.category?.name || 'Select category'}
                </Text>
                <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
              </Pressable>
              {categoryOpen && (
                <View style={styles.dropdown}>
                  {loadingTypes ? (
                    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                      <ActivityIndicator size="small" color="#6b7280" />
                      <Text style={{ color: '#6b7280', marginTop: 4 }}>Loading types…</Text>
                    </View>
                  ) : types.length > 0 ? (
                    types.map((opt) => (
                      <Pressable
                        key={opt.name}
                        style={styles.dropdownItem}
                        onPress={() => { 
                          updateFormData({ category: opt }); 
                          setCategoryOpen(false); 
                        }}
                      >
                        <Text style={styles.dropdownText}>{opt.name}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#6b7280' }}>No categories available</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Amount */}
              <Text style={styles.fieldLabel}>
                Amount <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={styles.inputRow}>
                <Ionicons name="cash-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
                <TextInput
                  value={formData.amount}
                  onChangeText={(text) => updateFormData({ amount: text })}
                  placeholder="$ 0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
              </View>

              {/* Date */}
              <Text style={styles.fieldLabel}>
                Expense Date <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
                <TextInput
                  value={formData.expDate}
                  onChangeText={(text) => updateFormData({ expDate: text })}
                  placeholder="dd/mm/yyyy or yyyy-mm-dd"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numbers-and-punctuation"
                  style={styles.textInput}
                />
              </View>

              {/* Description */}
              <Text style={styles.fieldLabel}>
                Description <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <View style={[styles.inputRow, { height: 90, alignItems: 'flex-start', paddingTop: 8 }]}>
                <TextInput
                  value={formData.desc}
                  onChangeText={(text) => updateFormData({ desc: text })}
                  placeholder="Describe the expense..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  style={[styles.textInput, { textAlignVertical: 'top' }]}
                />
              </View>

              {/* Receipt upload */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Receipt (Optional)</Text>
              <View style={styles.uploadBox}>
                {formData.receiptUri ? (
                  <>
                    <Ionicons name="document-text-outline" size={22} color="#2563eb" />
                    <Text style={styles.fileName}>{formData.receiptName || 'Selected file'}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <Pressable 
                        style={[styles.secondaryBtn, { marginRight: 8 }]} 
                        onPress={() => updateFormData({ receiptName: '', receiptUri: '' })}
                      >
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
                    <Text style={[styles.placeholderText, { color: '#6b7280', marginTop: 8 }]}>
                      Upload receipt image
                    </Text>
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
                  { 
                    alignSelf: 'stretch', 
                    marginTop: 12, 
                    opacity: submitting ? 0.7 : 1 
                  }
                ]}
                disabled={submitting}
                onPress={handleSubmit}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Submitting…</Text>
                  </>
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Claim</Text>
                )}
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

function ExpenseItem({ 
  status, 
  title, 
  amount, 
  desc, 
  date, 
  submitted 
}: { 
  status: 'Approved' | 'Pending' | 'Rejected'; 
  title: string; 
  amount: string; 
  desc: string; 
  date: string; 
  submitted: string; 
}) {
  const statusConfig = {
    Approved: { color: '#059669', bg: '#e8faf3', icon: 'checkmark-circle' as const },
    Pending: { color: '#b45309', bg: '#fde7cf', icon: 'time-outline' as const },
    Rejected: { color: '#dc2626', bg: '#fde2e2', icon: 'close-circle' as const },
  } as const;
  
  const config = statusConfig[status];
  
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyTitle}>{title}</Text>
          <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{status}</Text>
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

// Keep your existing styles...
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  headerCard: { 
    backgroundColor: '#2563eb', 
    paddingHorizontal: 16, 
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '700' 
  },
  headerSubtitle: { 
    color: '#dbeafe', 
    fontSize: 14, 
    marginBottom: 16 
  },
  metricRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  metricCard: { 
    alignItems: 'center' 
  },
  metricLabel: { 
    color: '#dbeafe', 
    fontSize: 12, 
    marginBottom: 4 
  },
  metricValue: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  content: { 
    flex: 1 
  },
  contentContainer: { 
    padding: 16 
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  segmentTextActive: {
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  historyDesc: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 14,
    flex: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: -12,
    marginBottom: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownText: {
    fontSize: 14,
    color: '#111827',
  },
  uploadBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
   

