import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

type ProfileData = {
  name: string;
  position: string;
  employeeId: string;
  email: string;
  phone: string;
  department: string;
  joinDate: string; // display-ready
  location: string;
  avatarUrl?: string | null;
};

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] || '';
  if (!local) return 'Guest';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export default function ProfileScreen() {
  const [data, setData] = useState<ProfileData>({
    name: 'John Doe',
    position: 'Software Engineer',
    employeeId: 'EMP12345',
    email: 'john.doe@example.com',
    phone: '+1 555 0182',
    department: 'Engineering',
    joinDate: '15 Jan 2023',
    location: 'New York, USA',
    avatarUrl: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('employeeData');
        if (raw) {
          const parsed: any = JSON.parse(raw);
          const user = parsed?.user || '';
          const email: string = typeof parsed?.email === 'string' ? parsed.email : (user.includes('@') ? user : '');
          const name: string = typeof parsed?.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim() : (email ? deriveNameFromEmail(email) : 'John Doe');
          const position: string = typeof parsed?.position === 'string' && parsed.position.trim().length > 0 ? parsed.position.trim() : (typeof parsed?.designation === 'string' && parsed.designation.trim().length > 0 ? parsed.designation.trim() : 'Software Engineer');
          const employeeId: string = typeof parsed?.employeeId === 'string' && parsed.employeeId.trim().length > 0 ? parsed.employeeId.trim() : 'EMP12345';
          const phone: string = typeof parsed?.phone === 'string' && parsed.phone.trim().length > 0 ? parsed.phone.trim() : (typeof parsed?.mobile_no === 'string' && parsed.mobile_no.trim().length > 0 ? parsed.mobile_no.trim() : '+1 555 0182');
          const department: string = typeof parsed?.department === 'string' && parsed.department.trim().length > 0 ? parsed.department.trim() : (typeof parsed?.dept === 'string' && parsed.dept.trim().length > 0 ? parsed.dept.trim() : 'Engineering');
          const joinDateRaw: string = (typeof parsed?.joinDate === 'string' && parsed.joinDate) || (typeof parsed?.date_of_joining === 'string' && parsed.date_of_joining) || '';
          const location: string = typeof parsed?.location === 'string' && parsed.location.trim().length > 0 ? parsed.location.trim() : (typeof parsed?.city === 'string' && parsed.city.trim().length > 0 ? parsed.city.trim() : 'New York, USA');
          let joinDate = '15 Jan 2023';
          if (joinDateRaw) {
            const d = new Date(joinDateRaw);
            if (!isNaN(d.getTime())) {
              const fmt = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
              joinDate = fmt.replace(/\./g, '');
            }
          }
          const avatarUrl: string | null = typeof parsed?.avatarUrl === 'string' && parsed.avatarUrl.trim().length > 0 ? parsed.avatarUrl.trim() : null;
          setData({ name, position, employeeId, email: email || 'john.doe@example.com', phone, department, joinDate, location, avatarUrl });
        }
      } catch {}
    })();
  }, []);

  const onPlaceholder = (label: string) => Alert.alert(label, 'Navigation not configured yet');
  const onLogout = async () => {
    try { await AsyncStorage.removeItem('employeeData'); } catch {}
    Alert.alert('Logout', 'You have been logged out.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            {data.avatarUrl ? (
              <Image source={{ uri: data.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={40} color="#0b6dff" />
            )}
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.name} numberOfLines={1}>{data.name}</Text>
            <Text style={styles.position} numberOfLines={1}>{data.position}</Text>
            <View style={styles.idRow}>
              <Ionicons name="id-card-outline" size={14} color="#eee" style={styles.rowIcon} />
              <Text style={styles.idText}>{data.employeeId}</Text>
            </View>
          </View>
        </View>
      </View>

        <View style={styles.infoSection}>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#111" style={styles.infoIcon} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{data.email}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#111" style={styles.infoIcon} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{data.phone}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { marginTop: 12 }]}>
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={18} color="#111" style={styles.infoIcon} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{data.department}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#111" style={styles.infoIcon} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Join Date</Text>
                <Text style={styles.infoValue}>{data.joinDate}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#111" style={styles.infoIcon} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{data.location}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>Quick Links</Text>

          <View style={styles.quickGrid}>
            <Pressable style={styles.quickTile} onPress={() => onPlaceholder('Personal Information')}>
              <Ionicons name="person-outline" size={22} color="#111" />
              <Text style={styles.quickTileLabel}>Personal Info</Text>
            </Pressable>
            <Pressable style={styles.quickTile} onPress={() => onPlaceholder('Payslips')}>
              <Ionicons name="wallet-outline" size={22} color="#111" />
              <Text style={styles.quickTileLabel}>Payslips</Text>
            </Pressable>
            <Pressable style={styles.quickTile} onPress={() => onPlaceholder('My Calendar')}>
              <Ionicons name="calendar-clear-outline" size={22} color="#111" />
              <Text style={styles.quickTileLabel}>My Calendar</Text>
            </Pressable>
            <Pressable style={styles.quickTile} onPress={() => onPlaceholder('Documents')}>
              <Ionicons name="document-text-outline" size={22} color="#111" />
              <Text style={styles.quickTileLabel}>Documents</Text>
            </Pressable>
            <Pressable style={styles.quickTile} onPress={() => onPlaceholder('Settings')}>
              <Ionicons name="settings-outline" size={22} color="#111" />
              <Text style={styles.quickTileLabel}>Settings</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.logoutBtn} onPress={onLogout} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  headerBlock: {
    alignItems: 'flex-start',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111',
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  headerTextWrap: { marginLeft: 16 },
  name: { fontSize: 18, fontWeight: '700', color: '#fff' },
  position: { fontSize: 14, color: '#eee', marginTop: 6 },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowIcon: { marginRight: 6 },
  idText: { fontSize: 13, color: '#eee' },
  infoSection: { paddingHorizontal: 20, paddingVertical: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee', paddingHorizontal: 12, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  infoIcon: { marginRight: 12, marginTop: 2 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#666' },
  infoValue: { fontSize: 14, color: '#111', marginTop: 2 },
  quickSection: { paddingHorizontal: 20, paddingTop: 8 },
  quickTitle: { fontSize: 12, color: '#666', marginBottom: 6 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickTile: { width: '48%', backgroundColor: '#f7f7f8', paddingVertical: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  quickTileLabel: { marginTop: 6, fontSize: 13, color: '#111' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee', padding: 12 },
  logoutBtn: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
