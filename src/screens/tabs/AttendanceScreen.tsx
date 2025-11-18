import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, Pressable, Alert, Linking, Platform, RefreshControl, AppState, AppStateStatus, ActivityIndicator, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkInOutDoctype, requestLocationPermission, fetchEmployeeCheckins, getLocationString, fetchAttendanceHistory } from '../../services/attendance';
import Ionicons from 'react-native-vector-icons/Ionicons';

type WeekStats = { totalMinutes: number; days: number; late: number };
type DayHistory = { date: Date; minutes: number; firstIn?: Date | null; lastOut?: Date | null };

export default function AttendanceScreen() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const [now, setNow] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInAt, setClockInAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [headerLocation, setHeaderLocation] = useState<string>('-');

  const [weekStats, setWeekStats] = useState<WeekStats>({ totalMinutes: 0, days: 0, late: 0 });
  type IOPair = { date: Date; inTime: Date | null; outTime: Date | null; locationIn?: string | null; locationOut?: string | null };
  const [recentPairs, setRecentPairs] = useState<IOPair[]>([]);

  console.log("recentPairs====>",recentPairs);

  // Offline fallback: persist/restore clocked-in state
  const STORAGE_CLOCKED_IN = 'attendance:isClockedIn';
  const STORAGE_CLOCKIN_AT = 'attendance:clockInAt';
  const STORAGE_LAST_LOCATION = 'attendance:lastLocation';
  const restoreFromStorage = async () => {
    try {
      const entries = await AsyncStorage.multiGet([STORAGE_CLOCKED_IN, STORAGE_CLOCKIN_AT, STORAGE_LAST_LOCATION]);
      const isFlag = entries.find(([k]) => k === STORAGE_CLOCKED_IN)?.[1];
      const at = entries.find(([k]) => k === STORAGE_CLOCKIN_AT)?.[1];
      const lastLoc = entries.find(([k]) => k === STORAGE_LAST_LOCATION)?.[1];
      if (isFlag === '1') {
        setIsClockedIn(true);
        if (at) {
          const when = new Date(at);
          if (!isNaN(when.getTime())) setClockInAt(when);
        }
      }
      if (lastLoc) setHeaderLocation(lastLoc);
    } catch {}
  };

  // Modern history row renderer (reused by dummy and live)
  const renderModernHistoryRow = (item: IOPair, idx: number, keyPrefix: string) => (
    <View key={`${keyPrefix}-${item.date?.getTime?.() || idx}-${idx}`} style={[styles.historyRowModern, idx > 0 && styles.historyRowDivider]}>
      <View style={styles.historyLeftModern}>
        <View style={styles.datePill}>
          <Ionicons name="calendar-outline" size={12} color="#1f2937" />
          <Text style={styles.datePillText}>{formatRowDate(item.date)}</Text>
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="log-in-outline" size={16} color="#059669" />
          <Text style={styles.ioLabel}>In</Text>
          <Text style={styles.ioValue}>{item.inTime ? formatTime(item.inTime) : '-'}</Text>
        </View>
        <View style={[styles.timeRow, { marginTop: 2 }]}>
          <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          <Text style={styles.ioLabel}>Out</Text>
          <Text style={styles.ioValue}>{item.outTime ? formatTime(item.outTime) : '-'}</Text>
        </View>
      </View>
      <View style={styles.historyRightModern}>
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={14} color="#065f46" />
          <Text style={styles.durationText}>{formatDuration(item.inTime, item.outTime)}</Text>
        </View>
        <Text style={styles.locationSmall} numberOfLines={1} ellipsizeMode="tail">In: {item.locationIn || '-'}</Text>
        <Text style={styles.locationSmall} numberOfLines={1} ellipsizeMode="tail">Out: {item.locationOut || '-'}</Text>
      </View>
    </View>
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshData = async () => {
    try {
      if (!employeeId) return;
      const today = new Date();
      let recentLocal: IOPair[] = [];

      // Compute week stats (independent error handling)
      try {
        const stats = await computeWeekStats(employeeId, today);
        setWeekStats(stats);
      } catch {}

      // Fetch recent history (independent error handling)
      try {
        const pairs = await fetchAttendanceHistory({ employeeId, daysBack: 14 });
        // Collapse to one row per date: first IN and last OUT
        const byDay = new Map<string, IOPair>();
        for (const p of pairs || []) {
          const day = startOfDay(p.date);
          const key = ymdKey(day);
          const prev = byDay.get(key) || { date: day, inTime: null, outTime: null, locationIn: null, locationOut: null };
          if (p.inTime && (!prev.inTime || p.inTime.getTime() < (prev.inTime as Date | null)?.getTime?.() || Infinity)) {
            prev.inTime = p.inTime;
            prev.locationIn = p.locationIn || prev.locationIn || null;
          }
          if (p.outTime && (!prev.outTime || p.outTime.getTime() > (prev.outTime as Date | null)?.getTime?.() || -Infinity)) {
            prev.outTime = p.outTime;
            prev.locationOut = p.locationOut || prev.locationOut || null;
          }
          byDay.set(key, prev);
        }
        let daily = Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
        if (!daily || daily.length === 0) {
          // Fallback: build from raw checkins over a wider window
          const from2 = addDays(startOfDay(today), -90);
          const to2 = addDays(startOfDay(today), 1);
        const rows = await fetchEmployeeCheckins({ employeeId, from: from2, to: to2, limit: 2000 });
        const parseLocal = (s: any) => {
          if (!s || typeof s !== 'string') return null as any;
          let d = new Date(s.replace(' ', 'T'));
          if (!isNaN(d.getTime())) return d;
          const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/);
          if (m) { const [_, yy, MM, dd, hh, mi, ss] = m; return new Date(Number(yy), Number(MM)-1, Number(dd), Number(hh), Number(mi), Number(ss), 0); }
          return null as any;
        };
        const items = (rows || [])
          .map(r => ({ ...r, dt: parseLocal((r as any).time) }))
          .filter(it => it.dt && !isNaN((it as any).dt.getTime?.() || NaN))
          .sort((a, b) => (a as any).dt.getTime() - (b as any).dt.getTime());
          const tmp = new Map<string, IOPair>();
          for (const it of items as any[]) {
            const day = startOfDay(it.dt);
            const key = ymdKey(day);
          const type = String(it.log_type).trim().toUpperCase();
            const loc = (it.location || it.device_id || null) as string | null;
            const prev = tmp.get(key) || { date: day, inTime: null, outTime: null, locationIn: null, locationOut: null };
            if (type === 'IN') {
              if (!prev.inTime || (it.dt as Date).getTime() < (prev.inTime as Date).getTime()) {
                prev.inTime = it.dt as Date;
                prev.locationIn = (loc || prev.locationIn || null) as any;
              }
            } else if (type === 'OUT') {
              if (!prev.outTime || (it.dt as Date).getTime() > (prev.outTime as Date).getTime()) {
                prev.outTime = it.dt as Date;
                prev.locationOut = (loc || prev.locationOut || null) as any;
              }
            }
            tmp.set(key, prev);
          }
          daily = Array.from(tmp.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
        }
        recentLocal = daily;
        setRecentPairs(daily);
      } catch {}
      try { console.log('Attendance refresh done', { employeeId }); } catch {}

      // Persisted local state overrides server to keep button orange
      const [localFlag, localAt] = await Promise.all([
        AsyncStorage.getItem(STORAGE_CLOCKED_IN),
        AsyncStorage.getItem(STORAGE_CLOCKIN_AT),
      ]);
      if (localFlag === '1') {
        setIsClockedIn(true);
        if (localAt) {
          const when = new Date(localAt);
          if (!isNaN(when.getTime())) setClockInAt(when);
        }
      } else {
        // Fallback to server-derived state
        if (recentLocal && recentLocal.length > 0) {
          const latest = recentLocal[recentLocal.length - 1];
          if (latest && latest.inTime && !latest.outTime) {
            setIsClockedIn(true);
            setClockInAt(latest.inTime);
          } else {
            setIsClockedIn(false);
            setClockInAt(null);
          }
        } else {
          setIsClockedIn(false);
          setClockInAt(null);
        }
      }
    } catch {
      // When offline or fetch fails, restore from local storage
      await restoreFromStorage();
    }
  };

  useEffect(() => { refreshData(); }, [employeeId]);
  // On mount, restore UI state fast (before server)
  useEffect(() => { restoreFromStorage(); }, []);

  // Load logged-in employee ID from AsyncStorage (with fallback to employeeData.name)
  useEffect(() => {
    (async () => {
      try {
        const [id, raw] = await AsyncStorage.multiGet(['employeeId', 'employeeData']).then(rows => [rows.find(r=>r[0]==='employeeId')?.[1], rows.find(r=>r[0]==='employeeData')?.[1]]);
        if (id) {
          setEmployeeId(id);
        } else if (raw) {
          try {
            const obj = JSON.parse(raw);
            const cand = [
              obj?.name,
              obj?.employee,
              obj?.employee_id,
              obj?.employeeId,
              obj?.data?.name,
              obj?.data?.employee,
              obj?.data?.employee_id,
              obj?.data?.employeeId,
            ].find((v:any)=> typeof v === 'string' && v.trim().length>0);
            if (cand) setEmployeeId(String(cand));
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // Refresh when app comes to foreground (focus-like behavior)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refreshData();
      }
    });
    return () => sub.remove();
  }, [employeeId]);

  const onPullRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const timeText = formatTime(now);
  const dateText = formatDate(now);
  const latestPair = recentPairs && recentPairs.length > 0 ? recentPairs[recentPairs.length - 1] : null;

const onClockIn = async () => {
  if (submitting) return;
  if (!employeeId) {
    Alert.alert('Not Signed In', 'Employee not found. Please login again.');
    return;
  }
  setSubmitting(true);
  try {
    const perm = await requestLocationPermission();
    if (!perm) {
      Alert.alert(
        'Enable Location',
        'Location permission is required to clock in. Open settings to grant access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
        ]
      );
      return;
    }
    // Fetch human-readable location for header display
    try {
      const pretty = await getLocationString();
      setHeaderLocation(pretty);
      try { await AsyncStorage.setItem(STORAGE_LAST_LOCATION, pretty); } catch {}
    } catch {}
    const res = await checkInOutDoctype(employeeId, 'IN');
    if (!res) throw new Error('Clock in failed');
    const nowAt = new Date();
    setIsClockedIn(true);
    setClockInAt(nowAt);
    try { await AsyncStorage.multiSet([[STORAGE_CLOCKED_IN, '1'], [STORAGE_CLOCKIN_AT, nowAt.toISOString()]]); } catch {}
    await refreshData();
    Alert.alert('Clock In', 'Successfully clocked in!');
  } catch (e) {
    const msg = String((e as any)?.message || 'Unexpected error');
    if (msg.includes('Location is required')) {
      Alert.alert(
        'Enable GPS',
        'Turn on device location (GPS) and try again. If already on, move near a window or outdoors to improve GPS.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
        ]
      );
    } else {
      Alert.alert('Clock In Failed', msg);
    }
  } finally {
    setSubmitting(false);
  }
};


const onClockOut = async () => {
  if (submitting) return;
  if (!employeeId) {
    Alert.alert('Not Signed In', 'Employee not found. Please login again.');
    return;
  }
  const clockOutAt = new Date();
  try {
    setSubmitting(true);
    const perm = await requestLocationPermission();
    if (!perm) {
      Alert.alert(
        'Enable Location',
        'Location permission is required to clock out. Open settings to grant access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
        ]
      );
      return;
    }
    // Fetch human-readable location for header display
    try {
      const pretty = await getLocationString();
      setHeaderLocation(pretty);
      try { await AsyncStorage.setItem(STORAGE_LAST_LOCATION, pretty); } catch {}
    } catch {}
    const res = await checkInOutDoctype(employeeId, 'OUT');
    if (!res) throw new Error('Clock out failed');
    let message = 'Checked out.';
    if (clockInAt) {
      const mins = Math.max(0, Math.round((clockOutAt.getTime() - (clockInAt as Date).getTime()) / 60000));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      message = `Worked ${h}h ${m}m`;
    }
    Alert.alert('Clock Out', message);
    setIsClockedIn(false);
    setClockInAt(null);
    try { await AsyncStorage.multiRemove([STORAGE_CLOCKED_IN, STORAGE_CLOCKIN_AT]); } catch {}
    await refreshData();
  } catch (e) {
    const msg = String((e as any)?.message || 'Unexpected error');
    if (msg.includes('Location is required')) {
      Alert.alert(
        'Enable GPS',
        'Turn on device location (GPS) and try again. If already on, move near a window or outdoors to improve GPS.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
        ]
      );
    } else {
      Alert.alert('Clock Out Failed', msg);
    }
  } finally {
    setSubmitting(false);
  }
};


  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#090a1a" />
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSubtitle}>Track your work hours</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.clockIconCircle}><Text style={styles.clockIcon}>🕒</Text></View>
          <Text style={styles.clockTime}>{timeText}</Text>
          <Text style={styles.clockDate}>{dateText}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationDot}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{headerLocation || '-'}</Text>
          </View>
          <View style={[styles.locationRow, { marginTop: -8, marginBottom: 16 }]}>
            <Text style={styles.locationDot}>🧾</Text>
            <Text style={styles.locationText}>Employee: {employeeId || '-'}</Text>
          </View>
          <View style={styles.statusWrap}>
            <View style={[styles.statusBadge, isClockedIn ? styles.badgeIn : styles.badgeOut]}>
              <Text style={[styles.statusBadgeText, isClockedIn ? styles.badgeInText : styles.badgeOutText]}>
                {isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isClockedIn ? 'Clock Out' : 'Clock In'}
            disabled={submitting}
            onPress={isClockedIn ? onClockOut : onClockIn}
            style={({ pressed }) => [
              styles.primaryButton,
              isClockedIn ? styles.btnDanger : styles.btnPrimary,
              submitting && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            {submitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Please wait…</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}><Text style={styles.statValue}>{Math.round(weekStats.totalMinutes / 60)}</Text><Text style={styles.statLabel}>Hours</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{weekStats.days}</Text><Text style={styles.statLabel}>Days</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{weekStats.late}</Text><Text style={styles.statLabel}>Late</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Recent History</Text>
        {recentPairs && recentPairs.length > 0 ? (
          <View style={styles.historyCard}>
            {recentPairs.slice(-10).reverse().map((item, idx) => renderModernHistoryRow(item, idx, 'live'))}
          </View>
        ) : (
          <View style={[styles.historyCard, styles.emptyWrap]}>
            <Text style={styles.historyEmpty}>No attendance records</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function twoDigits(n: number) { return n < 10 ? `0${n}` : String(n); }
function formatTime(d: Date) { let h=d.getHours(); const m=twoDigits(d.getMinutes()); const ap=h>=12?'PM':'AM'; h=h%12; if(h===0)h=12; return `${twoDigits(h)}:${m} ${ap}`; }
function formatDate(d: Date) { const W=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]; const M=['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]; return `${W}, ${M} ${d.getDate()}, ${d.getFullYear()}`; }
function startOfWeekMonday(d: Date) { const t=new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day=t.getDay(); const diff=(day===0?-6:1)-day; t.setDate(t.getDate()+diff); t.setHours(0,0,0,0); return t; }
function endOfWeekFrom(start: Date){const e=new Date(start); e.setDate(e.getDate()+7); e.setHours(0,0,0,0); return e; }
function startOfDay(d: Date){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date,n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function ymdKey(d: Date){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function formatRowDate(d?: Date | null){ if(!d) return '-'; const W=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]; const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; return `${W}, ${M} ${d.getDate()}`; }
function minutesBetween(a?: Date | null, b?: Date | null){ if(!a) return 0; const end = b ? b.getTime() : Date.now(); return Math.max(0, Math.round((end - a.getTime())/60000)); }
function formatDuration(a?: Date | null, b?: Date | null){ const mins = minutesBetween(a, b); const h=Math.floor(mins/60); const m=mins%60; return `${h}h ${m}m`; }

async function computeWeekStats(employeeId: string, refDate: Date) {
  const from = startOfWeekMonday(refDate);
  const to = endOfWeekFrom(from);
  const rows = await fetchEmployeeCheckins({ employeeId, from, to, limit: 1000 });
  const items = rows.map(r=>({ ...r, dt:new Date(r.time)})).sort((a,b)=>a.dt.getTime()-b.dt.getTime());
  let totalMinutes=0; const daysSet=new Set<string>(); const firstInByDay=new Map<string,Date>(); let lastIn: Date | null=null;
  for(const it of items){ const dayKey=ymdKey(it.dt); if(it.log_type==='IN'){ if(!firstInByDay.has(dayKey)) firstInByDay.set(dayKey,it.dt); daysSet.add(dayKey); lastIn=it.dt; } else if(it.log_type==='OUT'){ if(lastIn && it.dt>lastIn){ totalMinutes+=Math.max(0,Math.round((it.dt.getTime()-lastIn.getTime())/60000)); lastIn=null; } } }
  if(lastIn){ const end=Math.min(new Date().getTime(), endOfWeekFrom(startOfWeekMonday(refDate)).getTime()); totalMinutes+=Math.max(0,Math.round((end-lastIn.getTime())/60000)); }
  const LATE_HOUR=9, LATE_MIN=30; let late=0; for(const [,dt] of firstInByDay.entries()){ const cutoff=new Date(dt); cutoff.setHours(LATE_HOUR,LATE_MIN,0,0); if(dt.getTime()>cutoff.getTime()) late++; }
  return { totalMinutes, days: daysSet.size, late } as WeekStats;
}

// computeRecentHistory removed: pairs are fetched via fetchAttendanceHistory

const styles = StyleSheet.create({
  headerCard: { backgroundColor: '#090a1a', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingBottom: 16, paddingHorizontal: 16, marginBottom: 10 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#cbd5e1', marginTop: 4, fontSize: 12 },
  screen: { flex: 1, backgroundColor: '#fff' },
  
  card: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, padding: 16, borderWidth: 1.25, borderColor: '#d1d5db' },
  clockIconCircle: { alignSelf: 'center', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', marginTop: 4, marginBottom: 12 },
  clockIcon: { fontSize: 24 },
  clockTime: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  clockDate: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  locationDot: { marginRight: 6 },
  locationText: { color: '#6b7280', fontSize: 12 },
  primaryButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0b0b1b' },
  btnDanger: { backgroundColor: '#f97316' },
  btnDisabled: { opacity: 0.7 },
  btnPressed: { opacity: 0.85 },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  statusWrap: { width: '100%', marginBottom: 10, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeIn: { backgroundColor: '#ecfdf5' },
  badgeOut: { backgroundColor: '#f3f4f6' },
  badgeInText: { color: '#065f46', fontWeight: '600', fontSize: 12 },
  badgeOutText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  sectionTitle: { marginTop: 16, marginBottom: 8, marginLeft: 16, fontSize: 14, fontWeight: '700', color: '#111827' },
  statsCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, borderWidth: 1.25, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  historyRowDivider: { borderTopWidth: 1, borderTopColor: '#d1d5db' },
  historyLeft: { flexDirection: 'row', alignItems: 'center' },
  historyRight: { flexDirection: 'column', alignItems: 'flex-end', marginRight: 12 },
  historyDate: { color: '#374151', fontSize: 13 },
  historyTime: { color: '#6b7280', fontSize: 11 },
  historyDuration: { color: '#059669', fontWeight: '600', fontSize: 13 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  emptyPill: { width: 140, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  historyEmpty: { color: '#9ca3af' },
  latestDetails: { marginHorizontal: 12, marginTop: 4, marginBottom: 8 },
  detailRow: { color: '#374151', fontSize: 12, marginTop: 2 },
  detailLocation: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  // Modern history row styles
  historyRowModern: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  historyLeftModern: { flexDirection: 'column', flex: 1 },
  historyRightModern: { alignItems: 'flex-end', justifyContent: 'center', width: 160 },
  datePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 6 },
  datePillText: { color: '#1f2937', fontSize: 12, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ioLabel: { color: '#6b7280', fontSize: 12 },
  ioValue: { color: '#111827', fontSize: 13, fontWeight: '600' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  durationText: { color: '#065f46', fontSize: 12, fontWeight: '700' },
  locationSmall: { color: '#6b7280', fontSize: 11, marginTop: 6, maxWidth: 160 },
});
