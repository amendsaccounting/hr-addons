import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, StatusBar, ActivityIndicator, Platform, PermissionsAndroid, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import Geolocation from 'react-native-geolocation-service';

const HEADER_BG = '#0b0b1b';

type Props = {
  onCancel?: () => void;
  onCreated?: () => void;
};

export default function LeadCreateScreen({ onCancel, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
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
  const setField = (k: string) => (v: string) => setForm((p) => ({ ...p, [k]: v }));
  const [locLoading, setLocLoading] = useState(false);

  const ensureLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        const coarse = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        return fine === PermissionsAndroid.RESULTS.GRANTED || coarse === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const status = await (Geolocation as any).requestAuthorization?.('whenInUse');
        return status === 'granted';
      }
    } catch {
      return false;
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const nUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`;
      const nRes = await fetch(nUrl, { headers: { 'User-Agent': 'hr_addons/1.0 (reverse-geocode)', 'Accept-Language': 'en' } as any });
      const nj = await nRes.json().catch(() => null as any);
      const display = nj?.display_name as string | undefined;
      if (display && display.length > 0) return display;
      const a = nj?.address || {};
      const parts = [a.name, a.road, a.suburb, a.city || a.town || a.village, a.state, a.country].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    } catch {}
    return `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
  };

  const handleUseCurrentLocation = async () => {
    const ok = await ensureLocationPermission();
    if (!ok) {
      Alert.alert('Permission Required', 'Location permission is not granted.');
      return;
    }
    if (!Geolocation || typeof (Geolocation as any).getCurrentPosition !== 'function') {
      Alert.alert('Location', 'Geolocation is not available on this device.');
      return;
    }
    setLocLoading(true);
    try {
      Geolocation.getCurrentPosition(
        async pos => {
          const { latitude, longitude } = pos.coords;
          // set coordinates immediately
          setField('location')(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
          // then try to reverse-geocode (non-fatal)
          try {
            const addr = await reverseGeocode(latitude, longitude);
            setField('location')(addr);
          } catch {}
          setLocLoading(false);
        },
        err => {
          try { console.warn('Geolocation error', err); } catch {}
          setLocLoading(false);
          Alert.alert('Location', 'Unable to fetch current location.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000, forceRequestLocation: true, showLocationDialog: true, forceLocationManager: true } as any
      );
    } catch (e) {
      setLocLoading(false);
      Alert.alert('Location', 'Location request failed.');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />

      {/* Simple Header */}
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
          <TextInput
            value={form.date}
            onChangeText={setField('date')}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            keyboardType={Platform.select({ ios: 'numbers-and-punctuation', android: 'number-pad', default: 'default' }) as any}
          />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Lead Owner</Text>
          <TextInput value={form.lead_owner} onChangeText={setField('lead_owner')} placeholder="Lead Owner" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Gender</Text>
          <TextInput value={form.gender} onChangeText={setField('gender')} placeholder="Gender" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Status</Text>
          <TextInput value={form.status} onChangeText={setField('status')} placeholder="Status" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Source</Text>
          <TextInput value={form.source} onChangeText={setField('source')} placeholder="Source" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Lead Type</Text>
          <TextInput value={form.lead_type} onChangeText={setField('lead_type')} placeholder="Lead Type" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput value={form.full_name} onChangeText={setField('full_name')} placeholder="Full Name" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Associate Details</Text>
          <TextInput value={form.associate_details} onChangeText={setField('associate_details')} placeholder="Associate Details" placeholderTextColor="#9CA3AF" style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} multiline />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Request Type</Text>
          <TextInput value={form.request_type} onChangeText={setField('request_type')} placeholder="Request Type" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Building & Location</Text>
          <View style={styles.inputWrapper}>
            <TextInput value={form.location} onChangeText={setField('location')} placeholder="Building & Location" placeholderTextColor="#9CA3AF" style={[styles.input, styles.inputWithIcon]} />
            <Pressable style={styles.fieldIconBtn} onPress={handleUseCurrentLocation} accessibilityRole="button" accessibilityLabel="Use current location" disabled={locLoading}>
              {locLoading ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Ionicons name="locate-outline" size={18} color="#6B7280" />
              )}
            </Pressable>
          </View>
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Service Type</Text>
          <TextInput value={form.service_type} onChangeText={setField('service_type')} placeholder="Service Type" placeholderTextColor="#9CA3AF" style={styles.input} />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput value={form.email_id} onChangeText={setField('email_id')} placeholder="Email" placeholderTextColor="#9CA3AF" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <TextInput value={form.mobile_no} onChangeText={setField('mobile_no')} placeholder="Mobile Number" placeholderTextColor="#9CA3AF" style={styles.input} keyboardType="phone-pad" />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Website</Text>
          <TextInput value={form.website} onChangeText={setField('website')} placeholder="Website" placeholderTextColor="#9CA3AF" style={styles.input} autoCapitalize="none" />
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Territory</Text>
          <TextInput value={form.territory} onChangeText={setField('territory')} placeholder="Territory" placeholderTextColor="#9CA3AF" style={styles.input} />
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable style={styles.bottomBtnGhost} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.bottomBtnGhostText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.bottomBtnPrimary} onPress={onCreated} accessibilityRole="button">
          <Text style={styles.bottomBtnPrimaryText}>Save</Text>
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
  divider: { height: 1, backgroundColor: '#EFF2F5', marginVertical: 8 },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', paddingTop: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between' },
  bottomBtnPrimary: { backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  bottomBtnPrimaryText: { color: '#ffffff', fontWeight: '700' },
  bottomBtnGhost: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  bottomBtnGhostText: { color: '#111827', fontWeight: '700' },
});
