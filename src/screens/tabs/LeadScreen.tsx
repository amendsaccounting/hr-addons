import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, FlatList, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listAllLeads, deleteLead, createLead, type Lead } from '../../services/leadService';
import { uploadLeadAttachment } from '../../services/leadService';

export default function LeadScreen() {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const searchDebounceRef = useRef<any>(null);
  const requestIdRef = useRef(0);
  const [addVisible, setAddVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    lead_name: '',
    company_name: '',
    email_id: '',
    mobile_no: '',
    location: '',
    source: '',
    status: 'Lead',
    territory: '',
    notes: '',
  });
  const [attachments, setAttachments] = useState<Array<{ uri: string; name?: string; type?: string }>>([]);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  console.log("leadsssdata====>",leads);
  

  const statusChips = useMemo(() => ['All', 'Lead', 'Open', 'Replied', 'Qualified', 'Converted'], []);

  const load = useCallback(async (opts?: { showSpinner?: boolean }) => {
    const reqId = ++requestIdRef.current;
    if (opts?.showSpinner) setLoading(true);
    try {
      const rows = await listAllLeads({ search: query || undefined, status: status === 'All' ? undefined : status, pageSize: 200, hardCap: 20000 });
      if (requestIdRef.current === reqId) setLeads(rows);
    } catch (e: any) {
      if (requestIdRef.current === reqId) Alert.alert('Leads', e?.message || 'Failed to load leads');
    } finally {
      if (requestIdRef.current === reqId && opts?.showSpinner) setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    load({ showSpinner: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounced search when typing
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      load({ showSpinner: true });
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [query, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onDelete = useCallback(async (name: string) => {
    Alert.alert('Delete Lead', 'Are you sure you want to delete this lead?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const ok = await deleteLead(name);
          if (ok) await load();
          else Alert.alert('Leads', 'Unable to delete lead');
        } catch {
          Alert.alert('Leads', 'Unable to delete lead');
        }
      } },
    ]);
  }, [load]);

  const metrics = useMemo(() => ([
    { key: 'total', label: 'Total Leads', value: String(leads.length) },
    { key: 'pipeline', label: 'Pipeline Value', value: '-' },
    { key: 'won', label: 'Won', value: '-' },
  ]), [leads.length]);

  return (
    <View style={styles.screen}>
      {/* Fixed Header */}
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Ionicons name="trending-up" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Sales Leads</Text>
        </View>
        <Text style={styles.headerSubtitle}>Track and manage sales opportunities</Text>

        <View style={styles.metricRow}>
          {metrics.map(m => (
            <View key={m.key} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#6b7280" style={{ marginHorizontal: 8 }} />
              <TextInput
                placeholder="Search leads..."
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => load({ showSpinner: true })}
                returnKeyType="search"
              />
              {loading ? (
                <ActivityIndicator size="small" style={styles.searchSpinner} />
              ) : (
                !!query && (
                  <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </Pressable>
                )
              )}
            </View>
            <Pressable style={styles.addBtn} accessibilityRole="button" onPress={() => setAddVisible(true)}>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsRowContent}
          >
            {statusChips.map((c) => (
              <Pressable key={c} style={[styles.chip, status === c && styles.chipActive]} onPress={() => setStatus(c)}>
                <Text style={[styles.chipText, status === c && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        {loading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={leads}
            keyExtractor={(item) => item.name}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.container}
            renderItem={({ item }) => (
              <View style={styles.leadCard}>
                <View style={styles.leadTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadCompany}>{item.company_name || item.lead_name || '—'}</Text>
                    {!!item.lead_name && <Text style={styles.leadContact}>{item.lead_name}</Text>}
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => onDelete(item.name)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
                <View style={styles.badgeRow}>
                  {!!item.status && (
                    <View style={[styles.badge, { backgroundColor: '#e7f0ff' }]}>
                      <Text style={[styles.badgeText, { color: '#0b6dff' }]}>{item.status}</Text>
                    </View>
                  )}
                  {!!item.source && (
                    <View style={[styles.badge, { backgroundColor: '#fff' }, styles.linkBadge]}>
                      <Text style={[styles.badgeText, { color: '#111827' }]}>{item.source}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailList}>
                  {!!item.email_id && <Row icon="mail-outline" text={item.email_id} />}
                  {!!item.mobile_no && <Row icon="call-outline" text={item.mobile_no} />}
                  {!!item.territory && <Row icon="location-outline" text={item.territory} />}
                </View>
              </View>
            )}
            ListEmptyComponent={!loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={60} color="#cbd5e1" />
                <Text style={{ marginTop: 8, color: '#6b7280' }}>No leads found</Text>
              </View>
            ) : null}
          />
        )}
      </View>
      {/* Add Lead Modal */}
      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Lead</Text>
                  <Pressable accessibilityRole="button" onPress={() => setAddVisible(false)}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </Pressable>
                </View>
                <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <LabeledInput
                    label="Company Name"
                    placeholder="e.g. Acme Inc"
                    value={form.company_name}
                    onChangeText={(v: string) => setForm({ ...form, company_name: v })}
                  />
                  <LabeledInput
                    label="Contact Person"
                    placeholder="e.g. John Smith"
                    value={form.lead_name}
                    onChangeText={(v: string) => setForm({ ...form, lead_name: v })}
                  />
                  <LabeledInput
                    label="Email"
                    placeholder="name@company.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email_id}
                    onChangeText={(v: string) => setForm({ ...form, email_id: v })}
                  />
                  <LabeledInput
                    label="Phone"
                    placeholder="+1 555-123-4567"
                    keyboardType="phone-pad"
                    value={form.mobile_no}
                    onChangeText={(v: string) => setForm({ ...form, mobile_no: v })}
                  />
                  <LabeledInput
                    label="Location"
                    placeholder="e.g. New York, NY"
                    value={form.location}
                    onChangeText={(v: string) => setForm({ ...form, location: v })}
                  />
                  <LabeledInput
                    label="Deal Value"
                    placeholder="e.g. 50000"
                    keyboardType="numeric"
                    value={(form as any).deal_value}
                    onChangeText={(v: string) => setForm({ ...(form as any), deal_value: v })}
                  />
                  <Text style={styles.inputLabel}>Status</Text>
                  <Pressable accessibilityRole="button" onPress={() => setStatusPickerVisible(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{form.status}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {statusPickerVisible && (
                    <View style={styles.dropdownPanel}>
                      {['Lead','Open','Replied','Qualified','Converted'].map(s => (
                        <Pressable key={s} style={styles.selectOption} onPress={() => { setForm({ ...form, status: s }); setStatusPickerVisible(false); }}>
                          <Text style={styles.selectOptionText}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <LabeledInput
                    label="Lead Source"
                    placeholder="Website / LinkedIn"
                    value={form.source}
                    onChangeText={(v: string) => setForm({ ...form, source: v })}
                  />

                  <LabeledInput
                    label="Notes (Optional)"
                    placeholder="Add any notes here"
                    value={form.notes}
                    onChangeText={(v: string) => setForm({ ...form, notes: v })}
                    style={{ height: 90, textAlignVertical: 'top' }}
                    multiline
                  />

                  <Text style={styles.inputLabel}>Attachments</Text>
                  <View style={styles.attachRow}>
                    <Pressable style={[styles.attachBtn, styles.attachPrimary]} onPress={async () => {
                      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 10 });
                      if (res.assets && res.assets.length) {
                        const files = res.assets.map(a => ({ uri: a.uri || '', name: a.fileName || 'photo.jpg', type: a.type || 'image/jpeg' })).filter(f => !!f.uri);
                        setAttachments(prev => [...prev, ...files]);
                      }
                    }}>
                      <Ionicons name="images-outline" size={16} color="#fff" />
                      <Text style={styles.attachBtnText}>Photos</Text>
                    </Pressable>
                    <Pressable style={[styles.attachBtn, styles.attachSecondary]} onPress={async () => {
                      const res = await launchCamera({ mediaType: 'photo', quality: 0.8 });
                      if (res.assets && res.assets.length) {
                        const a = res.assets[0];
                        if (a?.uri) setAttachments(prev => [...prev, { uri: a.uri, name: a.fileName || 'camera.jpg', type: a.type || 'image/jpeg' }]);
                      }
                    }}>
                      <Ionicons name="camera-outline" size={16} color="#111827" />
                      <Text style={styles.attachBtnTextSecondary}>Camera</Text>
                    </Pressable>
                    <Pressable style={[styles.attachBtn, styles.attachSecondary]} onPress={async () => {
                      try {
                        const picks = await DocumentPicker.pickMultiple({ type: [DocumentPicker.types.allFiles] });
                        const mapped = picks.map(p => ({ uri: p.uri, name: p.name, type: p.type || 'application/octet-stream' }));
                        setAttachments(prev => [...prev, ...mapped]);
                      } catch (e: any) {
                        if (!DocumentPicker.isCancel(e)) Alert.alert('Attachments', 'Unable to pick files');
                      }
                    }}>
                      <Ionicons name="document-attach-outline" size={16} color="#111827" />
                      <Text style={styles.attachBtnTextSecondary}>Files</Text>
                    </Pressable>
                  </View>
                  {!!attachments.length && (
                    <View style={styles.attachList}>
                      {attachments.map((f, idx) => (
                        <View key={`${f.uri}-${idx}`} style={styles.attachItem}>
                          <Ionicons name="attach-outline" size={14} color="#6b7280" />
                          <Text numberOfLines={1} style={styles.attachName}>{f.name || f.uri.split('/').pop()}</Text>
                          <Pressable accessibilityRole="button" onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                            <Ionicons name="close-circle" size={16} color="#9ca3af" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setAddVisible(false)}>
                    <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} disabled={saving} onPress={async () => {
                    if (!form.lead_name && !form.company_name) {
                      Alert.alert('Add Lead', 'Please enter Lead Name or Company');
                      return;
                    }
                    setSaving(true);
                    try {
                      const payload: any = {
                        company_name: form.company_name,
                        lead_name: form.lead_name,
                        email_id: form.email_id,
                        mobile_no: form.mobile_no,
                        status: form.status,
                        source: form.source,
                        address: form.location,
                      };
                      if ((form as any).deal_value) (payload as any).custom_deal_value = (form as any).deal_value;
                      if (form.notes) payload.notes = form.notes;
                      const created = await createLead(payload);
                      if (created) {
                        // Upload attachments in parallel
                        if ((created as any)?.name && attachments.length) {
                          await Promise.allSettled(
                            attachments.map(f => uploadLeadAttachment((created as any).name, f))
                          );
                        }
                        setAddVisible(false);
                        setForm({ company_name: '', lead_name: '', email_id: '', mobile_no: '', location: '', deal_value: '', status: 'Lead', source: '', notes: '' });
                        setAttachments([]);
                        await load({ showSpinner: true });
                      } else {
                        Alert.alert('Add Lead', 'Unable to create lead');
                      }
                    } catch (e: any) {
                      Alert.alert('Add Lead', e?.message || 'Unable to create lead');
                    } finally {
                      setSaving(false);
                    }
                  }}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Add Lead</Text>}
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const Row = React.memo(function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={14} color="#6b7280" style={{ width: 18 }} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
});

const LabeledInput = React.memo(function LabeledInput(props: {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  style?: any;
  multiline?: boolean;
}) {
  const { label, ...inputProps } = props as any;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput {...(inputProps as any)} style={[styles.input, (props as any).style]} placeholderTextColor="#9ca3af" />
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 24, paddingTop: 0 },

  headerCard: {
    backgroundColor: '#090a1a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#cbd5e1', marginTop: 4, fontSize: 12 },

  metricRow: { flexDirection: 'row', marginTop: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  metricLabel: { color: '#6b7280', fontSize: 11 },
  metricValue: { color: '#111827', fontWeight: '700', marginTop: 4 },

  // Match card width: searchRow sits inside searchSection (which already has paddingHorizontal: 16)
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, marginTop: 6, marginBottom: 12 },
  searchSection: { paddingHorizontal: 16, paddingTop: 6 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', height: 40 },
  searchInput: { flex: 1, color: '#111827' },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b1b', borderRadius: 10, marginLeft: 10 },
  clearBtn: { paddingHorizontal: 8, height: '100%', justifyContent: 'center' },
  searchSpinner: { paddingHorizontal: 8 },

  chipsRow: { paddingHorizontal: 0, paddingVertical: 6, marginBottom: 6, marginTop: 6 },
  chipsRowContent: { paddingRight: 16, alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: '#f3f4f6', marginRight: 8 },
  chipActive: { backgroundColor: '#0b0b1b' },
  chipText: { color: '#111827', fontWeight: '600', fontSize: 12, paddingHorizontal: 4, lineHeight: 16 },
  chipTextActive: { color: '#fff' },

  leadCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 16, padding: 14, marginTop: 10 },
  leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  leadCompany: { color: '#111827', fontWeight: '700' },
  leadContact: { color: '#6b7280', marginTop: 2 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  linkBadge: { borderWidth: 1, borderColor: '#e5e7eb' },

  notes: { color: '#374151', marginTop: 10 },
  detailList: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowText: { color: '#374151' },

  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  modalWrap: { width: '100%', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', width: '96%', maxWidth: 520, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  modalHeader: { backgroundColor: '#0b0b1b', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#fff', fontWeight: '700' },
  modalBodyScroll: { maxHeight: 520 },
  modalBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  inputLabel: { color: '#6b7280', fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', backgroundColor: '#fff' },
  modalChipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalBtnSecondary: { backgroundColor: '#f3f4f6' },
  modalBtnPrimary: { backgroundColor: '#0b0b1b' },
  modalBtnText: { color: '#fff', fontWeight: '700' },
  modalBtnTextSecondary: { color: '#111827' },
  selectBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginBottom: 10 },
  selectText: { color: '#111827', fontWeight: '600' },
  selectOption: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  selectOptionText: { color: '#111827' },
  dropdownPanel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden', marginTop: 6 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  attachPrimary: { backgroundColor: '#0b0b1b' },
  attachSecondary: { backgroundColor: '#f3f4f6' },
  attachBtnText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  attachBtnTextSecondary: { color: '#111827', marginLeft: 6, fontWeight: '700' },
  attachList: { marginTop: 6 },
  attachItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  attachName: { flex: 1, color: '#374151', marginHorizontal: 8 },
});
