import * as React from 'react';
import { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Platform, PermissionsAndroid, Alert, AppState } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import { useNavigation } from '@react-navigation/native';
import TimesheetListScreen from './TimesheetListScreen';
import TimesheetDetailScreen from './TimesheetDetailScreen';
import { getUserLocation } from '../../utils/location';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [tsOpen, setTsOpen] = useState(false);
  const tsAnim = useRef(new Animated.Value(0)).current;
  const [tsSelected, setTsSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  let LinearGradientComp: any = null;
  try { LinearGradientComp = require('react-native-linear-gradient').default; } catch {}
  const AsyncStorage = useRef<any>(null);
  try { AsyncStorage.current = require('@react-native-async-storage/async-storage').default; } catch {}

  const openSheet = useCallback(() => {
    setSheetOpen(true);
    requestAnimationFrame(() => {
      Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  }, [anim]);
  const closeSheet = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSheetOpen(false);
    });
  }, [anim]);

  const openTimesheets = useCallback(() => {
    setTsOpen(true);
    requestAnimationFrame(() => {
      Animated.timing(tsAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  }, [tsAnim]);
  const closeTimesheets = useCallback(() => {
    Animated.timing(tsAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) { setTsOpen(false); setTsSelected(null); }
    });
  }, [tsAnim]);

  const now = useMemo(() => new Date(), [sheetOpen]);
  const timeLabel = toTimeLabel(now);
  const dateLabel = toDateLabel(now);
  const greet = getGreeting(now);

  const [locText, setLocText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Geolocation logic migrated to react-native-location in utils/location.ts

  return (
    <View style={styles.screen}>
      {/* Greeting card */}
      <View style={styles.cardWrap}>
        {LinearGradientComp ? (
          <LinearGradientComp colors={["#ffffff", "#f8fafc"]} style={styles.card}>
            <Text style={styles.eyebrow}>{greet}</Text>
            <Text style={styles.hey}>Hey, Nijin Joy 👋</Text>
            <Text style={styles.sub}>Last check-out was at 08:54 pm on 30 Nov</Text>
            <Pressable style={{ marginTop: 6 }}>
              <Text style={styles.link}>View List</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => {
              // Only open the sheet. We fetch location on Confirm.
              openSheet();
            }} accessibilityRole="button">
              <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Check In</Text>
            </Pressable>
          </LinearGradientComp>
        ) : (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{greet}</Text>
            <Text style={styles.hey}>Hey, Nijin Joy 👋</Text>
            <Text style={styles.sub}>Last check-out was at 08:54 pm on 30 Nov</Text>
            <Pressable style={{ marginTop: 6 }}>
              <Text style={styles.link}>View List</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={openSheet} accessibilityRole="button">
              <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Check In</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.quickTitle}>Quick Links</Text>
      <View style={styles.tiles}>
        <ActionTile icon="person-outline" label="Request Attendance" />
        <ActionTile icon="calendar-outline" label="Request a Shift" />
        <ActionTile icon="document-text-outline" label="Request Leave" />
        <ActionTile icon="cash-outline" label="Claim an Expense" />
        <ActionTile icon="file-tray-stacked-outline" label="Submit Timesheet" onPress={openTimesheets} />
        <ActionTile icon="newspaper-outline" label="View Salary Slips" />
      </View>

      {sheetOpen && (
        <HomeCheckinSheet
          anim={anim}
          timeLabel={timeLabel}
          dateLabel={dateLabel}
          locationNote={locText}
          onConfirm={async () => {
            try {
              console.log('[checkin] confirm pressed');
              // Log platform and existing permission status attempt
              try { console.log('[checkin] platform', Platform.OS); } catch {}
              // Ensure permission and get coordinates on demand (safe wrapper)
              const pos = await getUserLocation();
              const currentCoords = pos?.coords && typeof pos.coords.latitude === 'number' && typeof pos.coords.longitude === 'number'
                ? { lat: pos.coords.latitude, lon: pos.coords.longitude }
                : null;
              try { console.log('[checkin] getUserLocation →', pos); } catch {}
              if (!currentCoords) { safeAlert('Permission needed', locText || 'Please allow location to check in.'); return; }

              // Resolve employee ID
              let employeeId = (await AsyncStorage.current?.getItem?.('employeeId')) || '';
              if (!employeeId) {
                const email = await AsyncStorage.current?.getItem?.('userEmail');
                try { console.log('[checkin] resolving employeeId via email', email); } catch {}
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
                      await AsyncStorage.current?.setItem?.('employeeId', employeeId);
                    }
                    try { console.log('[checkin] resolved employeeId', employeeId); } catch {}
                  } catch (e) { try { console.log('[checkin] resolve employeeId error', e); } catch {} }
                }
              }
              if (!employeeId) { safeAlert('Not ready', 'Employee ID not found.'); return; }
              const { clockIn } = require('../../services/attendance');
              const locationLabel = `${currentCoords.lat.toFixed(5)}, ${currentCoords.lon.toFixed(5)}`;
              console.log('[checkin] clockIn request', { employeeId, locationLabel, latitude: currentCoords.lat, longitude: currentCoords.lon });
              const result = await clockIn({ employee: employeeId, location: locationLabel, latitude: currentCoords.lat, longitude: currentCoords.lon });
              console.log('[checkin] clockIn result', result);
              safeAlert('Checked In', 'Your check-in has been recorded.');
              closeSheet();
            } catch (e: any) {
              const msg = e?.message ? String(e.message) : 'Could not complete check-in.';
              safeAlert('Failed', msg);
              console.log('[checkin] error', e);
            }
          }}
          onClose={closeSheet}
        />
      )}
      {tsOpen && (
        <TimesheetOverlay anim={tsAnim} selected={!!tsSelected} onClose={closeTimesheets}>
          {tsSelected ? (
            <TimesheetDetailScreen name={tsSelected} />
          ) : (
            <TimesheetListScreen onSelect={(name) => setTsSelected(name)} />
          )}
        </TimesheetOverlay>
      )}
    </View>
  );
}

function ActionTile({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button" onPress={onPress}>
      <View style={styles.tileIconWrap}>
        <Ionicons name={icon as any} size={18} color="#111827" />
      </View>
      <Text style={styles.tileText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.tileChevron} />
    </Pressable>
  );
}

function HomeCheckinSheet({ anim, timeLabel, dateLabel, locationNote, onConfirm, onClose }: { anim: Animated.Value; timeLabel: string; dateLabel: string; locationNote?: string; onConfirm: () => void; onClose: () => void }) {
  const { height } = Dimensions.get('window');
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });
  return (
    <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
      </Pressable>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }] }>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTime}>{timeLabel}</Text>
        <Text style={styles.sheetDate}>{dateLabel}</Text>
        {locationNote ? (
          <Text style={styles.locError}>{locationNote}</Text>
        ) : (
          <Text style={styles.locError}>We’ll use your current location for this check-in.</Text>
        )}

        {/* Map placeholder */}
        <View style={styles.mapBox}>
          <Ionicons name="location" size={24} color="#ef4444" />
        </View>

        <Pressable style={[styles.confirmBtn]} accessibilityRole="button" onPress={onConfirm}>
          <Text style={styles.confirmText}>Confirm Check In</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function TimesheetOverlay({ anim, selected, onClose, children }: { anim: Animated.Value; selected: boolean; onClose: () => void; children: React.ReactNode }) {
  const { height } = Dimensions.get('window');
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });
  return (
    <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}> 
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
      </Pressable>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, transform: [{ translateY }] }}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' }}>
            <Pressable onPress={onClose} accessibilityRole="button" style={{ padding: 8, marginRight: 4 }}>
              <Ionicons name={selected ? 'close' : 'chevron-down'} size={20} color="#111827" />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{selected ? 'Timesheet Details' : 'Timesheets'}</Text>
          </View>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function toTimeLabel(d: Date): string {
  try {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
}
function toDateLabel(d: Date): string {
  try {
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}, ${d.getFullYear()}`;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },

  // Greeting card
  cardWrap: { marginHorizontal: 12, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  eyebrow: { color: '#6b7280', fontSize: 12, marginBottom: 2 },
  hey: { color: '#111827', fontWeight: '700', fontSize: 18 },
  sub: { color: '#6b7280', marginTop: 6 },
  link: { color: '#0b6dff', marginTop: 4, fontWeight: '600' },
  primaryBtn: { marginTop: 14, backgroundColor: '#111827', borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  // Quick links
  quickTitle: { marginTop: 14, marginBottom: 8, color: '#111827', fontWeight: '700', marginHorizontal: 12 },
  tiles: { marginHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 14, paddingHorizontal: 12, marginBottom: 10 },
  tileIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileText: { color: '#111827', fontWeight: '600', paddingRight: 16 },
  tileChevron: { position: 'absolute', right: 10, top: 14 },

  // Sheet
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetHandle: { alignSelf: 'center', width: 48, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 8 },
  sheetTime: { alignSelf: 'center', fontWeight: '700', color: '#111827', fontSize: 20 },
  sheetDate: { alignSelf: 'center', color: '#6b7280', marginTop: 2, marginBottom: 12 },
  locError: { color: '#6b7280', marginBottom: 12 },
  mapBox: { height: 160, backgroundColor: '#cfe8ff', borderRadius: 8, borderWidth: 1, borderColor: '#bcd7f3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmBtn: { backgroundColor: '#111827', borderRadius: 10, height: 50, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#f3f4f6', borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },
});

function getGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
  const safeAlert = useCallback((title: string, message: string) => {
    try {
      if (AppState.currentState === 'active') {
        Alert.alert(title, message);
      } else {
        setTimeout(() => { try { if (AppState.currentState === 'active') Alert.alert(title, message); } catch {} }, 300);
      }
    } catch (e) { try { console.log('[checkin] alert error', e); } catch {} }
  }, []);
