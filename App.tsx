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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeText = formatTime(now);
  const dateText = formatDate(now);

  const onClockIn = () => {
    setIsClockedIn(true);
    setClockInAt(new Date());
  };

  const onClockOut = () => {
    const clockOutAt = new Date();
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

          <Pressable
            onPress={isClockedIn ? onClockOut : onClockIn}
            style={({ pressed }) => [
              styles.primaryButton,
              isClockedIn ? styles.btnDanger : styles.btnPrimary,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
          </Pressable>
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
});

export default App;
