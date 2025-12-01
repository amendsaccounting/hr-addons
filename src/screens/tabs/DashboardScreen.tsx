import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Image } from 'react-native';
 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';


type Props = {
  onOpenMenu?: () => void;
};

export default function DashboardScreen({ onOpenMenu }: Props) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState<string>('User');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('employeeData');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user) setUsername(String(parsed.user));
          const candidate = parsed?.profileImage || parsed?.image || parsed?.photoURL || parsed?.avatar;
          if (candidate) setProfileImage(String(candidate));
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.screen}>
      {/* Legacy header removed in favor of AppHeader */}
      {false && (
        <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeftRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                onPress={onOpenMenu}
                style={styles.headerMenu}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.headerAvatar} />
                ) : (
                  <Ionicons name="person-circle-outline" size={22} color="#111827" />
                )}
              </Pressable>
              <Text style={styles.headerTitle}>Welcome Back,</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="notifications-outline" size={16} color="#fff" />
              <View style={styles.badgeDot}><Text style={styles.badgeDotText}>3</Text></View>
            </View>
          </View>
          <Text style={styles.headerName}>{username || 'John Doe'}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.empId}>Employee ID: EMP-2024-001</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Quick Overview */}
        <Text style={styles.sectionTitle}>Quick Overview</Text>
        <View style={styles.quickRow}>
          <MetricCard icon="time-outline" label="Hours" value="168" color="#3b82f6" />
          <MetricCard icon="calendar-outline" label="Leave" value="12" color="#10b981" />
          <MetricCard icon="trending-up-outline" label="Attendance" value="98%" color="#a855f7" />
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <ActivityRow iconColor="#10b981" title="Clock In" when="Today, 9:00 AM" />
          <View style={styles.divider} />
          <ActivityRow iconColor="#3b82f6" title="Leave Approved" when="Yesterday" />
          <View style={styles.divider} />
          <ActivityRow iconColor="#f59e0b" title="Payslip Generated" when="2 days ago" />
          <View style={styles.divider} />
          <ActivityRow iconColor="#ef4444" title="Performance Review Due" when="5 days" />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, styles.actionPrimary]}><Text style={styles.actionPrimaryText}>Apply Leave</Text></Pressable>
          <Pressable style={[styles.actionBtn, styles.actionSecondary]}><Text style={styles.actionSecondaryText}>View Payslip</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingBottom: 24 },
  headerCard: { backgroundColor: '#090a1a', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: '#cbd5e1', fontSize: 14 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 2 },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  headerMenu: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerAvatar: { width: 28, height: 28, borderRadius: 14 },
  empId: { color: '#9ca3af', fontSize: 12 },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badgeDot: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeDotText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  sectionTitle: { marginTop: 14, marginBottom: 8, marginLeft: 16, fontSize: 14, fontWeight: '700', color: '#111827' },
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6 },
  metric: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 14, marginHorizontal: 6, alignItems: 'center' },
  metricHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  metricIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  metricIconLg: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricLabel: { color: '#6b7280', fontSize: 11, flexShrink: 1 },
  metricLabelCenter: { color: '#6b7280', fontSize: 11, textAlign: 'center' },
  metricValue: { color: '#111827', fontWeight: '700', fontSize: 16, marginTop: 8 },
  metricValueCenter: { color: '#111827', fontWeight: '700', fontSize: 16, marginTop: 6, textAlign: 'center' },

  activityCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 12, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, marginBottom: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  leftDotRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  actTitle: { color: '#111827' },
  actWhen: { color: '#6b7280', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },

  actionsRow: { flexDirection: 'row', paddingHorizontal: 12 },
  actionBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 4 },
  actionPrimary: { backgroundColor: '#0b0b1b' },
  actionPrimaryText: { color: '#fff', fontWeight: '700' },
  actionSecondary: { backgroundColor: '#f3f4f6' },
  actionSecondaryText: { color: '#111827', fontWeight: '700' },
});

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIconLg, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.metricLabelCenter} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
      <Text style={styles.metricValueCenter}>{value}</Text>
    </View>
  );
}

function ActivityRow({ iconColor, title, when }: { iconColor: string; title: string; when: string }) {
  return (
    <View style={styles.activityRow}>
      <View style={styles.leftDotRow}>
        <View style={[styles.dot, { backgroundColor: iconColor }]} />
        <Text style={styles.actTitle}>{title}</Text>
      </View>
      <Text style={styles.actWhen}>{when}</Text>
    </View>
  );
}


