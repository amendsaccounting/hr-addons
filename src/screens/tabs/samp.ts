import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import TextField from '../../components/ui/TextField';
import Button from '../../components/ui/Button';
import { colors, spacing } from '../../styles/theme';
import { createLead, searchDocNames, fetchLeadStatusOptions, listBuildingLocations } from '../../services/leadService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toISODate } from '../../utils/date';

type Props = {
  onCanczel?: () => void;
  onCreated?: () => void;
};

export default function LeadCreateScreen({ onCancel, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  // General details
  const [date, setDate] = useState('');
  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [gender, setGender] = useState('');
  const [buildingLocation, setBuildingLocation] = useState('');
  const [source, setSource] = useState('');
  const [leadOwner, setLeadOwner] = useState('');
  const [status, setStatus] = useState('Open');
  const [leadType, setLeadType] = useState('');
  const [requestType, setRequestType] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [associateDetails, setAssociateDetails] = useState('');

  // Contact info
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [website, setWebsite] = useState('');
  const [territory, setTerritory] = useState('');
  // Suggestions
  const [sugSource, setSugSource] = useState<string[]>([]);
  const [sugOwner, setSugOwner] = useState<string[]>([]);
  const [sugTerritory, setSugTerritory] = useState<string[]>([]);
  const [sugLeadType, setSugLeadType] = useState<string[]>([]);
  const [sugRequestType, setSugRequestType] = useState<string[]>([]);
  const [serviceTypeSuggestions, setServiceTypeSuggestions] = useState<string[]>([]);
  const [sugBuildingLocation, setSugBuildingLocation] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<null | 'building' | 'source' | 'owner' | 'territory' | 'leadType' | 'requestType' | 'serviceType'>(null);
  const [saving, setSaving] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  async function onSubmit() {
    const name = leadName.trim();
    if (!name) { Alert.alert('Lead', 'Lead Name is required'); return; }
    try {
      setSaving(true);
      const payload: any = {
        // General
        lead_name: name,
        gender: gender || undefined,
        lead_owner: leadOwner || undefined,
        status: status || undefined,
        source: source || undefined,
        territory: territory || undefined,
        custom_date: date || undefined,
        custom_building__location: buildingLocation || undefined,
        custom_lead_type: leadType || undefined,
        custom_request_type: requestType || undefined,
        custom_service_type: serviceType || undefined,
        custom_associate_details: associateDetails || undefined,
        // Contact
        email_id: email || undefined,
        mobile_no: mobile || undefined,
        website: website || undefined,
      };
      const res = await createLead(payload);
      if (!res) throw new Error('Failed to create lead');
      onCreated?.();
    } catch (e: any) {
      Alert.alert('Lead', e?.message || 'Unable to create lead');
    } finally {
      setSaving(false);
    }
  }

  // Debounced suggestion loaders from ERP
  React.useEffect(() => { const t = setTimeout(async () => setSugSource(await searchDocNames('Lead Source', source, 10)), 200); return () => clearTimeout(t); }, [source]);
  React.useEffect(() => { const t = setTimeout(async () => setSugOwner(await searchDocNames('User', leadOwner, 10)), 200); return () => clearTimeout(t); }, [leadOwner]);
  React.useEffect(() => { const t = setTimeout(async () => setSugTerritory(await searchDocNames('Territory', territory, 10)), 200); return () => clearTimeout(t); }, [territory]);
  React.useEffect(() => { const t = setTimeout(async () => setSugLeadType(await searchDocNames('Lead Type', leadType, 10)), 200); return () => clearTimeout(t); }, [leadType]);
  React.useEffect(() => { const t = setTimeout(async () => setSugRequestType(await searchDocNames('Request Type', requestType, 10)), 200); return () => clearTimeout(t); }, [requestType]);
  React.useEffect(() => { const t = setTimeout(async () => setServiceTypeSuggestions(await searchDocNames('Service Type', serviceType, 10)), 200); return () => clearTimeout(t); }, [serviceType]);
  
  React.useEffect(() => {
    const t = setTimeout(async () => {
      const found = await listBuildingLocations(buildingLocation, 10);
      setSugBuildingLocation(found);
    }, 200);
    return () => clearTimeout(t);
  }, [buildingLocation]);

  // Load status options from ERP DocField on mount
  React.useEffect(() => {
    (async () => {
      try { const opts = await fetchLeadStatusOptions(); if (Array.isArray(opts) && opts.length > 0) setStatusOptions(opts); } catch {}
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <AppHeader title="New Lead" onLeftPress={onCancel} leftInitial="←" bgColor="#0b0b1b" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}>
          <Text style={styles.section}>General</Text>
          <TextField
            label="Date"
            placeholder="YYYY-MM-DD"
            value={date}
            onPress={() => setShowDate(true)}
            leftIcon="calendar-outline"
          />
          {showDate && (
            <DateTimePicker
              value={dateObj || new Date()}
              mode="date"
              display="default"
              onChange={(event, selected) => {
                if (Platform.OS !== 'ios') setShowDate(false);
                if (selected) {
                  setDateObj(selected);
                  setDate(toISODate(selected));
                }
              }}
            />
          )}
          <View style={{ height: spacing.md }} />
          <TextField label="Lead Name" placeholder="Lead name" value={leadName} onChangeText={setLeadName} leftIcon="person-outline" />
          <View style={{ height: spacing.md }} />
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.toggleRow}>
            {(['Male','Female','Other'] as const).map(opt => {
              const active = gender === opt;
              return (
                <Pressable key={opt} onPress={() => setGender(opt)} style={[styles.toggleBtn, active && styles.toggleBtnActive]} accessibilityRole="button" accessibilityLabel={`Set gender ${opt}`}>
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: spacing.md }} />
          <TextField
            label="Building & Location"
            placeholder="Building / Location"
            value={buildingLocation}
            onChangeText={(t) => { setBuildingLocation(t); setActiveDropdown('building'); }}
            onFocus={() => setActiveDropdown('building')}
            onTouchStart={() => { if (activeDropdown === 'building') setActiveDropdown(null); }}
            leftIcon="business-outline"
          />
          {activeDropdown === 'building' && sugBuildingLocation.length > 0 && (
            <View style={styles.suggestBox}>
              {sugBuildingLocation.map((s) => (
                <Pressable key={`bl-${s}`} onPress={() => { setBuildingLocation(s); setSugBuildingLocation([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField
            label="Source"
            placeholder="Source"
            value={source}
            onChangeText={(t) => { setSource(t); setActiveDropdown('source'); }}
            onFocus={() => setActiveDropdown('source')}
            onTouchStart={() => { if (activeDropdown === 'source') setActiveDropdown(null); }}
            leftIcon="megaphone-outline"
          />
          {activeDropdown === 'source' && sugSource.length > 0 && (
            <View style={styles.suggestBox}>
              {sugSource.map((s) => (
                <Pressable key={`src-${s}`} onPress={() => { setSource(s); setSugSource([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField
            label="Lead Owner"
            placeholder="Owner"
            value={leadOwner}
            onChangeText={(t) => { setLeadOwner(t); setActiveDropdown('owner'); }}
            onFocus={() => setActiveDropdown('owner')}
            onTouchStart={() => { if (activeDropdown === 'owner') setActiveDropdown(null); }}
            leftIcon="person-circle-outline"
          />
          {activeDropdown === 'owner' && sugOwner.length > 0 && (
            <View style={styles.suggestBox}>
              {sugOwner.map((s) => (
                <Pressable key={`own-${s}`} onPress={() => { setLeadOwner(s); setSugOwner([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField
            label="Status"
            placeholder="Select status"
            value={status}
            onChangeText={(t) => { setStatus(t); setActiveDropdown('status'); }}
            onFocus={() => setActiveDropdown('status')}
            onTouchStart={() => { if (activeDropdown === 'status') setActiveDropdown(null); }}
            leftIcon="flag-outline"
          />
          {activeDropdown === 'status' && (
            <View style={styles.suggestBox}>
              {statusOptions
                .filter((s) => (status ? s.toLowerCase().includes(status.toLowerCase()) : true))
                .map((s) => (
                  <Pressable key={`stt-${s}`} onPress={() => { setStatus(s); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
                ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField
            label="Lead Type"
            placeholder="Type"
            value={leadType}
            onChangeText={(t) => { setLeadType(t); setActiveDropdown('leadType'); }}
            onFocus={() => setActiveDropdown('leadType')}
            onTouchStart={() => { if (activeDropdown === 'leadType') setActiveDropdown(null); }}
            leftIcon="list-outline"
          />
          {activeDropdown === 'leadType' && sugLeadType.length > 0 && (
            <View style={styles.suggestBox}>
              {sugLeadType.map((s) => (
                <Pressable key={`lt-${s}`} onPress={() => { setLeadType(s); setSugLeadType([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField
            label="Request Type"
            placeholder="Request type"
            value={requestType}
            onChangeText={(t) => { setRequestType(t); setActiveDropdown('requestType'); }}
            onFocus={() => setActiveDropdown('requestType')}
            onTouchStart={() => { if (activeDropdown === 'requestType') setActiveDropdown(null); }}
            leftIcon="reader-outline"
          />
          {activeDropdown === 'requestType' && sugRequestType.length > 0 && (
            <View style={styles.suggestBox}>
              {sugRequestType.map((s) => (
                <Pressable key={`rt-${s}`} onPress={() => { setRequestType(s); setSugRequestType([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField
            label="Service Type"
            placeholder="Service type"
            value={serviceType}
            onChangeText={(t) => { setServiceType(t); setActiveDropdown('serviceType'); }}
            onFocus={() => setActiveDropdown('serviceType')}
            onTouchStart={() => { if (activeDropdown === 'serviceType') setActiveDropdown(null); }}
            leftIcon="construct-outline"
          />
          {activeDropdown === 'serviceType' && serviceTypeSuggestions.length > 0 && (
            <View style={styles.suggestBox}>
              {serviceTypeSuggestions.map((s) => (
                <Pressable key={`st-${s}`} onPress={() => { setServiceType(s); setServiceTypeSuggestions([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}
          <View style={{ height: spacing.md }} />
          <TextField label="Associate Details" placeholder="Associate details" value={associateDetails} onChangeText={setAssociateDetails} leftIcon="people-outline" />

          <Text style={[styles.section, { marginTop: spacing.lg }]}>Contact Information</Text>
          <TextField label="Email" placeholder="email@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} leftIcon="mail-outline" />
          <View style={{ height: spacing.md }} />
          <TextField label="Mobile Number" placeholder="Mobile" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} leftIcon="call-outline" />
          <View style={{ height: spacing.md }} />
          <TextField label="Website" placeholder="example.com" value={website} onChangeText={setWebsite} leftIcon="globe-outline" />
          <View style={{ height: spacing.md }} />
          <TextField
            label="Territory"
            placeholder="Territory"
            value={territory}
            onChangeText={(t) => { setTerritory(t); setActiveDropdown('territory'); }}
            onFocus={() => setActiveDropdown('territory')}
            onTouchStart={() => { if (activeDropdown === 'territory') setActiveDropdown(null); }}
            leftIcon="location-outline"
          />
          {activeDropdown === 'territory' && sugTerritory.length > 0 && (
            <View style={styles.suggestBox}>
              {sugTerritory.map((s) => (
                <Pressable key={`ter-${s}`} onPress={() => { setTerritory(s); setSugTerritory([]); setActiveDropdown(null); }} style={styles.suggestItem}><Text style={styles.suggestText}>{s}</Text></Pressable>
              ))}
            </View>
          )}

          <Button title={saving ? 'Creating...' : 'Create Lead'} onPress={onSubmit} loading={saving} />
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: '#111827', fontWeight: '700', marginBottom: spacing.md },
  fieldLabel: { color: '#6b7280', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', marginRight: 8 },
  toggleBtnActive: { backgroundColor: '#0b0b1b', borderColor: '#0b0b1b' },
  toggleText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  toggleTextActive: { color: '#fff' },
    suggestBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  suggestItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  suggestText: { color: '#111827' },
});



