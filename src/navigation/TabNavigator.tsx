import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import DashboardScreen from '../screens/tabs/DashboardScreen';
import AttendanceScreen from '../screens/tabs/AttendanceScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

export type TabName = 'Dashboard' | 'Attendance' | 'Register';

export default function TabNavigator({ initialTab = 'Dashboard' as TabName }: { initialTab?: TabName }) {
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Dashboard' ? (
          <DashboardScreen />
        ) : activeTab === 'Attendance' ? (
          <AttendanceScreen />
        ) : (
          <RegisterScreen />
        )}
      </View>
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

function BottomTabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabName;
  onChange: (t: TabName) => void;
}) {
  return (
    <View style={styles.tabBar}>
      <TabButton label="Home" active={activeTab === 'Dashboard'} onPress={() => onChange('Dashboard')} />
      <TabButton label="Attend" active={activeTab === 'Attendance'} onPress={() => onChange('Attendance')} />
      <TabButton label="Register" active={activeTab === 'Register'} onPress={() => onChange('Register')} />
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, active && styles.tabButtonActive, pressed && styles.tabButtonPressed]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 6, borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#eef5ff' },
  tabButtonPressed: { opacity: 0.7 },
  tabLabel: { fontSize: 14, color: '#666' },
  tabLabelActive: { color: '#0b6dff', fontWeight: '600' },
});

