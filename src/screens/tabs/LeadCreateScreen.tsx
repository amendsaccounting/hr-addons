import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator, PermissionsAndroid } from 'react-native';
import Config from 'react-native-config';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createLead, prepareLeadPayload, fetchLeadStatusOptions, listBuildingLocations, fetchLeadFieldOptions, listAssociates, fetchLeadFieldMeta, searchDocNames, buildCommonLinkFilters, getLocationDoctypeHint, existsDocName, listDocNamesSimple } from '../../services/leadService';

const HEADER_BG = '#0b0b1b';
// Max height (in px) for inline dropdown lists before they scroll
const DROPDOWN_MAX_HEIGHT = 260;
// Slightly smaller dropdown for Associate list
const ASSOCIATE_DROPDOWN_MAX_HEIGHT = 140;

(Ionicons as any)?.loadFont?.();

type Props = {
  onCancel?: () => void;
  onCreated?: () => void;
};

export default function LeadCreateScreen({ onCancel, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);
  const [leadTypeOptions, setLeadTypeOptions] = useState<string[]>([]);
  const [requestOptions, setRequestOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [serviceLinkDoctype, setServiceLinkDoctype] = useState<string | null>(null);
  const [serviceFieldKey, setServiceFieldKey] = useState<'custom_service_type' | 'service_type' | null>(null);
  const [serviceLinkFilters, setServiceLinkFilters] = useState<Record<string, any> | undefined>();
  const [sourceLinkDoctype, setSourceLinkDoctype] = useState<string | null>(null);
  const [sourceFieldKey, setSourceFieldKey] = useState<'source' | 'lead_source' | 'custom_source' | null>(null);
  const [sourceLinkFilters, setSourceLinkFilters] = useState<Record<string, any> | undefined>();
  const [leadOwnerLinkDoctype, setLeadOwnerLinkDoctype] = useState<string | null>(null);
  const [leadOwnerFieldKey, setLeadOwnerFieldKey] = useState<'lead_owner' | 'owner' | null>(null);
  const [leadOwnerFilters, setLeadOwnerFilters] = useState<Record<string, any> | undefined>();
  const [leadOwnerOptions, setLeadOwnerOptions] = useState<string[]>([]);
  const [territoryLinkDoctype, setTerritoryLinkDoctype] = useState<string | null>(null);
  const [territoryFieldKey, setTerritoryFieldKey] = useState<'territory' | 'custom_territory' | null>(null);
  const [territoryFilters, setTerritoryFilters] = useState<Record<string, any> | undefined>();
  const [territoryOptions, setTerritoryOptions] = useState<string[]>([]);
  const [locationLinkDoctype, setLocationLinkDoctype] = useState<string | null>(null);
  const [locationFieldKey, setLocationFieldKey] = useState<'custom_building__location' | 'location' | null>(null);
  const [locationFilters, setLocationFilters] = useState<Record<string, any> | undefined>();
  

  const [form, setForm] = useState<any>({
    date: '',
    lead_name: '',
    company_name: '',
    email_id: '',
    mobile_no: '',
    phone: '',
    website: '',
    whatsapp: '',
    source: '',
    status: '',
    territory: '',
    custom_building__location: '',
    lead_owner: '',
    gender: '',
    lead_type: '',
    associate: '',
    request_type: '',
    service_type: '',
    notes: '',
  });

console.log("form====>",form);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStatus(true);
        const opts = await fetchLeadStatusOptions();
        if (!cancelled) setStatusOptions(opts);
      } catch {
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load other dropdown options (source, lead type, request, service)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDropdowns(true);
        const [src, ltype, req, svc, svcMeta, srcMeta, ownerMeta, ownerOpts, terrMeta, terrOpts, locMeta] = await Promise.all([
          fetchLeadFieldOptions(['source']),
          fetchLeadFieldOptions(['custom_lead_type', 'lead_type']),
          fetchLeadFieldOptions(['custom_request_type', 'request_type']),
          fetchLeadFieldOptions(['custom_service_type', 'service_type']),
          fetchLeadFieldMeta(['custom_service_type', 'service_type']),
          fetchLeadFieldMeta(['source', 'lead_source', 'custom_source']),
          fetchLeadFieldMeta(['lead_owner', 'owner']),
          fetchLeadFieldOptions(['lead_owner', 'owner']),
          fetchLeadFieldMeta(['territory', 'custom_territory']),
          fetchLeadFieldOptions(['territory', 'custom_territory']),
          fetchLeadFieldMeta(['custom_building__location', 'location']),
        ]);
        if (!cancelled) {
          setSourceOptions(src);
          setLeadTypeOptions(ltype);
          setRequestOptions(req);
          setServiceOptions(svc);
          setLeadOwnerOptions(ownerOpts);
          setTerritoryOptions(terrOpts);
          const ft = (svcMeta as any)?.fieldtype;
          const opt = (svcMeta as any)?.options;
          const fname = (svcMeta as any)?.fieldname as string | undefined;
          if (String(ft) === 'Link' && typeof opt === 'string' && opt) {
            setServiceLinkDoctype(opt);
            setServiceFieldKey((fname === 'custom_service_type' || fname === 'service_type') ? (fname as any) : 'service_type');
            // Try to build common filters like disabled=0 for the link doctype
            try { const f = await buildCommonLinkFilters(opt); if (!cancelled) setServiceLinkFilters(f); } catch {}
          } else {
            setServiceLinkDoctype(null);
            setServiceFieldKey((fname === 'custom_service_type' || fname === 'service_type') ? (fname as any) : 'service_type');
            setServiceLinkFilters(undefined);
          }

          // Source meta
          const sft = (srcMeta as any)?.fieldtype;
          const sopt = (srcMeta as any)?.options;
          const sfname = (srcMeta as any)?.fieldname as string | undefined;
          if (String(sft) === 'Link' && typeof sopt === 'string' && sopt) {
            setSourceLinkDoctype(sopt);
            setSourceFieldKey((sfname === 'source' || sfname === 'lead_source' || sfname === 'custom_source') ? (sfname as any) : 'source');
            try { const f2 = await buildCommonLinkFilters(sopt); if (!cancelled) setSourceLinkFilters(f2); } catch {}
          } else {
            setSourceLinkDoctype(null);
            setSourceFieldKey((sfname === 'source' || sfname === 'lead_source' || sfname === 'custom_source') ? (sfname as any) : 'source');
            setSourceLinkFilters(undefined);
          }

          // Lead Owner meta (often Link to User)
          const oft = (ownerMeta as any)?.fieldtype;
          const oopt = (ownerMeta as any)?.options;
          const oname = (ownerMeta as any)?.fieldname as string | undefined;
          if (String(oft) === 'Link' && typeof oopt === 'string' && oopt) {
            setLeadOwnerLinkDoctype(oopt);
            setLeadOwnerFieldKey((oname === 'lead_owner' || oname === 'owner') ? (oname as any) : 'lead_owner');
            try { const f3 = await buildCommonLinkFilters(oopt); if (!cancelled) setLeadOwnerFilters(f3); } catch {}
          } else {
            setLeadOwnerLinkDoctype(null);
            setLeadOwnerFieldKey((oname === 'lead_owner' || oname === 'owner') ? (oname as any) : 'lead_owner');
            setLeadOwnerFilters(undefined);
          }

          // Territory meta (usually Link to Territory)
          const tft = (terrMeta as any)?.fieldtype;
          const topt = (terrMeta as any)?.options;
          const tname = (terrMeta as any)?.fieldname as string | undefined;
          if (String(tft) === 'Link' && typeof topt === 'string' && topt) {
            setTerritoryLinkDoctype(topt);
            setTerritoryFieldKey((tname === 'territory' || tname === 'custom_territory') ? (tname as any) : 'territory');
            try { const f4 = await buildCommonLinkFilters(topt); if (!cancelled) setTerritoryFilters(f4); } catch {}
          } else {
            setTerritoryLinkDoctype(null);
            setTerritoryFieldKey((tname === 'territory' || tname === 'custom_territory') ? (tname as any) : 'territory');
            setTerritoryFilters(undefined);
          }

          // Location meta (Building & Location link)
          const lft = (locMeta as any)?.fieldtype;
          const lopt = (locMeta as any)?.options;
          const lname = (locMeta as any)?.fieldname as string | undefined;
          if (String(lft) === 'Link' && typeof lopt === 'string' && lopt) {
            setLocationLinkDoctype(lopt);
            setLocationFieldKey((lname === 'custom_building__location' || lname === 'location') ? (lname as any) : 'custom_building__location');
            try { const f5 = await buildCommonLinkFilters(lopt); if (!cancelled) setLocationFilters(f5); } catch {}
          } else {
            setLocationLinkDoctype(null);
            setLocationFieldKey((lname === 'custom_building__location' || lname === 'location') ? (lname as any) : 'custom_building__location');
            setLocationFilters(undefined);
            // Fallback to env-configured doctype hint if meta not available
            const hint = getLocationDoctypeHint();
            if (hint) setLocationLinkDoctype(hint);
          }
        }
      } catch {
      } finally {
        if (!cancelled) setLoadingDropdowns(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isPresent = (v: any) => String(v ?? '').trim().length > 0;
  const REQUIRED_KEYS: Array<keyof typeof form> = [
    'date', 'lead_name', 'lead_owner', 'gender', 'source', 'status', 'lead_type', 'associate', 'request_type', 'location', 'service_type', 'email_id', 'mobile_no', 'phone', 'website', 'territory', 'notes'
  ];
  const missingFields = useMemo(() => REQUIRED_KEYS.filter((k) => !isPresent((form as any)[k])), [form]);
  const canSave = useMemo(() => missingFields.length === 0 && !saving, [missingFields.length, saving]);

  async function onSave() {
    if (!canSave) return;
    try {
      setSaving(true);
      if (missingFields.length > 0) {
        const labelMap: Record<string, string> = {
          date: 'Date', lead_name: 'Lead Name', lead_owner: 'Lead Owner', gender: 'Gender', source: 'Source', status: 'Status', lead_type: 'Lead Type', associate: 'Associate details', request_type: 'Request type', location: 'Building & Location', service_type: 'Service Type', email_id: 'Email', mobile_no: 'Mobile Number', phone: 'Phone Number', website: 'Website', territory: 'Territory', notes: 'Notes',
        };
        const list = missingFields.map((k) => labelMap[String(k)] || String(k));
        Alert.alert('Missing fields', list.join(', '));
        return;
      }

      // Allow typing for Building & Location; server will auto-create if enabled

      // Validate other link fields similarly to avoid server LinkValidationError
      const mustExist = async (label: string, doctype: string | null, value: any) => {
        const v = String(value || '').trim();
        if (!doctype || !v) return true;
        const ok = await existsDocName(doctype, v);
        if (!ok) { Alert.alert(label, `Please select a valid ${label.toLowerCase()} from the list.`); return false; }
        return true;
      };
      if (!(await mustExist('Service Type', serviceLinkDoctype, form.service_type))) return;
      if (!(await mustExist('Territory', territoryLinkDoctype, form.territory))) return;
      if (!(await mustExist('Lead Owner', leadOwnerLinkDoctype, form.lead_owner))) return;
      if (!(await mustExist('Source', sourceLinkDoctype, form.source))) return;
      // Prepare notes with associate details if provided
      let notesOut = form.notes;
      if (form.associate) {
        const prefix = `Associate: ${form.associate}`;
        notesOut = notesOut ? `${prefix}\n${notesOut}` : prefix;
      }
      const payload = prepareLeadPayload({
        lead_name: form.lead_name,
        company_name: form.company_name,
        email_id: form.email_id,
        mobile_no: form.mobile_no,
        phone: form.phone,
        website: form.website,
        whatsapp: form.whatsapp,
        source: form.source,
        status: form.status,
        territory: form.territory,
        date: form.date,
        location: form.location,
        lead_owner: form.lead_owner,
        gender: form.gender,
        lead_type: form.lead_type,
        request_type: form.request_type,
        service_type: form.service_type,
        notes: notesOut,
      });
      const created = await createLead(payload);
      if (!created) throw new Error('Create failed');
      Alert.alert('Lead', 'Lead created successfully');
      onCreated?.();
    } catch (e: any) {
      Alert.alert('Lead', e?.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  }

  const setField = (k: string) => (v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  // Reverse geocode helpers
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    const GOOGLE_KEY = (Config as any)?.GOOGLE_MAPS_API_KEY || (Config as any)?.GOOGLE_API_KEY;
    try {
      if (GOOGLE_KEY) {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}&language=en`;
        const gRes = await fetch(gUrl);
        const gj = await gRes.json().catch(() => null as any);
        const first = gj?.results?.[0];
        const formatted = first?.formatted_address as string | undefined;
        const comps: any[] = Array.isArray(first?.address_components) ? first.address_components : [];
        const findComp = (fn: (c: any) => boolean) => comps.find(fn);
        // Prefer sublocality/neighborhood (e.g., "Al Nahda")
        const areaComp = findComp((c) => Array.isArray(c?.types) && (c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')));
        const area = (areaComp?.long_name as string | undefined)?.trim();
        if (area) return area; // return exact area like "Al Nahda"
        // Next, try building/premise when area not available
        const premiseComp = findComp((c) => Array.isArray(c?.types) && (c.types.includes('premise') || c.types.includes('establishment') || c.types.includes('point_of_interest')));
        const premise = (premiseComp?.long_name as string | undefined)?.trim();
        if (premise) return premise;
        if (formatted) return String(formatted);
        // Nearby place name as a last Google hint
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50&type=establishment&key=${GOOGLE_KEY}`;
        const nRes = await fetch(nearbyUrl);
        const nj = await nRes.json().catch(() => null as any);
        const placeName = (nj?.results?.[0]?.name as string | undefined)?.trim();
        if (placeName) return placeName;
      }
    } catch {}
    try {
      const nUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`;
      const nRes = await fetch(nUrl, { headers: { 'User-Agent': 'hr_addons/1.0 (reverse-geocode)', 'Accept-Language': 'en' } as any });
      const nj = await nRes.json().catch(() => null as any);
      // Prefer OSM area keys for short locality like "Al Nahda"
      const addr: any = nj?.address || {};
      const area = (addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.village || addr.town || addr.city) as string | undefined;
      if (area && String(area).trim().length > 0) return String(area).trim();
      // Otherwise try building name
      const bname = (addr.building || addr.public_building || addr.house_name || nj?.name) as string | undefined;
      if (bname && String(bname).trim().length > 0) return String(bname).trim();
      const display = nj?.display_name as string | undefined;
      if (display && display.length > 0) return display;
    } catch {}
    return `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
  };

  // Autofill current location on mount (silent) if permission is already granted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Only autofill when field is empty
        if (String((form as any)?.location || '').trim().length > 0) return;
        let granted = false;
        if (Platform.OS === 'android') {
          try {
            granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          } catch { granted = false; }
        } else {
          try {
            const status = await (Geolocation as any).requestAuthorization?.('whenInUse');
            granted = status === 'granted' || status === 'authorized' || status === 'always';
          } catch { granted = false; }
        }
        if (!granted) return;
        const pos: any = await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (p) => resolve(p),
            (e) => reject(e),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
          );
        });
        if (cancelled) return;
        const { latitude, longitude } = (pos?.coords || {}) as any;
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          const addr = await reverseGeocode(latitude, longitude);
          if (cancelled) return;
          setForm((p: any) => {
            if (String(p?.location || '').trim().length > 0) return p;
            return { ...p, location: addr };
          });
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // no explicit button-triggered location fill; autofill runs on mount when permission is granted

  // Fall back to minimal sensible defaults if ERP has no options
  const SOURCE_OPTIONS = useMemo(() => (sourceOptions.length ? sourceOptions : ['Website', 'Referral', 'Advertisement', 'Cold Call', 'Social', 'Email']), [sourceOptions]);
  // ERPNext defaults: Client, Channel Partner, Consultant
  const LEADTYPE_OPTIONS = useMemo(() => (leadTypeOptions.length ? leadTypeOptions : ['Client', 'Channel Partner', 'Consultant']), [leadTypeOptions]);
  const REQUEST_OPTIONS = useMemo(() => (requestOptions.length ? requestOptions : ['New', 'Support', 'Upgrade', 'Demo']), [requestOptions]);
  const SERVICE_OPTIONS = useMemo(() => (serviceOptions.length ? serviceOptions : ['Installation', 'Maintenance', 'Consulting']), [serviceOptions]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} translucent />
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}> 
        <View style={styles.headerTopRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onCancel} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.headerInfoRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="person-add" size={18} color="#0b0b1b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerBigTitle}>Create Lead</Text>
            <Text style={styles.headerSubtitle}>Add contact and lead details</Text>
          </View>
          <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>Creating</Text></View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Lead Details in required order */}
          <Card>
            <CardTitle>Lead Details</CardTitle>
            <DateField label="Date" value={form.date} onChange={(v) => setField('date')(v)} required />
            <Divider />
            <Field label="Lead Name" value={form.lead_name} onChangeText={setField('lead_name')} required />
            <Divider />
            {leadOwnerLinkDoctype ? (
              <LinkSelect label="Lead Owner" doctype={leadOwnerLinkDoctype} value={form.lead_owner} onChange={(v) => setField('lead_owner')(v)} referenceField={leadOwnerFieldKey} filters={leadOwnerFilters} required />
            ) : (
              <SelectField label="Lead Owner" value={form.lead_owner} placeholder={loadingDropdowns ? 'Loading…' : 'Select lead owner'} options={leadOwnerOptions} onSelect={(v) => setField('lead_owner')(v)} required />
            )}
            <Divider />
            <GenderToggle value={form.gender} onChange={(g) => setField('gender')(g)} required />
            <Divider />
            {sourceLinkDoctype ? (
              <LinkSelect label="Source" doctype={sourceLinkDoctype} value={form.source} onChange={(v) => setField('source')(v)} referenceField={sourceFieldKey} filters={sourceLinkFilters} required />
            ) : (
              <SelectField label="Source" value={form.source} placeholder={loadingDropdowns ? 'Loading…' : 'Select source'} options={SOURCE_OPTIONS} onSelect={(v) => setField('source')(v)} required />
            )}
            <Divider />
            <SelectField label="Status" value={form.status} placeholder={loadingStatus ? 'Loading…' : 'Select status'} options={statusOptions} onSelect={(v) => setField('status')(v)} disabled={loadingStatus || statusOptions.length === 0} required />
            <Divider />
            <SelectField label="Lead Type" value={form.lead_type} placeholder="Select lead type" options={LEADTYPE_OPTIONS} onSelect={(v) => setField('lead_type')(v)} required />
            <Divider />
            <AssociateSelect label="Associate details" value={form.associate} onChange={(v) => setField('associate')(v)} required />
            <Divider />
            <SelectField label="Request type" value={form.request_type} placeholder="Select request type" options={REQUEST_OPTIONS} onSelect={(v) => setField('request_type')(v)} required />
            <Divider />
            {locationLinkDoctype ? (
              <LinkSelect label="Building & Location" doctype={locationLinkDoctype} value={form.location} onChange={(v) => setField('location')(v)} referenceField={locationFieldKey} filters={locationFilters} required showSearch={false} />
            ) : (
              <LocationSelect label="Building & Location" value={form.location} onChange={(v) => setField('location')(v)} required showSearch={false} />
            )}
            <Divider />
            {serviceLinkDoctype ? (
              <LinkSelect label="Service Type" doctype={serviceLinkDoctype} value={form.service_type} onChange={(v) => setField('service_type')(v)} referenceField={serviceFieldKey} filters={serviceLinkFilters} required />
            ) : (
              <SelectField label="Service Type" value={form.service_type} placeholder="Select service type" options={SERVICE_OPTIONS} onSelect={(v) => setField('service_type')(v)} required />
            )}
          </Card>

          {/* Contact Information */}
          <Card>
            <CardTitle>Contact Information</CardTitle>
            <Field label="Email" value={form.email_id} onChangeText={setField('email_id')} keyboardType="email-address" required />
            <Divider />
            <PhoneField label="Mobile Number" value={form.mobile_no} onChangeText={setField('mobile_no')} required />
            <Divider />
            <PhoneField label="Phone Number" value={form.phone} onChangeText={setField('phone')} required />
            <Divider />
            <Field label="Website" value={form.website} onChangeText={setField('website')} autoCapitalize="none" required />
          </Card>

          {/* Organisation */}
          <Card>
            <CardTitle>Organisation</CardTitle>
            {territoryLinkDoctype ? (
              <LinkSelect label="Territory" doctype={territoryLinkDoctype} value={form.territory} onChange={(v) => setField('territory')(v)} referenceField={territoryFieldKey} filters={territoryFilters} required />
            ) : (
              <SelectField label="Territory" value={form.territory} placeholder={loadingDropdowns ? 'Loading…' : 'Select territory'} options={territoryOptions} onSelect={(v) => setField('territory')(v)} required />
            )}
          </Card>

          {/* Notes */}
          <Card>
            <CardTitle>Notes</CardTitle>
            <TextInput
              value={form.notes}
              onChangeText={setField('notes')}
              placeholder="Type notes..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              multiline
            />
          </Card>

          {/* Save button below the form */}
          <View style={{ marginHorizontal: 12, marginTop: 16, marginBottom: 24 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Lead"
              onPress={onSave}
              disabled={!canSave}
              style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* UI Helpers */
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

function Field({ label, value, onChangeText, keyboardType, autoCapitalize, required, placeholder }: { label: string; value: string; onChangeText: (t: string) => void; keyboardType?: any; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; required?: boolean; placeholder?: string }) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function DateField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const parseDate = (s?: string): Date => {
    const v = String(s || '').trim();
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date();
  };
  const fmt = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const date = parseDate(value);
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <Pressable onPress={() => setOpen(o => !o)} style={styles.selectInput} accessibilityRole="button">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={[styles.selectText, !value && { color: '#9CA3AF' }]}>{value || 'YYYY-MM-DD'}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </Pressable>
      {open && (
        <View style={[styles.dropdownPanel, { marginTop: 6 }]}> 
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              if (Platform.OS === 'android') setOpen(false);
              if (selected) onChange(fmt(new Date(selected)));
            }}
          />
        </View>
      )}
    </View>
  );
}

function PhoneField({ label, value, onChangeText, required }: { label: string; value: string; onChangeText: (t: string) => void; required?: boolean }) {
  // ERPNext default per your instance
  const DEFAULT_CODE = '+971';
  const CODES = Array.from(new Set([DEFAULT_CODE, '+91', '+1', '+44', '+61', '+81', '+971', '+49', '+33', '+39']));
  const parse = (v: string): { code: string; local: string } => {
    const m = String(v || '').match(/^(\+\d{1,4})\s*(.*)$/);
    if (m) return { code: m[1], local: m[2] };
    return { code: DEFAULT_CODE, local: String(v || '') };
  };
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string>(parse(value).code);
  const [local, setLocal] = useState<string>(parse(value).local);
  useEffect(() => { onChangeText(`${code} ${local}`.trim()); }, [code, local]);
  useEffect(() => { const p = parse(value); setCode(p.code); setLocal(p.local); }, []);
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <View style={styles.phoneRow}>
        <Pressable onPress={() => setOpen(o => !o)} style={styles.codeBtn} accessibilityRole="button" accessibilityLabel="Country code">
          <Text style={styles.codeText}>{code}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7280" />
        </Pressable>
        <TextInput
          value={local}
          onChangeText={(t) => setLocal(t.replace(/[^0-9]/g, ''))}
          style={styles.inputBare}
          keyboardType="phone-pad"
        />
      </View>
      {open && (
        <View style={[styles.dropdownPanel, { marginTop: 6 }]}> 
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {CODES.map((c) => (
              <Pressable key={c} onPress={() => { setCode(c); setOpen(false); }} style={styles.optionItem}>
                <Text style={styles.optionText}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function GenderToggle({ value, onChange, required }: { value: string; onChange: (g: 'Male' | 'Female') => void; required?: boolean }) {
  const v = (value as any) as 'Male' | 'Female' | '';
  const maleActive = v === 'Male';
  const femaleActive = v === 'Female';
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>Gender{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <View style={styles.segmentWrap}>
        <Pressable onPress={() => onChange('Male')} style={[styles.segmentItem, maleActive && styles.segmentItemActive]} accessibilityRole="button" accessibilityLabel="Male">
          <Text style={[styles.segmentText, maleActive && styles.segmentTextActive]}>Male</Text>
        </Pressable>
        <Pressable onPress={() => onChange('Female')} style={[styles.segmentItem, femaleActive && styles.segmentItemActive]} accessibilityRole="button" accessibilityLabel="Female">
          <Text style={[styles.segmentText, femaleActive && styles.segmentTextActive]}>Female</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SelectField({ label, value, placeholder, options, onSelect, disabled, required }: { label: string; value: string; placeholder?: string; options: string[]; onSelect: (v: string) => void; disabled?: boolean; required?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <Pressable disabled={disabled} onPress={() => setOpen((o) => !o)} style={[styles.selectInput, disabled && { opacity: 0.6 }]}>
        <Text style={[styles.selectTextEllipsize, !value && { color: '#9CA3AF' }]} numberOfLines={1} ellipsizeMode="tail">{value || placeholder || 'Select'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </Pressable>
      {open && (
        <View style={styles.dropdownPanel}>
          <ScrollView style={{ maxHeight: DROPDOWN_MAX_HEIGHT }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.length === 0 ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: '#6B7280' }}>No options</Text>
              </View>
            ) : options.map((opt) => (
              <Pressable key={opt} onPress={() => { onSelect(opt); setOpen(false); }} style={styles.optionItem}>
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function LocationSelect({ label, value, onChange, required, showSearch = true }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; showSearch?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let t: any;
    if (!open) return;
    t = setTimeout(async () => {
      setLoading(true);
      try { const rows = await listBuildingLocations(q, 25); setItems(rows); } catch { setItems([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => { if (open) { setQ(''); setItems([]); } }, [open]);

  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.selectInput}>
        <Text style={[styles.selectTextEllipsize, !value && { color: '#9CA3AF' }]} numberOfLines={1} ellipsizeMode="tail">{value || 'Select location'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </Pressable>
      {open && (
        <View style={styles.dropdownPanel}>
          {showSearch && (
            <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
              <TextInput value={q} onChangeText={setQ} placeholder="Search location" placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          )}
          {loading ? (
            <View style={{ padding: 16 }}><ActivityIndicator /></View>
          ) : (
            <ScrollView style={{ maxHeight: ASSOCIATE_DROPDOWN_MAX_HEIGHT }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {items.map((opt) => (
                <Pressable key={opt} onPress={() => { onChange(opt); setOpen(false); }} style={styles.optionItem}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
              {items.length === 0 && (
                value ? (
                  <Pressable onPress={() => { onChange(value); setOpen(false); }} style={styles.optionItem}>
                    <Text style={styles.optionText}>Use "{value}"</Text>
                  </Pressable>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ color: '#6B7280' }}>No options</Text>
                  </View>
                )
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function AssociateSelect({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let t: any;
    if (!open) return;
    t = setTimeout(async () => {
      setLoading(true);
      try { const rows = await listAssociates(q, 25); setItems(rows); } catch { setItems([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => { if (open) { setQ(''); setItems([]); } }, [open]);

  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.selectInput}>
        <Text style={[styles.selectText, !value && { color: '#9CA3AF' }]} numberOfLines={1}>{value || 'Select associate'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </Pressable>
      {open && (
        <View style={styles.dropdownPanel}>
          <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search or type associate name"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => { const t = q.trim(); if (t) { onChange(t); setOpen(false); } }}
            />
          </View>
          {loading ? (
            <View style={{ padding: 16 }}><ActivityIndicator /></View>
          ) : (
            <ScrollView style={{ maxHeight: DROPDOWN_MAX_HEIGHT }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {!!q.trim() && (
                <Pressable onPress={() => { onChange(q.trim()); setOpen(false); }} style={styles.optionItem}>
                  <Text style={[styles.optionText, { fontStyle: 'italic' }]}>Use "{q.trim()}"</Text>
                </Pressable>
              )}
              {items.map((opt) => (
                <Pressable key={opt} onPress={() => { onChange(opt); setOpen(false); }} style={styles.optionItem}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
              {items.length === 0 && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: '#6B7280' }}>No results. Type a name above and press Done.</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function LinkSelect({ label, doctype, value, onChange, referenceField, filters, required, showSearch = true }: { label: string; doctype: string; value: string; onChange: (v: string) => void; referenceField?: string | null; filters?: Record<string, any>; required?: boolean; showSearch?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let t: any;
    if (!open) return;
    t = setTimeout(async () => {
      setLoading(true);
      try {
        const qq = String(q || '').trim();
        let rows: string[] = [];
        if (qq.length === 0) {
          rows = await listDocNamesSimple(doctype, 25);
          if (!rows || rows.length === 0) {
            rows = await searchDocNames(doctype, qq, 25, { reference_doctype: 'Lead', reference_fieldname: referenceField || undefined, filters });
          }
        } else {
          rows = await searchDocNames(doctype, qq, 25, { reference_doctype: 'Lead', reference_fieldname: referenceField || undefined, filters });
        }
        setItems(rows);
      } catch { setItems([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, doctype]);

  useEffect(() => { if (open) { setQ(''); setItems([]); } }, [open]);

  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#dc2626' }}>{' *'}</Text> : null}</Text>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.selectInput}>
        <Text style={[styles.selectTextEllipsize, !value && { color: '#9CA3AF' }]} numberOfLines={1} ellipsizeMode="tail">{value || `Select ${label.toLowerCase()}`}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </Pressable>
      {open && (
        <View style={styles.dropdownPanel}>
          {showSearch && (
            <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
              <TextInput value={q} onChangeText={setQ} placeholder={`Search ${label.toLowerCase()}`} placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          )}
          {loading ? (
            <View style={{ padding: 16 }}><ActivityIndicator /></View>
          ) : (
            <ScrollView style={{ maxHeight: DROPDOWN_MAX_HEIGHT }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {showSearch && !!q.trim() && (
                <Pressable onPress={() => { onChange(q.trim()); setOpen(false); }} style={styles.optionItem}>
                  <Text style={[styles.optionText, { fontStyle: 'italic' }]}>Use "{q.trim()}"</Text>
                </Pressable>
              )}
              {items.map((opt) => (
                <Pressable key={opt} onPress={() => { onChange(opt); setOpen(false); }} style={styles.optionItem}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
              {items.length === 0 && (
                value ? (
                  <Pressable onPress={() => { onChange(value); setOpen(false); }} style={styles.optionItem}>
                    <Text style={styles.optionText}>Use "{value}"</Text>
                  </Pressable>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ color: '#6B7280' }}>No options</Text>
                  </View>
                )
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// Top-level helper inside component scope
async function fillCurrentLocation() {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Location Permission', message: 'Allow app to access your location to fill Building & Location.', buttonPositive: 'OK' }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Location', 'Permission denied');
        return;
      }
    }
    const getPos = () => new Promise<GeolocationPosition>((resolve, reject) => {
      try {
        (navigator as any)?.geolocation?.getCurrentPosition(
          (pos: any) => resolve(pos),
          (err: any) => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      } catch (e) { reject(e); }
    });
    const pos: any = await getPos();
    const { latitude, longitude } = pos?.coords || {};
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      // Set into form; user can save or edit further
      setForm((p: any) => ({ ...p, location: label }));
      Alert.alert('Location', 'Current location added to Building & Location');
    } else {
      Alert.alert('Location', 'Unable to read coordinates');
    }
  } catch (e: any) {
    Alert.alert('Location', e?.message || 'Failed to get current location');
  }
}

/* Styles */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  headerWrap: { backgroundColor: HEADER_BG, paddingHorizontal: 12, paddingBottom: 14, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginLeft: 2 },
  headerInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerBigTitle: { color: '#ffffff', fontWeight: '800', fontSize: 18 },
  headerSubtitle: { color: '#9CA3AF', marginTop: 2 },
  headerBadge: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  headerBadgeText: { color: '#e5e7eb', fontSize: 12, fontWeight: '600' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  saveBtn: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { backgroundColor: '#93C5FD' },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },

  scroll: { flex: 1 },
  card: { backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, color: '#111827', backgroundColor: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#EFF2F5', marginVertical: 4 },

  heroCard: { marginHorizontal: 12, marginTop: -18, backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  avatarLg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  namePreview: { fontSize: 17, fontWeight: '700', color: '#111827' },
  rolePreview: { marginTop: 4, color: '#6B7280' },
  statusChip: { alignSelf: 'flex-start', backgroundColor: '#E0F2FE', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  statusChipText: { color: '#0369A1', fontSize: 12, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#DBEAFE' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#1D4ED8' },

  primaryBtn: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#93C5FD' },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },

  selectInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { color: '#111827' },
  selectTextEllipsize: { color: '#111827', flexShrink: 1, marginRight: 8 },

  segmentWrap: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4 },
  segmentItem: { flex: 1, backgroundColor: 'transparent', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB' },
  segmentText: { color: '#6B7280', fontWeight: '600' },
  segmentTextActive: { color: '#111827' },

  dropdownPanel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginTop: 6, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  optionItem: { paddingHorizontal: 16, paddingVertical: 12 },
  optionText: { color: '#111827' },

  phoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8 },
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10 },
  codeText: { fontWeight: '600', color: '#111827' },
  inputBare: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#111827', backgroundColor: '#FFFFFF' },
});
