import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// Ensure icon font is loaded in RN CLI builds
// (safe no-op if already loaded)
(Ionicons as any)?.loadFont?.();
import DashboardScreen from '../screens/tabs/DashboardScreen';
import AttendanceScreen from '../screens/tabs/AttendanceScreen';
import LeaveScreen from '../screens/tabs/LeaveScreen';
import LeadScreen from '../screens/tabs/LeadScreen';
import ExpenseScreen from '../screens/tabs/ExpenseScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
export type TabName = 'Dashboard' | 'Attendance' | 'Leave' | 'Leads' | 'Expense';

export default function TabNavigator({ initialTab = 'Dashboard' as TabName }: { initialTab?: TabName }) {
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = React.useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setDrawerOpen(false);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Dashboard' && <DashboardScreen onOpenMenu={openDrawer} />}
        {activeTab === 'Attendance' && <AttendanceScreen />}
        {activeTab === 'Leave' && <LeaveScreen />}
        {activeTab === 'Leads' && <LeadScreen />}
        {activeTab === 'Expense' && <ExpenseScreen />}
      </View>
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />

      <ProfileDrawer visible={drawerOpen} anim={drawerAnim} onClose={closeDrawer} />
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
      <TabButton iconActive="home-sharp" iconInactive="home-outline" label="Home" active={activeTab === 'Dashboard'} onPress={() => onChange('Dashboard')} />
      <TabButton iconActive="stopwatch" iconInactive="stopwatch-outline" label="Attendance" active={activeTab === 'Attendance'} onPress={() => onChange('Attendance')} />
      <TabButton iconActive="calendar" iconInactive="calendar-outline" label="Leave" active={activeTab === 'Leave'} onPress={() => onChange('Leave')} />
      <TabButton iconActive="people" iconInactive="people-outline" label="Leads" active={activeTab === 'Leads'} onPress={() => onChange('Leads')} />
      <TabButton iconActive="wallet" iconInactive="wallet-outline" label="Expense" active={activeTab === 'Expense'} onPress={() => onChange('Expense')} />
    </View>
  );
}

function TabButton({
  iconActive,
  iconInactive,
  label,
  active,
  onPress,
}: {
  iconActive: string;
  iconInactive: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, /* no focused background */ pressed && styles.tabButtonPressed]}
    >
      <Ionicons
        name={active ? iconActive : iconInactive}
        size={active ? 24 : 22}
        color={active ? '#000' : '#666'}
        style={styles.iconSpacing}
      />
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>{label}</Text>
    </Pressable>
  );
}

function ProfileDrawer({ visible, anim, onClose }: { visible: boolean; anim: Animated.Value; onClose: () => void }) {
  const { width, height } = Dimensions.get('window');
  const panelWidth = Math.min(360, Math.round(width * 0.88));
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
      </Pressable>
      <Animated.View style={[styles.drawerPanel, styles.drawerLeft, { width: panelWidth, transform: [{ translateX }] }] }>
        <View style={{ flex: 1 }}>
          <ProfileScreen />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    paddingTop: 6,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 10,
  },
  tabButtonActive: {},
  tabButtonPressed: { opacity: 0.7 },
  iconSpacing: { marginTop: 2 },
  tabLabel: { fontSize: 11, marginTop: 2 },
  tabLabelInactive: { color: '#666' },
  tabLabelActive: { color: '#000', fontWeight: '600' },
  backdrop: { backgroundColor: 'transparent' },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  drawerLeft: {
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ddd',
    shadowOffset: { width: 2, height: 0 },
  },
  hamburger: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  drawerTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
});
