import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, Pressable, Alert, Linking, Platform, RefreshControl, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkInOutDoctype, requestLocationPermission, fetchEmployeeCheckins, getLocationString } from '../../services/attendance';
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
  const [recent, setRecent] = useState<DayHistory[]>([]);
  type IOPair = { date: Date; inTime: Date | null; outTime: Date | null; locationIn?: string | null; locationOut?: string | null };
  const [recentPairs, setRecentPairs] = useState<IOPair[]>([]);

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

  // Dummy recent history (shown first)
  const buildDate = (daysAgo: number, h: number, m: number) => {
    const x = new Date();
    x.setDate(x.getDate() - daysAgo);
    x.setHours(h, m, 0, 0);
    return x;
  };
  const dummyRecentPairs: IOPair[] = [
    { date: startOfDay(buildDate(0, 0, 0)), inTime: buildDate(0, 9, 5), outTime: buildDate(0, 17, 52), locationIn: 'Main Gate', locationOut: 'Main Gate' },
    { date: startOfDay(buildDate(1, 0, 0)), inTime: buildDate(1, 9, 12), outTime: buildDate(1, 18, 3), locationIn: 'Reception', locationOut: 'Reception' },
    { date: startOfDay(buildDate(2, 0, 0)), inTime: buildDate(2, 8, 58), outTime: buildDate(2, 17, 40), locationIn: 'Main Gate', locationOut: 'Main Gate' },
    { date: startOfDay(buildDate(3, 0, 0)), inTime: buildDate(3, 9, 7), outTime: buildDate(3, 17, 55), locationIn: 'Reception', locationOut: 'Reception' },
    { date: startOfDay(buildDate(4, 0, 0)), inTime: buildDate(4, 9, 0), outTime: buildDate(4, 17, 48), locationIn: 'Main Gate', locationOut: 'Main Gate' },
  ];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshData = async () => {
    try {
      if (!employeeId) return;
      const today = new Date();
      const stats = await computeWeekStats(employeeId, today);
      setWeekStats(stats);
      const list = await computeRecentHistory(employeeId, today, 14);
      setRecent(list);
      const pairs = await computeRecentIOPairs(employeeId, today, 14);
      setRecentPairs(pairs);

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
        if (pairs && pairs.length > 0) {
          const latest = pairs[pairs.length - 1];
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

  // Load logged-in employee ID from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('employeeId');
        if (id) setEmployeeId(id);
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
            <Text style={styles.locationText}>{headerLocation || '-'}</Text>
          </View>
          <View style={[styles.locationRow, { marginTop: -8, marginBottom: 16 }]}>
            <Text style={styles.locationDot}>🧾</Text>
            <Text style={styles.locationText}>Employee: {employeeId || '-'}</Text>
          </View>
          <Pressable onPress={isClockedIn ? onClockOut : onClockIn} style={({ pressed }) => [styles.primaryButton, isClockedIn ? styles.btnDanger : styles.btnPrimary, pressed && styles.btnPressed]}>
            <Text style={styles.primaryButtonText}>{submitting ? 'Please wait…' : isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}><Text style={styles.statValue}>{Math.round(weekStats.totalMinutes / 60)}</Text><Text style={styles.statLabel}>Hours</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{weekStats.days}</Text><Text style={styles.statLabel}>Days</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{weekStats.late}</Text><Text style={styles.statLabel}>Late</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Recent History</Text>
        {/* Recent history list */}
        {/* Always show dummy sample first */}
        <View style={styles.historyCard}>
          {dummyRecentPairs.map((item, idx) => (
            <View key={`dummy-${item.date?.getTime?.() || idx}-${idx}`} style={[styles.historyRow, idx > 0 && styles.historyRowDivider]}>
              <View style={styles.historyLeft}>
                <Ionicons name="calendar-outline" size={16} color="#374151" style={{ marginRight: 8, marginLeft: 4 }} />
                <View>
                  <Text style={styles.historyDate}>{formatRowDate(item.date)}</Text>
                  <Text style={styles.historyTime}>In: {item.inTime ? formatTime(item.inTime) : '-' }  •  Out: {item.outTime ? formatTime(item.outTime) : '-'}</Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyDuration}>{formatDuration(item.inTime, item.outTime)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Then show real recent records if available */}
        {recentPairs && recentPairs.length > 0 && (
          <View style={styles.historyCard}>
            {recentPairs.slice(0, 10).map((item, idx) => (
              <View key={`${item.date?.getTime?.() || idx}-${idx}`} style={[styles.historyRow, idx > 0 && styles.historyRowDivider]}>
                <View style={styles.historyLeft}>
                  <Ionicons name="calendar-outline" size={16} color="#374151" style={{ marginRight: 8, marginLeft: 4 }} />
                  <View>
                    <Text style={styles.historyDate}>{formatRowDate(item.date)}</Text>
                    <Text style={styles.historyTime}>In: {item.inTime ? formatTime(item.inTime) : '-' }  •  Out: {item.outTime ? formatTime(item.outTime) : '-'}</Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyDuration}>{formatDuration(item.inTime, item.outTime)}</Text>
                </View>
              </View>
            ))}
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

async function computeRecentHistory(employeeId: string, refDate: Date, daysBack: number){
  const to = addDays(startOfDay(refDate),1); const from=addDays(startOfDay(refDate), -daysBack);
  const rows = await fetchEmployeeCheckins({ employeeId, from, to, limit: 2000 });
  const items = rows.map(r=>({ ...r, dt:new Date(r.time)})).sort((a,b)=>a.dt.getTime()-b.dt.getTime());
  const perDay=new Map<string,number>(); const firstInByDay=new Map<string,Date>(); const lastOutByDay=new Map<string,Date>();
  let lastIn: Date | null=null; let lastInDayKey: string | null=null;
  for(const it of items){ const dk=ymdKey(it.dt); if(it.log_type==='IN'){ lastIn=it.dt; lastInDayKey=dk; const prev=firstInByDay.get(dk); if(!prev||it.dt<prev) firstInByDay.set(dk,it.dt); } else if(it.log_type==='OUT' && lastIn){ if(dk===lastInDayKey){ const mins=Math.max(0,Math.round((it.dt.getTime()-lastIn.getTime())/60000)); perDay.set(dk,(perDay.get(dk)||0)+mins);} const lo=lastOutByDay.get(dk); if(!lo||it.dt>lo) lastOutByDay.set(dk,it.dt); lastIn=null; lastInDayKey=null; } }
  const out: DayHistory[]=[]; for(let i=0;i<daysBack;i++){ const d=addDays(startOfDay(refDate),-i); const dk=ymdKey(d); const mins=perDay.get(dk)||0; const firstIn=firstInByDay.get(dk)||null; const lastOut=lastOutByDay.get(dk)||null; if(mins>0||firstIn||lastOut) out.push({ date:d, minutes:mins, firstIn, lastOut }); }
  // If there is no data, just return empty (no mock fallback)
  return out;
}

async function computeRecentIOPairs(employeeId: string, refDate: Date, daysBack: number){
  const to = addDays(startOfDay(refDate),1); const from=addDays(startOfDay(refDate), -daysBack);
  const rows = await fetchEmployeeCheckins({ employeeId, from, to, limit: 2000 });
  const items = rows.map(r=>({ ...r, dt:new Date(r.time)})).sort((a,b)=>a.dt.getTime()-b.dt.getTime());
  const out: { date: Date; inTime: Date | null; outTime: Date | null; locationIn?: string | null; locationOut?: string | null }[] = [];
  let openIn: { dayKey: string; dt: Date; location?: string | null } | null = null;
  for(const it of items){
    const dk = ymdKey(it.dt);
    if(String(it.log_type).toUpperCase() === 'IN'){
      if(openIn){
        out.push({ date: startOfDay(openIn.dt), inTime: openIn.dt, outTime: null, locationIn: openIn.location || null, locationOut: null });
      }
      openIn = { dayKey: dk, dt: it.dt, location: (it as any)?.location || null };
    } else if(String(it.log_type).toUpperCase() === 'OUT'){
      if(openIn && openIn.dayKey === dk && it.dt.getTime() > openIn.dt.getTime()){
        out.push({ date: startOfDay(it.dt), inTime: openIn.dt, outTime: it.dt, locationIn: openIn.location || null, locationOut: (it as any)?.location || null });
        openIn = null;
      } else {
        out.push({ date: startOfDay(it.dt), inTime: null, outTime: it.dt, locationIn: null, locationOut: (it as any)?.location || null });
      }
    }
  }
  if(openIn){
    out.push({ date: startOfDay(openIn.dt), inTime: openIn.dt, outTime: null, locationIn: openIn.location || null, locationOut: null });
    openIn = null;
  }
  return out;
}

const styles = StyleSheet.create({
  headerCard: { backgroundColor: '#090a1a', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingBottom: 16, paddingHorizontal: 16, marginBottom: 10 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#cbd5e1', marginTop: 4, fontSize: 12 },
  screen: { flex: 1, backgroundColor: '#fff' },
  
  card: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
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
  btnPressed: { opacity: 0.85 },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  sectionTitle: { marginTop: 16, marginBottom: 8, marginLeft: 16, fontSize: 14, fontWeight: '700', color: '#111827' },
  statsCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  historyRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
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
});

