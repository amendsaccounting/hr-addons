/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { postEmployeeCheckin, fetchEmployeeCheckins } from './src/services/erpnext';
import { MOCK_RECENT_HISTORY, MOCK_RECENT_HISTORY_DAYS } from './src/config';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Dashboard' ? <DashboardScreen /> : <AttendanceScreen />}
      </View>
      <BottomTabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

type TabName = 'Dashboard' | 'Attendance';
type WeekStats = { totalMinutes: number; days: number; late: number };

function DashboardScreen() {
  // Intentionally blank per requirements
  return <View style={styles.screen} />;
}

function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const [now, setNow] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInAt, setClockInAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const employeeId = 'HR-EMP-00020';

  const [weekStats, setWeekStats] = useState<WeekStats>({ totalMinutes: 0, days: 0, late: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  type DayHistory = { date: Date; minutes: number; firstIn?: Date | null; lastOut?: Date | null };
  const [recent, setRecent] = useState<DayHistory[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load weekly stats on mount and when employee changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStats(true);
        const stats = await computeWeekStats(employeeId, new Date());
        if (!cancelled) setWeekStats(stats);
      } catch (e) {
        // ignore for now; could surface message
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    (async () => {
      try {
        setLoadingRecent(true);
        const list = await computeRecentHistory(employeeId, new Date(), 14);
        if (!cancelled) setRecent(list);
      } catch (e) {
        // ignore for now
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const timeText = formatTime(now);
  const dateText = formatDate(now);

  const onClockIn = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const t = new Date();
      await postEmployeeCheckin('IN', t, { employeeId });
      setIsClockedIn(true);
      setClockInAt(t);
      // refresh weekly stats after a successful check-in
      const stats = await computeWeekStats(employeeId, new Date());
      setWeekStats(stats);
      const list = await computeRecentHistory(employeeId, new Date(), 14);
      setRecent(list);
    } catch (e: any) {
      Alert.alert('Clock In Failed', e?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const onClockOut = async () => {
    if (submitting) return;
    const clockOutAt = new Date();
    try {
      setSubmitting(true);
      await postEmployeeCheckin('OUT', clockOutAt, { employeeId });
      let message = 'Checked out.';
      if (clockInAt) {
        const mins = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000));
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        message = `Worked ${h}h ${m}m`;
      }
      Alert.alert('Clock Out', message);
      setIsClockedIn(false);
      setClockInAt(null);
      // refresh weekly stats after a successful check-out
      const stats = await computeWeekStats(employeeId, new Date());
      setWeekStats(stats);
      const list = await computeRecentHistory(employeeId, new Date(), 14);
      setRecent(list);
    } catch (e: any) {
      Alert.alert('Clock Out Failed', e?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSubtitle}>Track your work hours</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Clock Card */}
        <View style={styles.card}>
          <View style={styles.clockIconCircle}>
            <Text style={styles.clockIcon}>🕒</Text>
          </View>

          <Text style={styles.clockTime}>{timeText}</Text>
          <Text style={styles.clockDate}>{dateText}</Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationDot}>📍</Text>
            <Text style={styles.locationText}>Office - Main Building</Text>
          </View>
          <View style={[styles.locationRow, { marginTop: -8, marginBottom: 16 }]}>
            <Text style={styles.locationDot}>🧾</Text>
            <Text style={styles.locationText}>Employee: {employeeId}</Text>
          </View>

          <Pressable
            onPress={isClockedIn ? onClockOut : onClockIn}
            style={({ pressed }) => [
              styles.primaryButton,
              isClockedIn ? styles.btnDanger : styles.btnPrimary,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Please wait…' : isClockedIn ? 'Clock Out' : 'Clock In'}
            </Text>
          </Pressable>
        </View>

        {/* This Week Stats */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(weekStats.totalMinutes / 60)}</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weekStats.days}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weekStats.late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
        </View>

        {/* Recent History */}
        <Text style={styles.sectionTitle}>Recent History</Text>
        <View style={styles.historyCard}>
          {recent.length === 0 ? (
            <Text style={styles.historyEmpty}>No records</Text>
          ) : (
            recent
              .slice() // copy
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 10)
              .map((d, idx) => (
                <View key={idx} style={[styles.historyRow, idx !== 0 && styles.historyRowDivider]}>
                  <View style={styles.historyLeft}>
                    <Text style={{ marginRight: 8 }}>📅</Text>
                    <Text style={styles.historyDate}>{formatDateShort(d.date)}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyTime}>In {d.firstIn ? formatTime(d.firstIn) : '-'}</Text>
                    <Text style={styles.historyTime}>Out {d.lastOut ? formatTime(d.lastOut) : '-'}</Text>
                  </View>
                  <Text style={styles.historyDuration}>{formatDuration(d.minutes)}</Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function twoDigits(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(d: Date) {
  let hours = d.getHours();
  const minutes = twoDigits(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${twoDigits(hours)}:${minutes} ${ampm}`;
}

function formatDate(d: Date) {
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  const month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][d.getMonth()];
  return `${weekday}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function startOfWeekMonday(d: Date) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = t.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  t.setDate(t.getDate() + diff);
  t.setHours(0, 0, 0, 0);
  return t;
}

function endOfWeekFrom(start: Date) {
  const e = new Date(start);
  e.setDate(e.getDate() + 7);
  e.setHours(0, 0, 0, 0);
  return e;
}

async function computeWeekStats(employeeId: string, refDate: Date) {
  const from = startOfWeekMonday(refDate);
  const to = endOfWeekFrom(from);
  const rows = await fetchEmployeeCheckins({ employeeId, from, to, limit: 1000 });
  // sort by time (server may already sort)
  const items = rows
    .map((r) => ({ ...r, dt: new Date(r.time) }))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  let totalMinutes = 0;
  const daysSet = new Set<string>();
  const firstInByDay = new Map<string, Date>();
  let lastIn: Date | null = null;

  for (const it of items) {
    const dayKey = `${it.dt.getFullYear()}-${it.dt.getMonth() + 1}-${it.dt.getDate()}`;
    if (it.log_type === 'IN') {
      if (!firstInByDay.has(dayKey)) firstInByDay.set(dayKey, it.dt);
      daysSet.add(dayKey);
      lastIn = it.dt;
    } else if (it.log_type === 'OUT') {
      if (lastIn && it.dt > lastIn) {
        totalMinutes += Math.max(0, Math.round((it.dt.getTime() - lastIn.getTime()) / 60000));
        lastIn = null;
      }
    }
  }
  // if week still in progress and currently clocked in, count up to now (bounded by week end)
  if (lastIn) {
    const end = Math.min(new Date().getTime(), endOfWeekFrom(startOfWeekMonday(refDate)).getTime());
    totalMinutes += Math.max(0, Math.round((end - lastIn.getTime()) / 60000));
  }

  // Late calculation: first IN after 09:30 local considered late
  const LATE_HOUR = 9;
  const LATE_MIN = 30;
  let late = 0;
  for (const [key, dt] of firstInByDay.entries()) {
    const cutoff = new Date(dt);
    cutoff.setHours(LATE_HOUR, LATE_MIN, 0, 0);
    if (dt.getTime() > cutoff.getTime()) late++;
  }

  return { totalMinutes, days: daysSet.size, late } as WeekStats;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function ymdKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function computeRecentHistory(employeeId: string, refDate: Date, daysBack: number) {
  const to = addDays(startOfDay(refDate), 1); // tomorrow 00:00
  const from = addDays(startOfDay(refDate), -daysBack);
  const rows = await fetchEmployeeCheckins({ employeeId, from, to, limit: 2000 });
  const items = rows
    .map((r) => ({ ...r, dt: new Date(r.time) }))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  const perDay = new Map<string, number>();
  const firstInByDay = new Map<string, Date>();
  const lastOutByDay = new Map<string, Date>();
  let lastIn: Date | null = null;
  let lastInDayKey: string | null = null;

  for (const it of items) {
    const dk = ymdKey(it.dt);
    if (it.log_type === 'IN') {
      lastIn = it.dt;
      lastInDayKey = dk;
      const prev = firstInByDay.get(dk);
      if (!prev || it.dt < prev) firstInByDay.set(dk, it.dt);
    } else if (it.log_type === 'OUT' && lastIn) {
      // only count if same day to keep it simple
      if (dk === lastInDayKey) {
        const mins = Math.max(0, Math.round((it.dt.getTime() - lastIn.getTime()) / 60000));
        perDay.set(dk, (perDay.get(dk) || 0) + mins);
      }
      const lo = lastOutByDay.get(dk);
      if (!lo || it.dt > lo) lastOutByDay.set(dk, it.dt);
      lastIn = null;
      lastInDayKey = null;
    }
  }

  const out: DayHistory[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = addDays(startOfDay(refDate), -i);
    const dk = ymdKey(d);
    const mins = perDay.get(dk) || 0;
    const firstIn = firstInByDay.get(dk) || null;
    const lastOut = lastOutByDay.get(dk) || null;
    if (mins > 0 || firstIn || lastOut) out.push({ date: d, minutes: mins, firstIn, lastOut });
  }
  if (out.length === 0 && MOCK_RECENT_HISTORY) {
    return generateMockRecentHistory(refDate, MOCK_RECENT_HISTORY_DAYS || daysBack);
  }
  return out;
}

function generateMockRecentHistory(refDate: Date, days: number): DayHistory[] {
  const res: DayHistory[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(startOfDay(refDate), -i);
    // 8h to 9h 30m with some variance, skip weekends optionally
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // skip Sun/Sat
    const base = 8 * 60 + 0; // 8h
    const jitter = (i % 4) * 15; // 0,15,30,45
    const minutes = base + jitter;
    const firstIn = new Date(d);
    // random-ish between 9:05 and 9:40
    const firstInMin = 9 * 60 + 5 + (i % 4) * 10;
    firstIn.setHours(Math.floor(firstInMin / 60), firstInMin % 60, 0, 0);
    const lastOut = new Date(firstIn);
    lastOut.setMinutes(lastOut.getMinutes() + minutes);
    res.push({ date: d, minutes, firstIn, lastOut });
  }
  return res;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDateShort(d: Date) {
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][d.getMonth()];
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function BottomTabBar({
  activeTab,
  onChange,
  bottomInset,
}: {
  activeTab: TabName;
  onChange: (t: TabName) => void;
  bottomInset: number;
}) {
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <TabButton
        label="Dashboard"
        active={activeTab === 'Dashboard'}
        onPress={() => onChange('Dashboard')}
      />
      <TabButton
        label="Attendance"
        active={activeTab === 'Attendance'}
        onPress={() => onChange('Attendance')}
      />
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active && styles.tabButtonActive,
        pressed && styles.tabButtonPressed,
      ]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  screenCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: '#0b0b1b',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  clockIconCircle: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginTop: 4,
    marginBottom: 12,
  },
  clockIcon: {
    fontSize: 24,
  },
  clockTime: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  clockDate: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationDot: {
    marginRight: 6,
  },
  locationText: {
    color: '#6b7280',
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#0b0b1b',
  },
  btnDanger: {
    backgroundColor: '#e11d48',
  },
  btnPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 12,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#eef5ff',
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  tabLabel: {
    fontSize: 14,
    color: '#666',
  },
  tabLabelActive: {
    color: '#0b6dff',
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  historyRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: 12,
  },
  historyDate: {
    color: '#374151',
    fontSize: 13,
  },
  historyTime: {
    color: '#6b7280',
    fontSize: 11,
  },
  historyDuration: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default App;
