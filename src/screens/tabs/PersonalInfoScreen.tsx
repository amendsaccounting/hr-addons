import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Image, TextInput, Alert, Platform, Linking, PermissionsAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';
import MapView, { Marker } from 'react-native-maps';

(Ionicons as any)?.loadFont?.();

export default function PersonalInfoScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: 'Alex Doe',
    position: 'Senior Product Manager',
    employeeId: '123456',
    role: 'Product Management',
    department: 'Technology',
    location: 'New York Office',
    joinDate: 'Jan 15, 2022',
    email: 'alex.doe@example.com',
    phone: '(123) 456-7890',
  });

  const onPickImage = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
      if (res?.assets && res.assets[0]?.uri) {
        setAvatar(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Photo', 'Could not open gallery');
    }
  };

  const safeOpen = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Open', 'No compatible app installed');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Open', 'Unable to open');
    }
  };
  const onCall = () => { if (form.phone) safeOpen(`tel:${form.phone}`); };
  const onEmail = () => { if (form.email) safeOpen(`mailto:${form.email}`); };

  const HEADER_ROW_HEIGHT = 48;
  const headerTopPad = insets.top + 8;
  const headerTotalHeight = headerTopPad + HEADER_ROW_HEIGHT;
  const DEFAULT_REGION = { latitude: 25.2048, longitude: 55.2708, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  // Live location tracking state
  const [tracking, setTracking] = useState(false);
  const [lastLat, setLastLat] = useState<number | null>(null);
  const [lastLon, setLastLon] = useState<number | null>(null);
  const [lastTs, setLastTs] = useState<number | null>(null);
  const [lastAddress, setLastAddress] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }>(DEFAULT_REGION);

  // Using direct imports for MapView/Marker

  useEffect(() => {
    if (lastLat != null && lastLon != null) {
      setMapRegion(prev => ({ ...prev, latitude: lastLat, longitude: lastLon, latitudeDelta: 0.01, longitudeDelta: 0.01 }));
    }
  }, [lastLat, lastLon]);

  // Removed external map opening per request; keep map embedded

  const zoom = (factor: number) => {
    if (!mapRegion) return;
    const minDelta = 0.002;
    const maxDelta = 1;
    const nextLatDelta = Math.min(maxDelta, Math.max(minDelta, mapRegion.latitudeDelta * factor));
    const nextLonDelta = Math.min(maxDelta, Math.max(minDelta, mapRegion.longitudeDelta * factor));
    setMapRegion({ ...mapRegion, latitudeDelta: nextLatDelta, longitudeDelta: nextLonDelta });
  };

  const getStaticMapUrl = (lat: number, lon: number): string | null => {
    if (!isFinite(lat) || !isFinite(lon)) return null;
    const GOOGLE_KEY = (Config as any)?.GOOGLE_MAPS_API_KEY || (Config as any)?.GOOGLE_API_KEY;
    if (GOOGLE_KEY) {
      const center = `${lat},${lon}`;
      const marker = `color:red|${lat},${lon}`;
      return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=15&size=640x320&scale=2&maptype=roadmap&markers=${encodeURIComponent(marker)}&key=${GOOGLE_KEY}`;
    }
    // Fallback to OpenStreetMap static service
    // Docs: https://staticmap.openstreetmap.de/
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=15&size=640x320&markers=${lat},${lon},red-pushpin`;
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    const GOOGLE_KEY = (Config as any)?.GOOGLE_MAPS_API_KEY || (Config as any)?.GOOGLE_API_KEY;
    try {
      if (GOOGLE_KEY) {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}&language=en`;
        const gRes = await fetch(gUrl);
        const gj = await gRes.json().catch(() => null as any);
        const formatted = gj?.results?.[0]?.formatted_address;
        if (formatted) return formatted as string;
      }
    } catch {}
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

  const ensureLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const status = await (Geolocation as any).requestAuthorization?.('whenInUse');
        return status === 'granted' || status === true;
      }
    } catch {
      return false;
    }
  };

  const startTracking = async () => {
    const ok = await ensureLocationPermission();
    if (!ok) {
      Alert.alert('Permission Required', 'Please allow location access to enable live tracking.');
      return;
    }
    if (watchIdRef.current != null) return; // already tracking
    const id = Geolocation.watchPosition(
      pos => {
        setLastLat(pos.coords.latitude);
        setLastLon(pos.coords.longitude);
        setLastTs(Date.now());
        // Resolve address in background
        reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          .then(addr => setLastAddress(addr))
          .catch(() => setLastAddress(null));
      },
      err => {
        console.warn('watchPosition error', err);
      },
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000, fastestInterval: 3000, showsBackgroundLocationIndicator: false }
    ) as unknown as number;
    watchIdRef.current = id;
    setTracking(true);

    // Seed with an immediate fix so the map appears quickly
    Geolocation.getCurrentPosition(
      pos => {
        setLastLat(pos.coords.latitude);
        setLastLon(pos.coords.longitude);
        setLastTs(Date.now());
        reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          .then(addr => setLastAddress(addr))
          .catch(() => setLastAddress(null));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current as any);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (watchIdRef.current != null) {
        Geolocation.clearWatch(watchIdRef.current as any);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Auto-start live tracking when the screen mounts
  useEffect(() => {
    startTracking();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b1b" />
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: headerTopPad, height: headerTotalHeight }]}>
        <View style={styles.barRow}>
          <Pressable onPress={onBack} style={styles.navBtn} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>Employee Profile</Text>
          <View style={styles.navBtn} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerTotalHeight, paddingBottom: insets.bottom + 20 }]}>
        {/* Profile header card */}
        <View style={styles.profileHeaderCard}>
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={() => { setEditing(true); onPickImage(); }} accessibilityRole="button">
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarXL} />
              ) : (
                <View style={[styles.avatarXL, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={40} color="#9ca3af" />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            </Pressable>
          </View>
          <Text style={styles.name}>{form.name}</Text>
          <Text style={styles.sub}>{form.position}</Text>
          <Text style={styles.muted}>Employee ID: {form.employeeId}</Text>
        </View>

        {/* Job information */}
        <Text style={styles.sectionTitle}>Job Information</Text>
        <View style={styles.infoCard}>
          <PlainRow label="Role" value={form.role} />
          <PlainRow label="Department" value={form.department} />
          <PlainRow label="Work Location" value={form.location} />
          <PlainRow label="Date of Joining" value={form.joinDate} last />
        </View>

        {/* Contact information */}
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <PlainRow label="Email" value={form.email} onPress={onEmail} />
          <PlainRow label="Phone" value={form.phone} onPress={onCall} last />
        </View>

        {/* Live location */}
        <View style={styles.inlineCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.inlineLabel}>Live Location:</Text>
            <View style={[styles.statusDot, { backgroundColor: tracking ? '#22c55e' : '#9ca3af' }]} />
            <Text style={[styles.inlineValue, { color: tracking ? '#16a34a' : '#6b7280' }]}>{tracking ? 'Active' : 'Paused'}</Text>
          </View>
          {tracking ? (
            <Pressable onPress={stopTracking} style={styles.inlineBtn} accessibilityRole="button">
              <Ionicons name="pause" size={14} color="#111827" />
              <Text style={styles.inlineBtnText}>Pause</Text>
            </Pressable>
          ) : (
            <Pressable onPress={startTracking} style={styles.inlineBtn} accessibilityRole="button">
              <Ionicons name="play" size={14} color="#111827" />
              <Text style={styles.inlineBtnText}>Start</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>Location is shared during work hours only.</Text>
        </View>

        {/* Live Map */}
        <View style={styles.mapCard}>
          <View style={styles.mapPreview}>
            <MapView
              style={styles.mapLive}
              showsUserLocation
              followsUserLocation
              showsCompass
              toolbarEnabled
              zoomEnabled
              initialRegion={mapRegion}
              region={mapRegion}
              onMapReady={() => setMapReady(true)}
              onRegionChangeComplete={(r: any) => setMapRegion(r)}
            >
              {lastLat != null && lastLon != null && (
                <Marker coordinate={{ latitude: lastLat, longitude: lastLon }} />
              )}
            </MapView>
            <View style={styles.zoomWrap} pointerEvents="box-none">
              <Pressable onPress={() => zoom(0.7)} style={styles.zoomBtn} accessibilityRole="button">
                <Text style={styles.zoomText}>+</Text>
              </Pressable>
              <Pressable onPress={() => zoom(1/0.7)} style={styles.zoomBtn} accessibilityRole="button">
                <Text style={styles.zoomText}>-</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.coordsText}>
            {lastAddress ? lastAddress : (lastLat && lastLon ? 'Resolving address…' : 'No location yet')}
          </Text>
          {!!lastTs && (
            <Text style={styles.coordsSub}>Updated {new Date(lastTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          )}
        </View>

        {/* Help */}
        <Pressable style={styles.helpCard} accessibilityRole="button">
          <Ionicons name="help-circle-outline" size={18} color="#111827" />
          <Text style={styles.helpText}>Help</Text>
        </Pressable>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function PlainRow({ label, value, last, onPress }: { label: string; value: string; last?: boolean; onPress?: () => void }) {
  const RowComp = onPress ? Pressable : View;
  return (
    <RowComp style={[styles.plainRow, !last && styles.rowDivider]} {...(onPress ? { onPress } : {})}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </RowComp>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  // Top bar
  topBar: { backgroundColor: '#0b0b1b', paddingHorizontal: 12, paddingBottom: 0, borderBottomWidth: 0, borderColor: '#0b0b1b', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  barRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#ffffff', fontWeight: '600' },

  content: { padding: 12 },

  // Profile header card
  profileHeaderCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', marginBottom: 12 },
  avatarXL: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f1f5f9' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', right: -2, bottom: -2, backgroundColor: '#2563eb', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { marginTop: 8, color: '#111827', fontWeight: '700' },
  sub: { color: '#4b5563', marginTop: 2 },
  muted: { color: '#9ca3af', marginTop: 2, fontSize: 12 },

  // Section title
  sectionTitle: { color: '#111827', fontWeight: '700', marginTop: 8, marginBottom: 8 },

  // Info card
  infoCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  plainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: 1, borderColor: '#eef2f7' },
  rowLabel: { color: '#6b7280', width: '45%' },
  rowValue: { color: '#111827', fontWeight: '600', width: '55%', textAlign: 'right' },

  // Inline status card
  inlineCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  inlineLabel: { color: '#6b7280' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginLeft: 8, marginRight: 8 },
  inlineValue: { color: '#16a34a', fontWeight: '600' },
  inlineBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#eef2f7', flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  inlineBtnText: { color: '#111827', fontWeight: '600' },

  noteCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  noteText: { color: '#9ca3af', fontSize: 12 },

  // Map
  mapCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 10, marginBottom: 14 },
  mapPreview: { height: 160, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mapImage: { width: '100%', height: '100%' },
  mapLive: { width: '100%', height: '100%' },
  mapLiveOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  zoomWrap: { position: 'absolute', right: 8, bottom: 8, alignItems: 'center' },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  zoomText: { color: '#111827', fontWeight: '700', fontSize: 16, lineHeight: 16 },
  coordsText: { marginTop: 8, color: '#111827', fontWeight: '600' },
  coordsSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },

  // Help + Logout
  helpCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  helpText: { color: '#111827', fontWeight: '600', marginLeft: 6 },
  logoutBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: '#fff', fontWeight: '700', marginLeft: 6 },

  // Text / inputs (kept for possible reuse)
  smallLabel: { color: '#6b7280', fontSize: 12 },
  fieldValue: { color: '#111827', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8, color: '#111827', backgroundColor: '#fff' },
});
