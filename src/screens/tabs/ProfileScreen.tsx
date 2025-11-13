import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileData = {
  name?: string | null;
  email?: string | null;
  employeeId?: string | null;
  image?: string | null;
  phone?: string | null;
  department?: string | null;
  joinDate?: string | null; // ISO or display string
  location?: string | null;
  role?: string | null; // designation/title
};

export default function ProfileScreen() {
  (Ionicons as any)?.loadFont?.();

  const [profile, setProfile] = React.useState<ProfileData>({});

  React.useEffect(() => {
    (async () => {
      try {
        // Preferred: a consolidated object if present
        const raw = await AsyncStorage.getItem('employeeData');
        let fromObj: ProfileData = {};
        if (raw) {
          try {
            const obj = JSON.parse(raw);
            fromObj = {
              name: obj?.full_name || obj?.name || obj?.user || null,
              email: obj?.email || obj?.company_email || obj?.personal_email || null,
              employeeId: obj?.name || obj?.employee || obj?.employee_id || null,
              image: obj?.profileImage || obj?.image || obj?.photoURL || obj?.avatar || null,
              phone: obj?.phone || obj?.mobile_no || obj?.cell_number || null,
              department: obj?.department || null,
              joinDate: obj?.date_of_joining || obj?.doj || null,
              location: obj?.location || obj?.branch || obj?.office || null,
              role: obj?.designation || obj?.title || null,
            };
          } catch {}
        }

        // Fallbacks from individual keys written by login/registration flows
        const [emailKey, empIdKey, usernameKey, phoneKey] = await Promise.all([
          AsyncStorage.getItem('userEmail'),
          AsyncStorage.getItem('employeeId'),
          AsyncStorage.getItem('username'),
          AsyncStorage.getItem('phoneNumber'),
        ]);

        const nameGuess = fromObj.name || usernameKey || (emailKey ? emailKey.split('@')[0] : null);
        const merged: ProfileData = {
          name: nameGuess || null,
          email: fromObj.email || emailKey || null,
          employeeId: fromObj.employeeId || empIdKey || null,
          image: fromObj.image || null,
          phone: fromObj.phone || phoneKey || null,
          department: fromObj.department || null,
          joinDate: fromObj.joinDate || null,
          location: fromObj.location || null,
          role: fromObj.role || null,
        };
        setProfile(merged);
      } catch {}
    })();
  }, []);

  const displayName = String(profile.name || 'John Doe');
  const displayEmail = String(profile.email || 'john.doe@company.com');
  const displayEmpId = String(profile.employeeId || 'EMP-2024-001');
  const displayRole = String(profile.role || 'Senior Software Engineer');
  const displayPhone = String(profile.phone || '+1 234-567-8900');
  const displayDept = String(profile.department || 'Engineering');
  const displayJoinDate = formatJoinDate(profile.joinDate) || 'Jan 15, 2022';
  const displayLocation = String(profile.location || 'New York Office');

  const initials = React.useMemo(() => {
    const src = (profile.name || profile.email || 'U').toString();
    const parts = src
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : src[0];
    return letters.toUpperCase();
  }, [profile.name, profile.email]);

  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove(['userEmail', 'employeeId', 'employeeData', 'username']);
      Alert.alert('Signed Out', 'Your local session has been cleared.');
    } catch (e) {
      Alert.alert('Error', 'Could not sign out. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        {profile.image ? (
          <Image source={{ uri: profile.image }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
        )}
        <Text style={styles.headerName}>{displayName}</Text>
        <Text style={styles.headerRole}>{displayRole}</Text>
        <Text style={styles.headerEmpId}>{displayEmpId}</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <DetailItem icon="mail-outline" label="Email" value={displayEmail} />
        <DetailItem icon="call-outline" label="Phone" value={displayPhone} />
        <DetailItem icon="briefcase-outline" label="Department" value={displayDept} />
        <DetailItem icon="calendar-outline" label="Join Date" value={displayJoinDate} />
        <DetailItem icon="location-outline" label="Location" value={displayLocation} />
      </View>

      {/* Quick Links */}
      <Text style={styles.quickTitle}>Quick Links</Text>
      <View style={styles.quickCard}>
        <QuickItem
          icon="person-outline"
          label="Personal Information"
          onPress={() => Alert.alert('Personal Information', 'Coming soon.')}
          first
        />
        <QuickItem
          icon="pricetags-outline"
          label="Payslips"
          onPress={() => Alert.alert('Payslips', 'Coming soon.')}
        />
        <QuickItem
          icon="calendar-outline"
          label="My Calendar"
          onPress={() => Alert.alert('My Calendar', 'Coming soon.')}
        />
        <QuickItem
          icon="document-text-outline"
          label="Documents"
          onPress={() => Alert.alert('Documents', 'Coming soon.')}
        />
        <QuickItem
          icon="settings-outline"
          label="Settings"
          onPress={() => Alert.alert('Settings', 'Coming soon.')}
          last
        />
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function DetailItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.DetailItem}>
      <Ionicons name={icon as any} size={18} color="#6b7280" style={styles.detailIcon} />
      <View style={styles.detailTextRow}>
        <Text style={styles.detailLabelInline}>{label}</Text>
        <Text numberOfLines={1} style={styles.detailValueInline}>{value || '-'}</Text>
      </View>
    </View>
  );
}

function QuickItem({ icon, label, onPress, first, last }: { icon: string; label: string; onPress: () => void; first?: boolean; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickItem,
        first && styles.quickItemFirst,
        last && styles.quickItemLast,
      ]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={18} color="#111827" style={{ width: 22 }} />
        <Text style={styles.quickItemText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6b7280" />
    </Pressable>
  );
}

function formatJoinDate(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(raw);
  }
}

const styles = StyleSheet.create({
  container: { padding: 0, paddingBottom: 24 },
  headerCard: {
    backgroundColor: '#090a1a',
    borderRadius: 0,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  headerAvatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#111827' },
  headerAvatarPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerName: { color: '#fff', fontWeight: '700', marginTop: 10, textAlign: 'center', width: '100%' },
  headerRole: { color: '#cbd5e1', fontSize: 12, marginTop: 4, textAlign: 'center', width: '100%' },
  headerEmpId: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'center', width: '100%' },

  // Info card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    marginHorizontal:12,
    marginVertical: 10,
  },
  DetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  detailIcon: { width: 22, marginRight: 10 },
  detailLabel: { color: '#6b7280', fontSize: 11, marginBottom: 4 },
  detailValue: { color: '#111827', fontWeight: '600' },
  // New inline label/value layout
  detailTextRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabelInline: { color: '#6b7280', fontSize: 12, marginRight: 10 },
  detailValueInline: { color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  // Quick links
  quickTitle: { marginTop: 14, marginBottom: 8, color: '#374151', fontWeight: '700', paddingHorizontal: 12 },
  quickCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  quickItem: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  quickItemFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  quickItemLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 0 },
  quickItemText: { marginLeft: 8, color: '#111827', fontWeight: '600' },

  // Logout button
  logoutBtn: {
    marginTop: 12,
    marginHorizontal: 15,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
});
