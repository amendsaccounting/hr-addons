import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import axios from 'axios';

type HistoryItem = {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  locationIn: string;
  locationOut: string;
};

type FetchedLocation = {
  address: string;
  latitude: number;
  longitude: number;
};

const AttendanceScreen = () => {
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [locationText, setLocationText] = useState('Location not fetched');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [lastClockInTime, setLastClockInTime] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const STORAGE_IS_IN = 'attendance:isClockedIn';
  const STORAGE_LAST_IN_TIME = 'attendance:lastClockInTime';
  const STORAGE_DEVICE_ID = 'attendance:deviceId';

  const persistState = async (inState: boolean, inTime: string | null) => {
    try {
      const ops: [string, string][] = [
        [STORAGE_IS_IN, inState ? '1' : '0'],
        [STORAGE_LAST_IN_TIME, inTime || ''],
      ];
      await AsyncStorage.multiSet(ops);
    } catch {}
  };

  const loadPersistedState = async () => {
    try {
      const rows = await AsyncStorage.multiGet([STORAGE_IS_IN, STORAGE_LAST_IN_TIME]);
      const isInRaw = rows.find(r => r[0] === STORAGE_IS_IN)?.[1] || '0';
      const lastIn = rows.find(r => r[0] === STORAGE_LAST_IN_TIME)?.[1] || '';
      const isIn = isInRaw === '1';
      setIsClockedIn(isIn);
      setLastClockInTime(lastIn || null);
    } catch {}
  };

  const ensureDeviceId = async () => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_DEVICE_ID);
      if (existing && existing.length > 0) {
        setDeviceId(existing);
        return existing;
      }
      const rand = Math.random().toString(36).slice(2, 10);
      const ts = Date.now().toString(36);
      const gen = `MOB-${Platform.OS}-${ts}-${rand}`.toUpperCase();
      await AsyncStorage.setItem(STORAGE_DEVICE_ID, gen);
      setDeviceId(gen);
      return gen;
    } catch {
      const fallback = `MOB-${Platform.OS}`.toUpperCase();
      setDeviceId(fallback);
      return fallback;
    }
  };

  const ERP_BASE = useMemo(() => String((Config as any)?.ERP_URL_RESOURCE || (Config as any)?.ERP_URL || '').replace(/\/$/, ''), []);
  const ERP_KEY = (Config as any)?.ERP_APIKEY || (Config as any)?.ERP_API_KEY;
  const ERP_SECRET = (Config as any)?.ERP_SECRET || (Config as any)?.ERP_API_SECRET;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(formattedTime);
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      // Load any persisted local state immediately for faster UI
      await loadPersistedState();
      await ensureDeviceId();
      try {
        const rows = await AsyncStorage.multiGet(['employeeId', 'employeeData']);
        const id = rows.find(r => r[0] === 'employeeId')?.[1] || null;
        const rawData = rows.find(r => r[0] === 'employeeData')?.[1] || null;
        if (id) setEmployeeId(id);
        else if (rawData) {
          try { setEmployeeId(JSON.parse(rawData)?.name || null); } catch {}
        }
      } catch {}
      await loadRecentHistory();
    })();
  }, []);

  const formatTime12 = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const hh = ((h % 12) || 12).toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${mm} ${ap}`;
  };

  const loadRecentHistory = async () => {
    try {
      let id: string | null = employeeId;
      if (!id) {
        const rows = await AsyncStorage.multiGet(['employeeId', 'employeeData']);
        id = rows.find(r => r[0] === 'employeeId')?.[1] || null;
        if (!id) {
          const raw = rows.find(r => r[0] === 'employeeData')?.[1];
          if (raw) {
            try { id = JSON.parse(raw)?.name || null; } catch {}
          }
        }
      }
      if (!id || !ERP_BASE || !ERP_KEY || !ERP_SECRET) return;

      const params: any = {
        filters: JSON.stringify([["employee", "=", id]]),
        fields: JSON.stringify(["name","employee","log_type","time","location"]),
        order_by: 'time asc',
        limit_page_length: '200',
      };
      const url = `${ERP_BASE}/${encodeURIComponent('Employee Checkin')}`;
      const listRes = await axios.get(url, { params, headers: { Authorization: `token ${ERP_KEY}:${ERP_SECRET}` } });
      const rows: any[] = (listRes as any)?.data?.data || [];
      const items = rows.map(r => ({ ...r, dt: new Date(r.time) })).sort((a,b)=>a.dt.getTime()-b.dt.getTime());
      const out: HistoryItem[] = [];
      let open: any | null = null;
      for (const it of items) {
        const lt = String(it.log_type).toUpperCase();
        if (lt === 'IN') {
          if (open) {
            out.push({ id: `${open.name}-open`, date: open.dt.toLocaleDateString(), clockIn: formatTime12(open.dt), clockOut: '', locationIn: open.location || '', locationOut: '' });
          }
          open = it;
        } else if (lt === 'OUT') {
          if (open && it.dt.getTime() > open.dt.getTime()) {
            out.push({ id: `${open.name}-${it.name}` , date: it.dt.toLocaleDateString(), clockIn: formatTime12(open.dt), clockOut: formatTime12(it.dt), locationIn: open.location || '', locationOut: it.location || '' });
            open = null;
          } else {
            out.push({ id: `${it.name}`, date: it.dt.toLocaleDateString(), clockIn: '', clockOut: formatTime12(it.dt), locationIn: '', locationOut: it.location || '' });
          }
        }
      }
      if (open) {
        out.push({ id: `${open.name}-open`, date: open.dt.toLocaleDateString(), clockIn: formatTime12(open.dt), clockOut: '', locationIn: open.location || '', locationOut: '' });
      }
      const finalList = out.slice().reverse().slice(0, 10);
      setRecentHistory(finalList);
      if (out.length > 0) {
        const latest = out[out.length - 1]; // last chronological entry
        const clockedIn = !!latest.clockIn && !latest.clockOut;
        setIsClockedIn(clockedIn);
        setLastClockInTime(clockedIn ? latest.clockIn : null);
        // Persist resolved state from server
        await persistState(clockedIn, clockedIn ? latest.clockIn : null);
      } else {
        setIsClockedIn(false);
        setLastClockInTime(null);
        await persistState(false, null);
      }
    } catch (e) {
      // keep whatever is shown
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    // Try Google Geocoding if key available
    const GOOGLE_KEY = (Config as any)?.GOOGLE_MAPS_API_KEY || (Config as any)?.GOOGLE_API_KEY;
    try {
      if (GOOGLE_KEY) {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}&language=en`;
        const gRes = await fetch(gUrl);
        const gj = await gRes.json().catch(() => null as any);
        const formatted = gj?.results?.[0]?.formatted_address;
        if (formatted) return formatted as string;
      }
    } catch (e) {
      // ignore and fall back to OSM
    }
    // Fallback to OpenStreetMap Nominatim
    try {
      const nUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`;
      const nRes = await fetch(nUrl, { headers: { 'User-Agent': 'hr_addons/1.0 (reverse-geocode)', 'Accept-Language': 'en' } as any });
      const nj = await nRes.json().catch(() => null as any);
      const display = nj?.display_name as string | undefined;
      if (display && display.length > 0) return display;
      const a = nj?.address || {};
      const parts = [a.name, a.road, a.suburb, a.city || a.town || a.village, a.state, a.country].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    } catch (e) {
      // ignore
    }
    return `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
  };

  const requestLocation = async (): Promise<FetchedLocation> => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        async pos => {
          try {
            const { latitude, longitude } = pos.coords;
            const addr = await reverseGeocode(latitude, longitude);
            resolve({ address: addr, latitude, longitude });
          } catch (e) {
            const { latitude, longitude } = pos.coords;
            resolve({ address: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`, latitude, longitude });
          }
        },
        err => {
          console.warn('Geolocation error', err);
          resolve({ address: 'Location unavailable', latitude: 0, longitude: 0 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString();
    return { time, date };
  };

  const handleClock = async () => {
    if (!ERP_BASE || !ERP_KEY || !ERP_SECRET) {
      Alert.alert('Configuration', 'ERP credentials or URL are not configured.');
      return;
    }
    try {
      const employeeData = await AsyncStorage.getItem('employeeData');
      if (!employeeData && !employeeId) {
        Alert.alert('Error', 'Employee data not found. Please login again.');
        return;
      }
      const employee = employeeData ? JSON.parse(employeeData) : null;

      setLoadingLocation(true);
      const loc = await requestLocation();
      setLocationText(loc.address);

      // Enforce exact human-readable address to store in ERP's location field
      if (!loc.address || loc.address === 'Location unavailable' || /^Lat\s/i.test(loc.address)) {
        Alert.alert(
          'Address Required',
          'Unable to resolve your exact address. Please ensure internet is available and try again.'
        );
        return;
      }

      const now = new Date();
      const formattedTime = now.toISOString().slice(0, 19).replace('T', ' ');
      const empName = employeeId || employee?.name;

      const payload = {
        employee: empName,
        log_type: isClockedIn ? 'OUT' : 'IN',
        time: formattedTime,
        // As requested, store exact address in ERPNext Device ID as well
        device_id: loc.address,
        location: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
      const url = `${ERP_BASE}/${encodeURIComponent('Employee Checkin')}`;
      await axios.post(url, payload, { headers: { Authorization: `token ${ERP_KEY}:${ERP_SECRET}`, 'Content-Type': 'application/json' } });

      if (isClockedIn) {
        setIsClockedIn(false);
        setLastClockInTime(null);
        await persistState(false, null);
      } else {
        setIsClockedIn(true);
        const newIn = formatTime12(now);
        setLastClockInTime(newIn);
        await persistState(true, newIn);
      }
      await loadRecentHistory();
      Alert.alert('Success', `You have clocked ${isClockedIn ? 'out' : 'in'} successfully!`);
    } catch (error: any) {
      console.error('Employee Checkin Error:', error?.response?.data || error?.message);
      Alert.alert('Error', 'Failed to record attendance. Please try again.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const renderHistoryItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    const parseTime = (time: string) => {
      if (!time) return { hours: 0, minutes: 0 };
      if (time.includes('AM') || time.includes('PM')) {
        const [h, mPart] = time.split(':');
        const m = mPart.slice(0, 2);
        const ampm = mPart.slice(3);
        let hours = parseInt(h, 10);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return { hours, minutes: parseInt(m, 10) };
      } else {
        const [h, m] = time.split(':');
        return { hours: parseInt(h, 10), minutes: parseInt(m, 10) };
      }
    };

    const start = parseTime(item.clockIn);
    const end = parseTime(item.clockOut);
    const totalHours = item.clockOut ? ((end.hours + end.minutes / 60) - (start.hours + start.minutes / 60)).toFixed(2) : '--';

    return (
      <View style={[styles.historyItem, index === 0 && styles.currentSessionItem]}>
        <View style={styles.historyLeft}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={index === 0 ? '#fff' : '#666'} />
            <Text style={[styles.historyDate, index === 0 && styles.currentSessionText]}>{item.date}</Text>
          </View>
          <View style={styles.timeRow}>
            {!!item.clockIn && (
              <View style={styles.timeBlock}>
                <Ionicons name="enter-outline" size={14} color={index === 0 ? '#fff' : '#000'} />
                <Text style={[styles.historyTime, index === 0 && styles.currentSessionText]}>{item.clockIn}</Text>
              </View>
            )}
            {!!item.clockOut && (
              <View style={styles.timeBlock}>
                <Ionicons name="exit-outline" size={14} color={index === 0 ? '#fff' : '#000'} />
                <Text style={[styles.historyTime, index === 0 && styles.currentSessionText]}>{item.clockOut}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.historyRight}>
          <View style={[styles.hoursBadge, index === 0 && styles.currentSessionHours]}>
            <Text style={[styles.historyTotal, index === 0 && styles.currentSessionText]}>{totalHours} hrs</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={index === 0 ? '#fff' : '#666'} />
            <Text style={[styles.locationText, index === 0 && styles.currentSessionText]} numberOfLines={1}>In: {item.locationIn || '-'}</Text>
          </View>
          <View style={[styles.locationRow, { marginTop: 2 }]}>
            <Ionicons name="location-outline" size={12} color={index === 0 ? '#fff' : '#666'} />
            <Text style={[styles.locationText, index === 0 && styles.currentSessionText]} numberOfLines={1}>Out: {item.locationOut || '-'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b1b" animated />
      <View style={{ height: insets.top, backgroundColor: '#0b0b1b' }} />
      <LinearGradient
        colors={["#0b0b1b", "#161a2e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerCard, { paddingTop: 14 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeftRow}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="stopwatch-outline" size={18} color="#111827" />
            </View>
            <Text style={styles.headerTitle}>Attendance</Text>
          </View>
        </View>
        <Text style={styles.headerDate}>Track your work hours</Text>
      </LinearGradient>
      <View style={styles.wrapper}>
        <View style={styles.clockCard}>
          <Text style={styles.timeText}>{currentTime}</Text>
          <Text style={styles.dateText}>{currentDate}</Text>

          {/* Location */}
          <View style={styles.locationSection}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.locationText}>{locationText}</Text>
            {loadingLocation && <ActivityIndicator size="small" color="#666" style={styles.loadingIndicator} />}
          </View>

          {/* Clock Button */}
          <TouchableOpacity
            style={[styles.clockButton, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
            onPress={handleClock}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name={isClockedIn ? 'log-out-outline' : 'log-in-outline'} size={20} color="#fff" />
                <Text style={styles.buttonText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Status */}
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, isClockedIn ? styles.statusActive : styles.statusInactive]} />
            <Text style={styles.statusText}>{isClockedIn ? 'Currently Clocked In' : 'Ready to Clock In'}</Text>
          </View>

          {/* Clocked-in message */}
          {isClockedIn && !!lastClockInTime && (
            <Text style={styles.clockedInText}>You clocked in at {lastClockInTime}</Text>
          )}
        </View>

        {/* Recent History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent History</Text>
            <Ionicons name="time-outline" size={20} color="#666" />
          </View>
          <FlatList
            data={recentHistory}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={60} color="#ccc" />
                <Text style={styles.emptyTitle}>No attendance records</Text>
                <Text style={styles.emptySubtitle}>Your attendance history will appear here</Text>
              </View>
            }
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  wrapper: { flex: 1, padding: 16 },
  headerCard: {
    backgroundColor: '#090a1a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center' },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerDate: { color: '#cbd5e1', fontSize: 12 },
  clockCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  clockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clockTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  timeText: { fontSize: 48, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  dateText: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center', fontWeight: '500' },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingIndicator: { marginLeft: 8 },
  locationText: { fontSize: 14, color: '#666', marginLeft: 8, flex: 1, fontWeight: '500' },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clockInButton: { backgroundColor: '#000' },
  clockOutButton: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusActive: { backgroundColor: '#000' },
  statusInactive: { backgroundColor: '#999' },
  statusText: { fontSize: 14, color: '#333', fontWeight: '500' },
  clockedInText: { marginTop: 10, fontSize: 13, color: '#111827', fontWeight: '600' },
  historySection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  historyList: { flex: 1 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  currentSessionItem: { backgroundColor: '#000', borderColor: '#000' },
  historyLeft: { flex: 1 },
  historyRight: { alignItems: 'flex-end' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#333', marginLeft: 6 },
  timeRow: { flexDirection: 'row', gap: 16 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyTime: { fontSize: 14, color: '#666', fontWeight: '500' },
  hoursBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  currentSessionHours: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' },
  historyTotal: { fontSize: 14, fontWeight: '700', color: '#000' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currentSessionText: { color: '#fff' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, color: '#999', fontWeight: '600', marginTop: 12, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#ccc', textAlign: 'center' },
});

export default AttendanceScreen;
