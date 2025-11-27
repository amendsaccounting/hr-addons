import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, StatusBar, ActivityIndicator, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
// Geolocation removed; Building & Location will fetch from ERPNext dropdown
import { listUserSuggestions, fetchLeadStatusOptions, listDocNamesSimple, createLead, prepareLeadPayload, getLocationDoctypeHint, searchDocNames, buildCommonLinkFilters, listBuildingLocations, fetchLeadFieldMeta } from '../../services/leadService';

const HEADER_BG = '#0b0b1b';

type Props = {
  onCancel?: () => void;
  onCreated?: () => void;
};

export default function LeadCreateScreen({ onCancel, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sanitizeLocationName = (s: string) => String(s || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const [leadForm, setLeadForm] = useState({
    date: '',
    lead_owner: '',
    gender: '',
    status: '',
    source: '',
    lead_type: '',
    full_name: '',
    associate_details: '',
    request_type: '',
    location: '',
    service_type: '',
    email_id: '',
    mobile_no: '',
    website: '',
    territory: '',
  });
  const setField = (k: string) => (v: string) => {
    setLeadForm((p) => ({ ...p, [k]: v }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const val = String(v || '').trim();
      if (val) {
        const { [k]: _omit, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  };
  // No device location fetching; dropdown comes from ERPNext
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerInteracting, setOwnerInteracting] = useState(false);
  const [ownerList, setOwnerList] = useState<Array<{ email: string; fullName: string | null }>>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [leadTypeOpen, setLeadTypeOpen] = useState(false);
  const [leadTypeOptions, setLeadTypeOptions] = useState<string[]>([]);
  const [leadTypeLoading, setLeadTypeLoading] = useState(false);
  const [associateOpen, setAssociateOpen] = useState(false);
  const [associateOptions, setAssociateOptions] = useState<Array<{ email: string; fullName: string | null }>>([]);
  const [associateLoading, setAssociateLoading] = useState(false);
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [serviceTypeOptions, setServiceTypeOptions] = useState<string[]>([]);
  const [serviceTypeLoading, setServiceTypeLoading] = useState(false);
  const [requestTypeOpen, setRequestTypeOpen] = useState(false);
  const [requestTypeOptions, setRequestTypeOptions] = useState<string[]>([]);
  const [requestTypeLoading, setRequestTypeLoading] = useState(false);
  const [territoryOpen, setTerritoryOpen] = useState(false);
  const [territoryOptions, setTerritoryOptions] = useState<string[]>([]);
  const [territoryLoading, setTerritoryLoading] = useState(false);
  // Building & Location picker state
  const [locSuggestOpen, setLocSuggestOpen] = useState(false);
  const [locSuggestLoading, setLocSuggestLoading] = useState(false);
  const [locSuggestOptions, setLocSuggestOptions] = useState<string[]>([]);
  const [locSuggestInteracting, setLocSuggestInteracting] = useState(false);
  const [locDoctype, setLocDoctype] = useState<string>('Building & Location');
  const [locLinkField, setLocLinkField] = useState<string>('custom_building__location');
  const [locPicked, setLocPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounce Lead Owner suggestions when dropdown is open
  useEffect(() => {
    if (!ownerOpen) return;
    const q = String(leadForm.lead_owner || '').trim();
    const t = setTimeout(async () => {
      try {
        setOwnerLoading(true);
        const out = await listUserSuggestions(q, 10);
        setOwnerList(out || []);
      } catch {
        setOwnerList([]);
      } finally {
        setOwnerLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [leadForm.lead_owner, ownerOpen]);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseDate = (s: string): Date => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  

  const handleSave = async () => {
    const labels: Record<string, string> = {
      date: 'Date',
      full_name: 'Full Name',
      lead_owner: 'Lead Owner',
      gender: 'Gender',
      status: 'Status',
      source: 'Source',
      lead_type: 'Lead Type',
      associate_details: 'Associate Details',
      request_type: 'Request Type',
      location: 'Building & Location',
      service_type: 'Service Type',
      email_id: 'Email',
      mobile_no: 'Mobile Number',
      website: 'Website',
      territory: 'Territory',
    };
    const requiredKeys = Object.keys(labels).filter(k => k !== 'location');
    const nextErrors: Record<string, string> = {};
    for (const k of requiredKeys) {
      const v = (leadForm as any)[k];
      const s = typeof v === 'string' ? v.trim() : '';
      if (!s) nextErrors[k] = `${labels[k]} is required`;
    }
    // Do not force a selection; backend will validate or omit invalid link
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Alert.alert('Missing Fields', 'Please complete all required fields.');
      return;
    }
    // Build payload using ERP field names and safe custom aliases
    const payload: Record<string, any> = {
      lead_name: leadForm.full_name,
      lead_owner: leadForm.lead_owner || undefined,
      status: leadForm.status || 'Open',
      source: leadForm.source || undefined,
      email_id: leadForm.email_id || undefined,
      mobile_no: leadForm.mobile_no || undefined,
      website: leadForm.website || undefined,
      territory: leadForm.territory || undefined,
      gender: leadForm.gender || undefined,
      // These will be mapped to custom_* by prepareLeadPayload
      date: leadForm.date || undefined,
      custom_building__location: sanitizeLocationName(leadForm.location) || undefined,
      lead_type: leadForm.lead_type || undefined,
      request_type: leadForm.request_type || undefined,
      service_type: leadForm.service_type || undefined,
      associate_details: leadForm.associate_details || undefined,
    };
    const body = prepareLeadPayload(payload);
    try {
      setSaving(true);
      const res = await createLead(body);
      try { console.log('Create Lead response body:', res); } catch {}
      if (res) {
        onCreated?.();
      } else {
        Alert.alert('Create Lead', 'Unable to create lead.');
      }
    } catch (e: any) {
      try {
        const server = (e && (e.response?.data ?? e.data)) ?? null;
        if (server) console.log('Create Lead error body:', server);
      } catch {}
      try { console.error('Create Lead error', e?.message || e); } catch {}
      Alert.alert('Create Lead', 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  

  // Load Status options on mount
  useEffect(() => {
    (async () => {
      try {
        setStatusLoading(true);
        const opts = await fetchLeadStatusOptions();
        if (Array.isArray(opts) && opts.length > 0) setStatusOptions(opts);
      } catch {}
      finally { setStatusLoading(false); }
    })();
  }, []);

  // Resolve Building & Location link metadata (doctype + fieldname)
  useEffect(() => {
    (async () => {
      try {
        // 1) Use server metadata to detect Link doctype and canonical fieldname
        const meta = await fetchLeadFieldMeta(['custom_building__location','building__location','location','building_and_location']);
        if (meta?.fieldtype === 'Link' && meta.options) {
          setLocDoctype(String(meta.options));
          if (meta.fieldname) setLocLinkField(String(meta.fieldname));
        } else {
          // 2) Fall back to env hint
          const hint = getLocationDoctypeHint();
          if (hint) setLocDoctype(hint);
        }
      } catch {
        const hint = getLocationDoctypeHint();
        if (hint) setLocDoctype(hint);
      }
    })();
  }, []);

  // Debounced search for Building & Location suggestions when open
  useEffect(() => {
    if (!locSuggestOpen) return;
    const q = String(leadForm.location || '').trim();
    const t = setTimeout(async () => {
      try {
        setLocSuggestLoading(true);
        let names: string[] = [];
        // Prefer server-aware link search so get_query filters apply
        try {
          const filters = await buildCommonLinkFilters(locDoctype);
          names = await searchDocNames(
            locDoctype,
            q,
            20,
            {
              reference_doctype: 'Lead',
              reference_fieldname: locLinkField,
              filters,
            }
          );
        } catch {}
        // If results look like generic container nodes, try broader fallback
        const looksGeneric = Array.isArray(names) && names.length > 0 && names.length <= 3 && names.every((n) => /^(warehouse|office|stock|stores?)$/i.test(String(n)));
        if (looksGeneric) {
          try { names = await listBuildingLocations(q, 20); } catch {}
        }
        // If nothing found and no query, try common doctypes as a fallback
        if ((!names || names.length === 0) && !q) {
          try { names = await listBuildingLocations('', 20); } catch {}
        }
        setLocSuggestOptions(Array.isArray(names) ? names : []);
      } catch {
        setLocSuggestOptions([]);
      } finally {
        setLocSuggestLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [leadForm.location, locSuggestOpen, locDoctype, locLinkField]);

  // Load Source options on mount (Lead Source doctype)
  useEffect(() => {
    (async () => {
      try {
        setSourceLoading(true);
        const names = await listDocNamesSimple('Lead Source', 20);
        if (Array.isArray(names) && names.length > 0) setSourceOptions(names);
      } catch {}
      finally { setSourceLoading(false); }
    })();
  }, []);

  // Load Lead Type options on mount (Lead Type doctype)
  useEffect(() => {
    (async () => {
      try {
        setLeadTypeLoading(true);
        const names = await listDocNamesSimple('Lead Type', 20);
        if (Array.isArray(names) && names.length > 0) setLeadTypeOptions(names);
      } catch {}
      finally { setLeadTypeLoading(false); }
    })();
  }, []);

  // Load Service Type options on mount (Service Type doctype)
  useEffect(() => {
    (async () => {
      try {
        setServiceTypeLoading(true);
        const names = await listDocNamesSimple('Service Type', 20);
        if (Array.isArray(names) && names.length > 0) setServiceTypeOptions(names);
      } catch {}
      finally { setServiceTypeLoading(false); }
    })();
  }, []);

  // Load Request Type options on mount (Request Type doctype)
  useEffect(() => {
    (async () => {
      try {
        setRequestTypeLoading(true);
        const names = await listDocNamesSimple('Request Type', 20);
        if (Array.isArray(names) && names.length > 0) setRequestTypeOptions(names);
      } catch {}
      finally { setRequestTypeLoading(false); }
    })();
  }, []);

  // Load Territory options on mount (Territory doctype)
  useEffect(() => {
    (async () => {
      try {
        setTerritoryLoading(true);
        const names = await listDocNamesSimple('Territory', 50);
        if (Array.isArray(names) && names.length > 0) setTerritoryOptions(names);
      } catch {}
      finally { setTerritoryLoading(false); }
    })();
  }, []);

  // Load Associate Details options on mount (use User suggestions for names/emails)
  useEffect(() => {
    (async () => {
      try {
        setAssociateLoading(true);
        const users = await listUserSuggestions('', 20);
        if (Array.isArray(users) && users.length > 0) setAssociateOptions(users);
      } catch {}
      finally { setAssociateLoading(false); }
    })();
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />
      <View style={[styles.simpleHeader, { paddingTop: insets.top + 10 }]}> 
        <View style={styles.simpleHeaderRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onCancel} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
          <Text style={styles.simpleHeaderTitle}>Create Lead</Text>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lead Details</Text>

          <Text style={styles.fieldLabel}>Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(v => !v)}
            style={[styles.pickerInput, errors.date ? styles.inputError : null]}
            accessibilityRole="button"
            accessibilityLabel="Select date"
          >
            <Text style={{ color: leadForm.date ? '#111827' : '#9CA3AF' }}>{leadForm.date || 'Select date'}</Text>
            <Ionicons style={styles.fieldChevron} name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={leadForm.date ? parseDate(leadForm.date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_e, selected) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selected) setField('date')(formatDate(selected));
              }}
            />
          )}
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput value={leadForm.full_name} onChangeText={setField('full_name')} placeholder="Full Name" placeholderTextColor="#9CA3AF" style={[styles.input, errors.full_name ? styles.inputError : null]} />
          {errors.full_name ? <Text style={styles.errorText}>{errors.full_name}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Lead Owner</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={leadForm.lead_owner}
              onChangeText={setField('lead_owner')}
              placeholder="owner email or name"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, errors.lead_owner ? styles.inputError : null]}
              onFocus={() => setOwnerOpen(true)}
              onBlur={() => { if (!ownerInteracting) setOwnerOpen(false); }}
            />
            {ownerOpen && (
              <View style={styles.suggestPanel}>
                {ownerLoading ? (
                  <View style={{ padding: 10, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : ownerList.length > 0 ? (
                  <ScrollView
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                    nestedScrollEnabled
                    contentContainerStyle={{ paddingVertical: 4 }}
                    style={{ height: 220 }}
                    onTouchStart={() => setOwnerInteracting(true)}
                    onTouchEnd={() => setTimeout(() => setOwnerInteracting(false), 100)}
                  >
                    {ownerList.map(({ email, fullName }) => (
                      <Pressable key={email} style={styles.suggestItem} onPress={() => { setField('lead_owner')(email); setOwnerOpen(false); }} accessibilityRole="button">
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestText} numberOfLines={1}>{email}</Text>
                          {fullName ? <Text style={styles.suggestSub} numberOfLines={1}>{fullName}</Text> : null}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: '#6b7280' }}>No suggestions</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          {errors.lead_owner ? <Text style={styles.errorText}>{errors.lead_owner}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male','Female','Other'].map((g) => (
              <Pressable key={g} style={[styles.genderButton, leadForm.gender === g && styles.genderButtonSelected]} onPress={() => setField('gender')(g)} accessibilityRole="button" accessibilityLabel={`Select ${g}`}>
                <Text style={[styles.genderText, leadForm.gender === g && styles.genderTextSelected]}>{g}</Text>
              </Pressable>
            ))}
          </View>
          {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Status</Text>
          <Pressable onPress={() => setStatusOpen(v => !v)} style={[styles.pickerInput, errors.status ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select status">
            <Text style={{ color: leadForm.status ? '#111827' : '#9CA3AF' }}>{leadForm.status || (statusLoading ? 'Loading…' : 'Select status')}</Text>
            <Ionicons style={styles.fieldChevron} name={statusOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {statusOpen && (
            <View style={styles.dropdownPanel}>
              {(statusOptions.length > 0 ? statusOptions : ['Open','New','Contacted','Qualified','Prospect','Converted','Lost']).map((opt) => (
                <Pressable key={opt} style={styles.optionItem} onPress={() => { setField('status')(opt); setStatusOpen(false); }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {errors.status ? <Text style={styles.errorText}>{errors.status}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Source</Text>
          <Pressable onPress={() => setSourceOpen(v => !v)} style={[styles.pickerInput, errors.source ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select source">
            <Text style={{ color: leadForm.source ? '#111827' : '#9CA3AF' }}>{leadForm.source || (sourceLoading ? 'Loading…' : 'Select source')}</Text>
            <Ionicons style={styles.fieldChevron} name={sourceOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {sourceOpen && (
            <View style={styles.dropdownPanel}>
              {(sourceOptions.length > 0 ? sourceOptions : ['Website','Phone','Email','Referral','Campaign','Event']).map((opt) => (
                <Pressable key={opt} style={styles.optionItem} onPress={() => { setField('source')(opt); setSourceOpen(false); }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {errors.source ? <Text style={styles.errorText}>{errors.source}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Lead Type</Text>
          <Pressable onPress={() => setLeadTypeOpen(v => !v)} style={[styles.pickerInput, errors.lead_type ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select lead type">
            <Text style={{ color: leadForm.lead_type ? '#111827' : '#9CA3AF' }}>{leadForm.lead_type || (leadTypeLoading ? 'Loading…' : 'Select lead type')}</Text>
            <Ionicons style={styles.fieldChevron} name={leadTypeOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {leadTypeOpen && (
            <View style={styles.dropdownPanel}>
              {(leadTypeOptions.length > 0 ? leadTypeOptions : ['Individual','Company','Partner']).map((opt) => (
                <Pressable key={opt} style={styles.optionItem} onPress={() => { setField('lead_type')(opt); setLeadTypeOpen(false); }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {errors.lead_type ? <Text style={styles.errorText}>{errors.lead_type}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Associate Details</Text>
          <Pressable onPress={() => setAssociateOpen(v => !v)} style={[styles.pickerInput, errors.associate_details ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select associate">
            <Text style={{ color: leadForm.associate_details ? '#111827' : '#9CA3AF' }}>{leadForm.associate_details || (associateLoading ? 'Loading…' : 'Select associate')}</Text>
            <Ionicons style={styles.fieldChevron} name={associateOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {associateOpen && (
            <View style={styles.dropdownPanel}>
              {(associateOptions.length > 0 ? associateOptions : []).map(({ email, fullName }) => (
                <Pressable key={email} style={styles.optionItem} onPress={() => { setField('associate_details')(email); setAssociateOpen(false); }}>
                  <Text style={styles.optionText}>{email}</Text>
                  {fullName ? <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{fullName}</Text> : null}
                </Pressable>
              ))}
              {(!associateLoading && associateOptions.length === 0) && (
                <View style={styles.optionItem}><Text style={[styles.optionText, { color: '#6b7280' }]}>No associates</Text></View>
              )}
            </View>
          )}
          {errors.associate_details ? <Text style={styles.errorText}>{errors.associate_details}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Request Type</Text>
          <Pressable onPress={() => setRequestTypeOpen(v => !v)} style={[styles.pickerInput, errors.request_type ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select request type">
            <Text style={{ color: leadForm.request_type ? '#111827' : '#9CA3AF' }}>{leadForm.request_type || (requestTypeLoading ? 'Loading…' : 'Select request type')}</Text>
            <Ionicons style={styles.fieldChevron} name={requestTypeOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {requestTypeOpen && (
            <View style={styles.dropdownPanel}>
              {(requestTypeOptions.length > 0 ? requestTypeOptions : ['New Request','Upgrade','Support','Cancellation']).map((opt) => (
                <Pressable key={opt} style={styles.optionItem} onPress={() => { setField('request_type')(opt); setRequestTypeOpen(false); }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {errors.request_type ? <Text style={styles.errorText}>{errors.request_type}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Building & Location</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={leadForm.location}
              onChangeText={(t) => { setField('location')(t); setLocPicked(null); }}
              onFocus={() => setLocSuggestOpen(true)}
              onBlur={() => { if (!locSuggestInteracting) setLocSuggestOpen(false); }}
              placeholder="Building & Location"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, errors.location ? styles.inputError : null]}
            />
            {locSuggestOpen && (
              <View style={styles.suggestPanel}>
                {locSuggestLoading ? (
                  <View style={{ padding: 10, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : locSuggestOptions.length > 0 ? (
                  <ScrollView
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                    nestedScrollEnabled
                    contentContainerStyle={{ paddingVertical: 4 }}
                    style={{ height: 220 }}
                    onTouchStart={() => setLocSuggestInteracting(true)}
                    onTouchEnd={() => setTimeout(() => setLocSuggestInteracting(false), 100)}
                  >
                    {locSuggestOptions.map((name) => (
                      <Pressable key={name} style={styles.suggestItem} onPress={() => { setField('location')(name); setLocPicked(name); setLocSuggestOpen(false); }} accessibilityRole="button">
                        <Text style={styles.suggestText} numberOfLines={1}>{name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: '#6b7280' }}>No matches</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Service Type</Text>
          <Pressable onPress={() => setServiceTypeOpen(v => !v)} style={[styles.pickerInput, errors.service_type ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select service type">
            <Text style={{ color: leadForm.service_type ? '#111827' : '#9CA3AF' }}>{leadForm.service_type || (serviceTypeLoading ? 'Loading…' : 'Select service type')}</Text>
            <Ionicons style={styles.fieldChevron} name={serviceTypeOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {serviceTypeOpen && (
            <View style={styles.dropdownPanel}>
              {(serviceTypeOptions.length > 0 ? serviceTypeOptions : ['Installation','Maintenance','Support']).map((opt) => (
                <Pressable key={opt} style={styles.optionItem} onPress={() => { setField('service_type')(opt); setServiceTypeOpen(false); }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {errors.service_type ? <Text style={styles.errorText}>{errors.service_type}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput value={leadForm.email_id} onChangeText={setField('email_id')} placeholder="Email" placeholderTextColor="#9CA3AF" style={[styles.input, errors.email_id ? styles.inputError : null]} keyboardType="email-address" autoCapitalize="none" />
          {errors.email_id ? <Text style={styles.errorText}>{errors.email_id}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <TextInput value={leadForm.mobile_no} onChangeText={setField('mobile_no')} placeholder="Mobile Number" placeholderTextColor="#9CA3AF" style={[styles.input, errors.mobile_no ? styles.inputError : null]} keyboardType="phone-pad" />
          {errors.mobile_no ? <Text style={styles.errorText}>{errors.mobile_no}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Website</Text>
          <TextInput value={leadForm.website} onChangeText={setField('website')} placeholder="Website" placeholderTextColor="#9CA3AF" style={[styles.input, errors.website ? styles.inputError : null]} autoCapitalize="none" />
          {errors.website ? <Text style={styles.errorText}>{errors.website}</Text> : null}
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Territory</Text>
          <Pressable onPress={() => setTerritoryOpen(v => !v)} style={[styles.pickerInput, errors.territory ? styles.inputError : null]} accessibilityRole="button" accessibilityLabel="Select territory">
            <Text style={{ color: leadForm.territory ? '#111827' : '#9CA3AF' }}>{leadForm.territory || (territoryLoading ? 'Loading…' : 'Select territory')}</Text>
            <Ionicons style={styles.fieldChevron} name={territoryOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </Pressable>
          {territoryOpen && (
            <View style={styles.dropdownPanel}>
              {(territoryOptions.length > 0 ? territoryOptions : []).map((opt) => (
                <Pressable key={opt} style={styles.optionItem} onPress={() => { setField('territory')(opt); setTerritoryOpen(false); }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
              {(!territoryLoading && territoryOptions.length === 0) && (
                <View style={styles.optionItem}><Text style={[styles.optionText, { color: '#6b7280' }]}>No territories</Text></View>
              )}
            </View>
          )}
          {errors.territory ? <Text style={styles.errorText}>{errors.territory}</Text> : null}
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable style={styles.bottomBtnGhost} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.bottomBtnGhostText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.bottomBtnPrimary} onPress={handleSave} accessibilityRole="button" disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.bottomBtnPrimaryText}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  simpleHeader: { backgroundColor: HEADER_BG, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  simpleHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  simpleHeaderTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, textAlign: 'center', flex: 1 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  card: { backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, color: '#111827', backgroundColor: '#FFFFFF' },
  inputWrapper: { position: 'relative' },
  inputWithIcon: { paddingRight: 40 },
  fieldIconBtn: { position: 'absolute', right: 8, top: 8, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pickerInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldChevron: { marginLeft: 8 },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  // Suggest dropdown for Lead Owner
  suggestPanel: { position: 'absolute', top: 46, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, height: 220, zIndex: 20, elevation: 6, overflow: 'hidden' },
  suggestItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  suggestText: { color: '#111827', flexShrink: 1, fontWeight: '500', fontSize: 12, lineHeight: 16 },
  suggestSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  // Simple dropdown list
  dropdownPanel: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  optionItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionText: { color: '#111827', fontSize: 14 },
  // Gender toggle
  genderRow: { flexDirection: 'row' },
  genderButton: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginRight: 8, backgroundColor: '#fff' },
  genderButtonSelected: { backgroundColor: '#0b0b1b', borderColor: '#0b0b1b' },
  genderText: { color: '#111827', fontWeight: '600' },
  genderTextSelected: { color: '#fff', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EFF2F5', marginVertical: 8 },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', paddingTop: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between' },
  bottomBtnPrimary: { backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  bottomBtnPrimaryText: { color: '#ffffff', fontWeight: '700' },
  bottomBtnGhost: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  bottomBtnGhostText: { color: '#111827', fontWeight: '700' },
});
