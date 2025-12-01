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
  PermissionsAndroid,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { toErpLocalTimestamp } from '../../utils/date';
import axios from 'axios';
import { listCheckins } from '../../services/attendance';

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
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [weekTotalMinutes, setWeekTotalMinutes] = useState<number>(0);
  const [weekDailyMinutes, setWeekDailyMinutes] = useState<number[]>([0,0,0,0,0,0,0]); // Mon..Sun
  const [weekDaysWorked, setWeekDaysWorked] = useState<number>(0);
  const [weekDaysLate, setWeekDaysLate] = useState<number>(0);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [lastClockInTime, setLastClockInTime] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const STORAGE_IS_IN = 'attendance:isClockedIn';
  const STORAGE_LAST_IN_TIME = 'attendance:lastClockInTime';
  const STORAGE_DEVICE_ID = 'attendance:deviceId';
  const STORAGE_IN_LOCATION_TEXT = 'attendance:inLocationText';
  const STORAGE_IN_LOCATION_LAT = 'attendance:inLocationLat';
  const STORAGE_IN_LOCATION_LON = 'attendance:inLocationLon';

  const persistState = async (inState: boolean, inTime: string | null) => {
    try {
      const ops: [string, string][] = [
        [STORAGE_IS_IN, inState ? '1' : '0'],
        [STORAGE_LAST_IN_TIME, inTime || ''],
      ];
      await AsyncStorage.multiSet(ops);
    } catch {}
  };

  const persistInLocation = async (loc: FetchedLocation | null) => {
    try {
      if (loc) {
        await AsyncStorage.multiSet([
          [STORAGE_IN_LOCATION_TEXT, loc.address || ''],
          [STORAGE_IN_LOCATION_LAT, String(loc.latitude ?? '')],
          [STORAGE_IN_LOCATION_LON, String(loc.longitude ?? '')],
        ]);
      } else {
        await AsyncStorage.multiSet([
          [STORAGE_IN_LOCATION_TEXT, ''],
          [STORAGE_IN_LOCATION_LAT, ''],
          [STORAGE_IN_LOCATION_LON, ''],
        ]);
      }
    } catch {}
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
        return status === 'granted';
      }
    } catch {
      return false;
    }
  };

  const loadPersistedState = async () => {
    try {
      const rows = await AsyncStorage.multiGet([STORAGE_IS_IN, STORAGE_LAST_IN_TIME, STORAGE_IN_LOCATION_TEXT, STORAGE_IN_LOCATION_LAT, STORAGE_IN_LOCATION_LON]);
      const isInRaw = rows.find(r => r[0] === STORAGE_IS_IN)?.[1] || '0';
      const lastIn = rows.find(r => r[0] === STORAGE_LAST_IN_TIME)?.[1] || '';
      const isIn = isInRaw === '1';
      setIsClockedIn(isIn);
      setLastClockInTime(lastIn || null);
      if (isIn) {
        const savedLoc = rows.find(r => r[0] === STORAGE_IN_LOCATION_TEXT)?.[1] || '';
        if (savedLoc) setLocationText(savedLoc);
      }
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

  const formatDisplayDate = (d: Date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${mon} ${day}, ${year}`;
  };

  const loadRecentHistory = async () => {
    setHistoryLoading(true);
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
      if (!id) return;

      // Fetch raw checkins via shared service
      const rows = await listCheckins(id, 500);

      // Build chronological list with Date objects
      const items = rows.map(r => ({ ...r, dt: new Date(r.time) }))
        .filter(r => !isNaN(r.dt.getTime()))
        .sort((a, b) => a.dt.getTime() - b.dt.getTime());

      // Pair into sessions with start/end Dates
      const sessions: Array<{ start: Date; end?: Date; locationIn?: string; locationOut?: string; nameIn?: string; nameOut?: string; }>= [];
      let open: any | null = null;
      for (const it of items) {
        const lt = String(it.log_type).toUpperCase();
        if (lt === 'IN') {
          if (open) {
            sessions.push({ start: open.dt, end: undefined, locationIn: open.location, nameIn: open.name });
          }
          open = it;
        } else if (lt === 'OUT') {
          if (open && it.dt.getTime() > open.dt.getTime()) {
            sessions.push({ start: open.dt, end: it.dt, locationIn: open.location, locationOut: it.location, nameIn: open.name, nameOut: it.name });
            open = null;
          } else {
            sessions.push({ start: it.dt, end: it.dt, locationOut: it.location, nameOut: it.name });
          }
        }
      }
      if (open) {
        sessions.push({ start: open.dt, end: undefined, locationIn: open.location, nameIn: open.name });
      }

      // Determine current clocked-in state from most recent session
      if (sessions.length > 0) {
        const last = sessions[sessions.length - 1];
        const clockedIn = !last.end || last.end.getTime() === last.start.getTime();
        setIsClockedIn(clockedIn);
        setLastClockInTime(clockedIn ? formatTime12(last.start) : null);
        await persistState(clockedIn, clockedIn ? formatTime12(last.start) : null);
        // Build recent history list from sessions (most recent first)
        const asHistory: HistoryItem[] = sessions.slice().reverse().map((s, idx) => ({
          id: `${s.nameIn || 'sess'}-${idx}`,
          date: formatDisplayDate(s.start),
          clockIn: formatTime12(s.start),
          clockOut: s.end ? formatTime12(s.end) : '',
          locationIn: s.locationIn || '',
          locationOut: s.locationOut || '',
        }));
        setRecentHistory(asHistory);
      } else {
        // If we couldn't derive any sessions from the server (empty list),
        // do not override locally persisted state. This preserves the
        // red Clock Out button and "shift started" UI across app restarts
        // when server history is unavailable or empty.
        // Keep any existing recentHistory (e.g., from previous state)
      }

      // Compute this week totals (Mon..Sun)
      const now = new Date();
      const day = (now.getDay() + 6) % 7; // 0=Mon..6=Sun
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      weekStart.setDate(weekStart.getDate() - day);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime());
      weekEnd.setDate(weekEnd.getDate() + 7);
      const daily: number[] = [0,0,0,0,0,0,0];

      const clamp = (t: number, a: number, b: number) => Math.min(Math.max(t, a), b);
      for (const s of sessions) {
        const sStart = s.start.getTime();
        const sEnd = (s.end ? s.end : new Date()).getTime();
        // Skip if entirely outside week
        if (sEnd <= weekStart.getTime() || sStart >= weekEnd.getTime()) continue;
        const startClamped = Math.max(sStart, weekStart.getTime());
        const endClamped = Math.min(sEnd, weekEnd.getTime());
        // Attribute to days
        for (let i = 0; i < 7; i++) {
          const dStart = new Date(weekStart.getTime()); dStart.setDate(weekStart.getDate() + i);
          const dEnd = new Date(dStart.getTime()); dEnd.setDate(dStart.getDate() + 1);
          const overlap = Math.max(0, Math.min(endClamped, dEnd.getTime()) - Math.max(startClamped, dStart.getTime()));
          if (overlap > 0) daily[i] += Math.round(overlap / 60000); // minutes
        }
      }
      setWeekDailyMinutes(daily);
      const totalMin = daily.reduce((a, b) => a + b, 0);
      setWeekTotalMinutes(totalMin);
      setWeekDaysWorked(daily.filter(m => m > 0).length);

      // Compute late days based on first IN per day vs threshold (default 09:15)
      const thrH = Number((Config as any)?.ATT_LATE_HOUR) || 9;
      const thrM = Number((Config as any)?.ATT_LATE_MINUTE) || 15;
      const earliestInByDay: Record<string, Date> = {};
      for (const it of items) {
        const lt = String(it.log_type).toUpperCase();
        if (lt !== 'IN') continue;
        const t = it.dt.getTime();
        if (t < weekStart.getTime() || t >= weekEnd.getTime()) continue;
        const key = `${it.dt.getFullYear()}-${String(it.dt.getMonth()+1).padStart(2,'0')}-${String(it.dt.getDate()).padStart(2,'0')}`;
        const prev = earliestInByDay[key];
        if (!prev || t < prev.getTime()) earliestInByDay[key] = it.dt;
      }
      let lateDays = 0;
      Object.keys(earliestInByDay).forEach(key => {
        const [y,m,d] = key.split('-').map(n => parseInt(n, 10));
        const threshold = new Date(y, (m-1), d, thrH, thrM, 0, 0);
        if (earliestInByDay[key].getTime() > threshold.getTime()) lateDays += 1;
      });
      setWeekDaysLate(lateDays);

      // Dummy recent history entries for UI under stats
      const today = new Date();
      const fmt = (h: number, m: number) => {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0);
        return formatTime12(d);
      };
      const dummy: HistoryItem[] = [
        { id: 'dummy-1', date: formatDisplayDate(today), clockIn: fmt(9, 0), clockOut: fmt(17, 30), locationIn: 'Office HQ', locationOut: 'Office HQ' },
        { id: 'dummy-2', date: formatDisplayDate(new Date(today.getTime() - 86400000)), clockIn: fmt(9, 15), clockOut: fmt(18, 5), locationIn: 'Office HQ', locationOut: 'Office HQ' },
        { id: 'dummy-3', date: formatDisplayDate(new Date(today.getTime() - 2*86400000)), clockIn: fmt(8, 55), clockOut: fmt(17, 45), locationIn: 'Client Site', locationOut: 'Client Site' },
      ];
      setRecentHistory(dummy);
    } catch (e) {
      // keep whatever is shown
    } finally {
      setHistoryLoading(false);
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

      const hasPerm = await ensureLocationPermission();
      if (!hasPerm) {
        Alert.alert('Permission Required', 'Location permission not granted. Please enable it to clock in.');
        return;
      }

      setLoadingLocation(true);
      const loc = await requestLocation();

      // Enforce exact human-readable address to store in ERP's location field
      if (!loc.address || loc.address === 'Location unavailable' || /^Lat\s/i.test(loc.address)) {
        Alert.alert(
          'Address Required',
          'Unable to resolve your exact address. Please ensure internet is available and try again.'
        );
        return;
      }

      const now = new Date();
      const formattedTime = toErpLocalTimestamp(now);
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
        await persistInLocation(null);
        await persistState(false, null);
        // After clock out, clear the displayed location
        setLocationText('Location not fetched');
      } else {
        setIsClockedIn(true);
        const newIn = formatTime12(now);
        setLastClockInTime(newIn);
        await persistInLocation(loc);
        await persistState(true, newIn);
        // After clock in, show the captured location
        setLocationText(loc.address);
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

  const formatHM = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} hrs ${m} mins`;
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
        <View style={styles.dateRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={16} color={index === 0 ? '#fff' : '#666'} />
            <Text style={[styles.historyDate, index === 0 && styles.currentSessionText]}>{item.date}</Text>
          </View>
          {!item.clockOut && (
            <View style={[styles.pill, index === 0 && styles.pillOnDark]}>
              <Text style={[styles.pillText, index === 0 && styles.pillTextOnDark]}>OPEN</Text>
            </View>
          )}
        </View>
        <View style={styles.tripletRow}>
          <View style={styles.tripletItem}>
            <Text style={[styles.inLabel, index === 0 && styles.inLabelOnDark]}>IN</Text>
            <Text style={[styles.tripletValue, index === 0 && styles.currentSessionText]}>{item.clockIn || '--'}</Text>
          </View>
          <View style={styles.tripletItem}>
            <Text style={[styles.outLabel, index === 0 && styles.outLabelOnDark]}>OUT</Text>
            <Text style={[styles.tripletValue, index === 0 && styles.currentSessionText]}>{item.clockOut || '--'}</Text>
          </View>
          <View style={styles.tripletItem}>
            <Text style={[styles.hoursLabel, index === 0 && styles.hoursLabelOnDark]}>HOURS</Text>
            <Text style={[styles.tripletValue, index === 0 && styles.currentSessionText]}>{totalHours === '--' ? '--' : totalHours}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Legacy header removed in favor of AppHeader */}
      {false && (
        <>
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
        </>
      )}
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
            <Text style={styles.statusText}>{isClockedIn ? 'Shift has started' : 'Ready to Clock In'}</Text>
          </View>

          {/* Clocked-in message */}
          {isClockedIn && !!lastClockInTime && (
            <Text style={styles.clockedInText}>You clocked in at {lastClockInTime}</Text>
          )}
        </View>

        {/* This Week - Compact Counts */}
        <View style={styles.smallStatsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <Ionicons name="bar-chart-outline" size={20} color="#666" />
          </View>
          {historyLoading ? (
            <View style={styles.statItemsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Hours</Text>
                <View style={[styles.skeletonBar, { width: 50, height: 18 }]} />
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Days</Text>
                <View style={[styles.skeletonBar, { width: 36, height: 18 }]} />
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Late</Text>
                <View style={[styles.skeletonBar, { width: 36, height: 18 }]} />
              </View>
            </View>
          ) : (
            <View style={styles.statItemsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Hours</Text>
                <Text style={styles.statValue}>{(weekTotalMinutes/60).toFixed(2)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Days</Text>
                <Text style={styles.statValue}>{weekDaysWorked}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Late</Text>
                <Text style={styles.statValue}>{weekDaysLate}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Recent History removed as per requirement */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  wrapper: { flex: 1, padding: 10 },
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
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  clockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clockTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  timeText: { fontSize: 36, fontWeight: 'bold', color: '#000', marginBottom: 2 },
  dateText: { fontSize: 14, color: '#666', marginBottom: 12, textAlign: 'center', fontWeight: '500' },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
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
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 0,
  },
  smallStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 12,
  },
  statRow: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  statValue: { fontSize: 20, color: '#111', fontWeight: '800', marginTop: 2 },
  statItemsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  historyList: { flex: 1, minHeight: 0 },
  listContent: { paddingTop: 6, paddingBottom: 24 },
  simpleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  simpleDate: { color: '#111', fontWeight: '600' },
  simpleTime: { color: '#444', fontWeight: '600' },
  recentContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  recentItem: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  recentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentDate: { marginLeft: 6, color: '#111827', fontWeight: '700' },
  recentDuration: { color: '#059669', fontWeight: '700' },
  recentSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  recentSubText: { color: '#6b7280', fontWeight: '600' },
  historyItem: {
    flexDirection: 'column',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  currentSessionItem: { backgroundColor: '#000', borderColor: '#000' },
  historyLeft: { flex: 1 },
  historyRight: { alignItems: 'flex-end' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#333', marginLeft: 6 },
  timeRow: { flexDirection: 'row', gap: 16 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyTime: { fontSize: 14, color: '#666', fontWeight: '500' },
  inOutGrid: { flexDirection: 'row', gap: 16 },
  inOutCol: { flex: 1 },
  inOutTime: { fontSize: 16, fontWeight: '700', color: '#111' },
  inLabel: { fontSize: 11, fontWeight: '800', color: '#059669', letterSpacing: 0.5 },
  outLabel: { fontSize: 11, fontWeight: '800', color: '#dc2626', letterSpacing: 0.5 },
  inLabelOnDark: { color: '#86efac' },
  outLabelOnDark: { color: '#fca5a5' },
  tripletRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  tripletItem: { flex: 1, alignItems: 'center' },
  tripletValue: { fontSize: 16, fontWeight: '800', color: '#111', marginTop: 2 },
  hoursLabel: { fontSize: 11, fontWeight: '800', color: '#334155', letterSpacing: 0.5 },
  hoursLabelOnDark: { color: '#cbd5e1' },
  pill: { marginLeft: 8, marginRight: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#fee2e2' },
  pillText: { fontSize: 10, fontWeight: '800', color: '#991b1b', letterSpacing: 0.5 },
  pillOnDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  pillTextOnDark: { color: '#fff' },
  hoursBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  currentSessionHours: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' },
  historyTotal: { fontSize: 14, fontWeight: '700', color: '#000' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currentSessionText: { color: '#fff' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, color: '#999', fontWeight: '600', marginTop: 12, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#ccc', textAlign: 'center' },
  recentCard: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  recentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  recentAccent: { height: 3, backgroundColor: '#111', borderRadius: 2, marginTop: 8, marginBottom: 8 },
  skeletonBar: { backgroundColor: '#e5e7eb', borderRadius: 6 },
  skeletonCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#e5e7eb' },
  skeletonPill: { width: 48, height: 16, borderRadius: 999, backgroundColor: '#e5e7eb' },
});

export default AttendanceScreen;
