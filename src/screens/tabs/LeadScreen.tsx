import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, FlatList, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import DatePicker from 'react-native-date-picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listAllLeads, listLeads, countLeads, deleteLead, createLeadFromModal, listLocations, listTerritories, getLeadSelectOptions, type Lead, type LocationOption } from '../../services/leadService';

export default function LeadScreen({ onOpenLead }: { onOpenLead?: (name: string) => void }) {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();
  const DEFAULT_LOCATION_LABEL = 'Deira';
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const searchDebounceRef = useRef<any>(null);
  const requestIdRef = useRef(0);
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState({
    // Lead Details
    date: '',
    lead_name: '',
    gender: '',
    location: '', // Building & Location
    source: '',
    lead_owner: '',
    status: 'Lead',
    lead_type: '',
    request_type: '',
    service_type: '',
    // Contact
    mobile_no: '', // Phone No
    email_id: '',
    website: '',
    whatsapp: '',
    // Organisation
    company_name: '',
    territory: '',
    notes: '',
  });
  const [attachments, setAttachments] = useState<Array<{ uri: string; name?: string; type?: string }>>([]);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationManualMode, setLocationManualMode] = useState(false);
  const [locationManualText, setLocationManualText] = useState('');
  const [territoryPickerVisible, setTerritoryPickerVisible] = useState(false);
  const [territoryOptions, setTerritoryOptions] = useState<LocationOption[]>([]);
  const [territorySearch, setTerritorySearch] = useState('');
  const [serviceTypePickerVisible, setServiceTypePickerVisible] = useState(false);
  const [serviceTypeOptions, setServiceTypeOptions] = useState<string[]>([]);
  const [requestTypePickerVisible, setRequestTypePickerVisible] = useState(false);
  const [requestTypeOptions, setRequestTypeOptions] = useState<string[]>([]);
  const [leadTypePickerVisible, setLeadTypePickerVisible] = useState(false);
  const [leadTypeOptions, setLeadTypeOptions] = useState<string[]>([]);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const c = await countLeads({ search: query || undefined, status: status === 'All' ? undefined : status });
      setTotalCount(Number(c) || 0);
    } catch { setTotalCount(0); }
  }, [query, status]);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  console.log("leadsssdata====>",leads);
  

  const statusChips = useMemo(() => ['All', 'Lead', 'Open', 'Replied', 'Opportunity', 'Quotation', 'Lost Quotation', 'Interested', 'Converted', 'Do Not Contact'], []);

  const loadPage = useCallback(async (pageToLoad: number, opts?: { append?: boolean; showSpinner?: boolean }) => {
    const reqId = ++requestIdRef.current;
    if (opts?.showSpinner) setLoading(true);
    try {
      const rows = await listLeads({ search: query || undefined, status: status === 'All' ? undefined : status, page: pageToLoad, limit: PAGE_SIZE });
      if (requestIdRef.current !== reqId) return; // ignore stale
      setHasMore((rows?.length || 0) === PAGE_SIZE);
      setPage(pageToLoad);
      if (opts?.append) setLeads((prev) => [...prev, ...(rows || [])]);
      else setLeads(rows || []);
    } catch (e: any) {
      if (requestIdRef.current === reqId) Alert.alert('Leads', e?.message || 'Failed to load leads');
    } finally {
      if (requestIdRef.current === reqId && opts?.showSpinner) setLoading(false);
    }
  }, [query, status]);

  // Prefetch Building & Location options when the Add Lead modal opens
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!addVisible) return;
      try {
        setLocationLoading(true);
        const opts = await listLocations(200);
        if (!cancelled) setLocationOptions(opts || []);
      } catch {
        if (!cancelled) setLocationOptions([]);
      } finally {
        if (!cancelled) setLocationLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [addVisible]);

  // Fetch locations when dropdown opens
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (locationPickerVisible) {
          setLocationLoading(true);
          const opts = await listLocations(200);
          if (!cancelled) setLocationOptions(opts || []);
        }
      } catch {
        if (!cancelled) setLocationOptions([]);
      } finally {
        if (!cancelled) setLocationLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [locationPickerVisible]);

  // Fetch territories when dropdown opens
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (territoryPickerVisible) {
          const opts = await listTerritories(200);
          if (!cancelled) setTerritoryOptions(opts || []);
        }
      } catch {
        if (!cancelled) setTerritoryOptions([]);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [territoryPickerVisible]);

  // Fetch select options on open
  useEffect(() => {
    if (!leadTypePickerVisible) return;
    getLeadSelectOptions('lead_type').then(setLeadTypeOptions).catch(() => setLeadTypeOptions([]));
  }, [leadTypePickerVisible]);
  useEffect(() => {
    if (!requestTypePickerVisible) return;
    getLeadSelectOptions('request_type').then(setRequestTypeOptions).catch(() => setRequestTypeOptions([]));
  }, [requestTypePickerVisible]);
  useEffect(() => {
    if (!serviceTypePickerVisible) return;
    getLeadSelectOptions('service_type').then(setServiceTypeOptions).catch(() => setServiceTypeOptions([]));
  }, [serviceTypePickerVisible]);
  useEffect(() => {
    if (!sourcePickerVisible) return;
    getLeadSelectOptions('source').then(setSourceOptions).catch(() => setSourceOptions([]));
  }, [sourcePickerVisible]);

  useEffect(() => {
    setPage(1); setHasMore(true);
    loadPage(1, { showSpinner: true, append: false });
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounced search when typing
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1); setHasMore(true);
      loadPage(1, { showSpinner: true, append: false });
      refreshCount();
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [query, loadPage, refreshCount]);

  // Load Building & Location options when the modal opens
  // Fetch locations only when the picker is opened
  useEffect(() => {
    let cancelled = false;
    async function fetchLocations() {
      try {
        if (locationPickerVisible) {
          const opts = await listLocations(200);
          if (!cancelled) setLocationOptions(opts || []);
        }
      } catch {
        if (!cancelled) setLocationOptions([]);
      }
    }
    fetchLocations();
    return () => { cancelled = true; };
  }, [locationPickerVisible]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1); setHasMore(true);
    await loadPage(1, { append: false, showSpinner: true });
    refreshCount();
    setRefreshing(false);
  }, [loadPage, refreshCount]);

  const onDelete = useCallback(async (name: string) => {
    Alert.alert('Delete Lead', 'Are you sure you want to delete this lead?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const ok = await deleteLead(name);
          if (ok) { setPage(1); setHasMore(true); await loadPage(1, { showSpinner: true, append: false }); refreshCount(); }
          else Alert.alert('Leads', 'Unable to delete lead');
        } catch {
          Alert.alert('Leads', 'Unable to delete lead');
        }
      } },
    ]);
  }, [loadPage, refreshCount]);

  const metrics = useMemo(() => ([
    { key: 'total', label: 'Total Leads', value: String(totalCount) },
    { key: 'pipeline', label: 'Pipeline Value', value: '-' },
    { key: 'won', label: 'Won', value: '-' },
  ]), [totalCount]);

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
                onSubmitEditing={() => { setPage(1); setHasMore(true); loadPage(1, { showSpinner: true, append: false }); }}
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
              <Pressable style={styles.addBtn} accessibilityRole="button" onPress={() => { setAddVisible(true); }}>
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
            onEndReachedThreshold={0.6}
            onEndReached={async () => {
              if (loading || loadingMore || !hasMore) return;
              setLoadingMore(true);
              try { await loadPage(page + 1, { append: true }); }
              finally { setLoadingMore(false); }
            }}
            ListFooterComponent={loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : null}
            initialNumToRender={15}
            windowSize={10}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
            renderItem={({ item }) => (
              <Pressable style={styles.leadCard} onPress={() => onOpenLead && onOpenLead(item.name)}>
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
              </Pressable>
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
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={insets.top + 12}
              style={styles.modalWrap}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>Add New Sales Lead</Text>
                    <Text style={styles.modalSubtitle}>Add a new sales prospect or opportunity</Text>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => setAddVisible(false)}>
                    <Ionicons name="close" size={20} color="#111827" />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.modalBodyScroll}
                  contentContainerStyle={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Lead Details */}
                  <Text style={styles.sectionTitle}>Lead Details</Text>
                  <Text style={styles.inputLabel}>Date</Text>
                  <Pressable accessibilityRole="button" onPress={() => setDatePickerOpen(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{(form as any).date || 'Select date'}</Text>
                    <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                  </Pressable>
                  <LabeledInput
                    label="Name"
                    placeholder="e.g. John Smith"
                    value={form.lead_name}
                    onChangeText={(v: string) => setForm({ ...form, lead_name: v })}
                  />
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setForm({ ...(form as any), gender: 'Male' })}
                      style={[styles.toggleBtn, (form as any).gender === 'Male' && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, (form as any).gender === 'Male' && styles.toggleBtnTextActive]}>Male</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setForm({ ...(form as any), gender: 'Female' })}
                      style={[styles.toggleBtn, (form as any).gender === 'Female' && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, (form as any).gender === 'Female' && styles.toggleBtnTextActive]}>Female</Text>
                    </Pressable>
                  </View>
                  {/* Building & Location */}
                  <Text style={styles.inputLabel}>Building & Location</Text>
                  <Pressable accessibilityRole="button" onPress={() => { setLocationSearch(''); setLocationManualMode(false); setLocationManualText(''); setLocationPickerVisible(true); }} style={styles.selectBox}>
                    <Text style={styles.selectText}>{(locationOptions.find(o => o.name === form.location)?.label) || (form.location ? form.location : 'Select location')}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {locationPickerVisible && (
                    <View style={styles.dropdownPanel}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 }}>
                        <Ionicons name="search" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                        <TextInput
                          placeholder="Search location..."
                          placeholderTextColor="#9ca3af"
                          style={[styles.searchInput, { flex: 1, paddingVertical: 6, borderWidth: 0 }]}
                          value={locationSearch}
                          onChangeText={setLocationSearch}
                        />
                        <Pressable accessibilityRole="button" onPress={() => setLocationPickerVisible(false)}>
                          <Ionicons name="close" size={18} color="#6b7280" />
                        </Pressable>
                      </View>
                      <View style={{ maxHeight: 260 }}>
                        {!locationManualMode && locationOptions
                          .filter(o => !locationSearch || String(o.label || o.name).toLowerCase().includes(locationSearch.toLowerCase()))
                          .map((o) => (
                            <Pressable key={o.name} style={styles.selectOption} onPress={() => { setForm(prev => ({ ...(prev as any), location: o.name })); setLocationPickerVisible(false); }}>
                              <Text style={styles.selectOptionText}>{o.label || o.name}</Text>
                              {form.location === o.name && <Ionicons name="checkmark" size={16} color="#111827" />}
                            </Pressable>
                          ))}
                        {!locationManualMode && (
                          <Pressable style={[styles.selectOption, { backgroundColor: '#fafafa' }]} onPress={() => { setLocationManualMode(true); setLocationManualText(form.location || ''); }}>
                            <Text style={[styles.selectOptionText, { color: '#0b6dff', fontWeight: '700' }]}>Enter manually…</Text>
                          </Pressable>
                        )}
                        {locationManualMode && (
                          <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                            <Text style={{ color: '#6b7280', marginBottom: 6 }}>Enter location name</Text>
                            <TextInput
                              placeholder="Type location"
                              placeholderTextColor="#9ca3af"
                              style={styles.input}
                              value={locationManualText}
                              onChangeText={setLocationManualText}
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                              <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => { setLocationManualMode(false); }}>
                                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                style={[styles.modalBtn, styles.modalBtnPrimary]}
                                onPress={() => {
                                  const name = (locationManualText || '').trim();
                                  if (!name) return;
                                  setForm(prev => ({ ...(prev as any), location: name }));
                                  setLocationPickerVisible(false);
                                  setLocationManualMode(false);
                                }}
                              >
                                <Text style={styles.modalBtnText}>Save</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                        {locationOptions.length === 0 && (
                          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {locationLoading ? <ActivityIndicator /> : null}
                            <Text style={{ color: '#6b7280', marginRight: 10 }}>
                              {locationLoading ? 'Loading locations...' : 'No locations found'}
                            </Text>
                            {!locationLoading && !locationManualMode && (
                              <Pressable accessibilityRole="button" onPress={async () => { setLocationLoading(true); const opts = await listLocations(200).catch(() => [] as any[]); setLocationOptions((opts as any) || []); setLocationLoading(false); }}>
                                <Text style={{ color: '#0b6dff', fontWeight: '700' }}>Retry</Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  {/* Source */}
                  <Text style={styles.inputLabel}>Source</Text>
                  <Pressable accessibilityRole="button" onPress={() => setSourcePickerVisible(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{form.source || 'Select source'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {sourcePickerVisible && (
                    <View style={styles.dropdownPanel}>
                      {(sourceOptions || []).map((opt) => (
                        <Pressable key={opt} style={styles.selectOption} onPress={() => { setForm({ ...form, source: opt }); setSourcePickerVisible(false); }}>
                          <Text style={styles.selectOptionText}>{opt}</Text>
                          {form.source === opt && <Ionicons name="checkmark" size={16} color="#111827" />}
                        </Pressable>
                      ))}
                      {(!sourceOptions || sourceOptions.length === 0) && (
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: '#6b7280' }}>No options</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <LabeledInput
                    label="Lead Owner"
                    placeholder="e.g. jane@company.com"
                    value={(form as any).lead_owner}
                    onChangeText={(v: string) => setForm({ ...(form as any), lead_owner: v })}
                  />
                  <Text style={styles.inputLabel}>Status</Text>
                  <Pressable accessibilityRole="button" onPress={() => setStatusPickerVisible(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{form.status}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {statusPickerVisible && (
                    <View style={styles.dropdownPanel}>
                      {['Lead','Open','Replied','Opportunity','Quotation','Lost Quotation','Interested','Converted','Do Not Contact'].map(s => (
                        <Pressable key={s} style={styles.selectOption} onPress={() => { setForm({ ...form, status: s }); setStatusPickerVisible(false); }}>
                          <Text style={styles.selectOptionText}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {/* Territory */}
                  <Text style={styles.inputLabel}>Territory</Text>
                  <Pressable accessibilityRole="button" onPress={() => { setTerritorySearch(''); setTerritoryPickerVisible(true); }} style={styles.selectBox}>
                    <Text style={styles.selectText}>{territoryOptions.find(o => o.name === form.territory)?.label || form.territory || 'Select territory'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {territoryPickerVisible && (
                    <View style={styles.dropdownPanel}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 }}>
                        <Ionicons name="search" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                        <TextInput
                          placeholder="Search territory..."
                          placeholderTextColor="#9ca3af"
                          style={[styles.searchInput, { flex: 1, paddingVertical: 6, borderWidth: 0 }]}
                          value={territorySearch}
                          onChangeText={setTerritorySearch}
                        />
                        <Pressable accessibilityRole="button" onPress={() => setTerritoryPickerVisible(false)}>
                          <Ionicons name="close" size={18} color="#6b7280" />
                        </Pressable>
                      </View>
                      <View style={{ maxHeight: 220 }}>
                        {territoryOptions
                          .filter(o => !territorySearch || String(o.label || o.name).toLowerCase().includes(territorySearch.toLowerCase()))
                          .map((o) => (
                            <Pressable key={o.name} style={styles.selectOption} onPress={() => { setForm(prev => ({ ...(prev as any), territory: o.name })); setTerritoryPickerVisible(false); }}>
                              <Text style={styles.selectOptionText}>{o.label || o.name}</Text>
                              {form.territory === o.name && <Ionicons name="checkmark" size={16} color="#111827" />}
                            </Pressable>
                          ))}
                        {territoryOptions.length === 0 && (
                          <View style={{ padding: 12 }}>
                            <Text style={{ color: '#6b7280' }}>No territories found</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  {/* Lead Type */}
                  <Text style={styles.inputLabel}>Lead Type</Text>
                  <Pressable accessibilityRole="button" onPress={() => setLeadTypePickerVisible(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{(form as any).lead_type || 'Select'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {leadTypePickerVisible && (
                    <View style={styles.dropdownPanel}>
                      {(leadTypeOptions || []).map((opt) => (
                        <Pressable key={opt} style={styles.selectOption} onPress={() => { setForm(prev => ({ ...(prev as any), lead_type: opt })); setLeadTypePickerVisible(false); }}>
                          <Text style={styles.selectOptionText}>{opt}</Text>
                          {(form as any).lead_type === opt && <Ionicons name="checkmark" size={16} color="#111827" />}
                        </Pressable>
                      ))}
                      {(!leadTypeOptions || leadTypeOptions.length === 0) && (
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: '#6b7280' }}>No options</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Request Type */}
                  <Text style={styles.inputLabel}>Request Type</Text>
                  <Pressable accessibilityRole="button" onPress={() => setRequestTypePickerVisible(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{(form as any).request_type || 'Select'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {requestTypePickerVisible && (
                    <View style={styles.dropdownPanel}>
                      {(requestTypeOptions || []).map((opt) => (
                        <Pressable key={opt} style={styles.selectOption} onPress={() => { setForm(prev => ({ ...(prev as any), request_type: opt })); setRequestTypePickerVisible(false); }}>
                          <Text style={styles.selectOptionText}>{opt}</Text>
                          {(form as any).request_type === opt && <Ionicons name="checkmark" size={16} color="#111827" />}
                        </Pressable>
                      ))}
                      {(!requestTypeOptions || requestTypeOptions.length === 0) && (
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: '#6b7280' }}>No options</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Service Type */}
                  <Text style={styles.inputLabel}>Service Type</Text>
                  <Pressable accessibilityRole="button" onPress={() => setServiceTypePickerVisible(true)} style={styles.selectBox}>
                    <Text style={styles.selectText}>{(form as any).service_type || 'Select'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  </Pressable>
                  {serviceTypePickerVisible && (
                    <View style={styles.dropdownPanel}>
                      {(serviceTypeOptions || []).map((opt) => (
                        <Pressable key={opt} style={styles.selectOption} onPress={() => { setForm(prev => ({ ...(prev as any), service_type: opt })); setServiceTypePickerVisible(false); }}>
                          <Text style={styles.selectOptionText}>{opt}</Text>
                          {(form as any).service_type === opt && <Ionicons name="checkmark" size={16} color="#111827" />}
                        </Pressable>
                      ))}
                      {(!serviceTypeOptions || serviceTypeOptions.length === 0) && (
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: '#6b7280' }}>No options</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Contact */}
                  <Text style={styles.sectionTitle}>Contact</Text>
                  <LabeledInput
                    label="Phone No"
                    placeholder="+1 555-123-4567"
                    keyboardType="phone-pad"
                    value={form.mobile_no}
                    onChangeText={(v: string) => setForm({ ...form, mobile_no: v })}
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
                    label="Website"
                    placeholder="https://example.com"
                    autoCapitalize="none"
                    value={(form as any).website}
                    onChangeText={(v: string) => setForm({ ...(form as any), website: v })}
                  />
                  <LabeledInput
                    label="WhatsApp"
                    placeholder="WhatsApp number"
                    keyboardType="phone-pad"
                    value={(form as any).whatsapp}
                    onChangeText={(v: string) => setForm({ ...(form as any), whatsapp: v })}
                  />

                  {/* Organisation */}
                  <Text style={styles.sectionTitle}>Organisation</Text>
                  <LabeledInput
                    label="Organisation Name"
                    placeholder="e.g. Acme Inc"
                    value={form.company_name}
                    onChangeText={(v: string) => setForm({ ...form, company_name: v })}
                  />
                  <LabeledInput
                    label="Territory"
                    placeholder="e.g. North America"
                    value={form.territory}
                    onChangeText={(v: string) => setForm({ ...form, territory: v })}
                  />

                  <LabeledInput
                    label="Notes"
                    placeholder="Add any notes here"
                    value={form.notes}
                    onChangeText={(v: string) => setForm({ ...form, notes: v })}
                    style={{ height: 90, textAlignVertical: 'top' }}
                    multiline
                  />

                  <Text style={styles.sectionTitle}>Attachments</Text>
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
                <DatePicker
                  modal
                  mode="date"
                  open={datePickerOpen}
                  date={(form as any).date ? new Date((form as any).date) : new Date()}
                  onConfirm={(d: Date) => {
                    setDatePickerOpen(false);
                    setForm({ ...(form as any), date: formatDate(d) });
                  }}
                  onCancel={() => setDatePickerOpen(false)}
                />
                <View style={styles.modalFooter}>
                  <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setAddVisible(false)}>
                    <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} disabled={saving} onPress={async () => {
                    if (!form.lead_name && !form.company_name) {
                      Alert.alert('Add Lead', 'Please enter Lead Name or Company');
                      return;
                    }
                    if (!(form as any).date) {
                      Alert.alert('Add Lead', 'Please select Date');
                      return;
                    }
                    // Building & Location is set statically to Deira
                    setSaving(true);
                    try {
                      try { console.log('AddLead submit form:', form, 'attachments:', attachments?.length || 0); } catch {}
                      const created = await createLeadFromModal(form as any, attachments);
                      try { console.log('AddLead response:', created); } catch {}
                      if (created) {
                        setAddVisible(false);
                        setForm({
                          date: '',
                          lead_name: '',
                          gender: '',
                          location: 'Diera',
                          source: '',
                          lead_owner: '',
                          status: 'Lead',
                          lead_type: '',
                          request_type: '',
                          service_type: '',
                          mobile_no: '',
                          email_id: '',
                          website: '',
                          whatsapp: '',
                          company_name: '',
                          territory: '',
                          notes: '',
                        });
                        setAttachments([]);
                        setPage(1); setHasMore(true);
                        await loadPage(1, { showSpinner: true, append: false });
                      } else {
                        try { console.log('AddLead failed to create'); } catch {}
                        Alert.alert('Add Lead', 'Unable to create lead');
                      }
                    } catch (e: any) {
                      try { console.log('AddLead error:', e); } catch {}
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', alignItems: 'stretch' },
  modalWrap: { width: '100%', alignItems: 'stretch', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden', width: '100%', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
  modalHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  modalTitle: { color: '#111827', fontWeight: '700' },
  modalSubtitle: { color: '#6b7280', marginTop: 4, fontSize: 12 },
  modalHeaderText: { flex: 1 },
  modalBodyScroll: { maxHeight: 520 },
  modalBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  sectionTitle: { color: '#111827', fontWeight: '800', marginTop: 8, marginBottom: 6 },
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
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  toggleBtnActive: { backgroundColor: '#0b0b1b', borderColor: '#0b0b1b' },
  toggleBtnText: { color: '#111827', fontWeight: '700' },
  toggleBtnTextActive: { color: '#fff' },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  attachPrimary: { backgroundColor: '#0b0b1b' },
  attachSecondary: { backgroundColor: '#f3f4f6' },
  attachBtnText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  attachBtnTextSecondary: { color: '#111827', marginLeft: 6, fontWeight: '700' },
  attachList: { marginTop: 6 },
  attachItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  attachName: { flex: 1, color: '#374151', marginHorizontal: 8 },
  // Lead Detail styles
  detailScreen: { flex: 1, backgroundColor: '#fff' },
  detailHeader: { paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#f3f4f6' },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  detailName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  detailSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  detailChips: { flexDirection: 'row', marginTop: 10, gap: 8 },
  notesBox: { marginTop: 16, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#eef0f3' },
  notesTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  notesText: { fontSize: 12, color: '#4b5563' },
});
