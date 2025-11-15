import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  FlatList,
  ListRenderItem,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { fetchEmployeeProfile, type ProfileView } from '../../services/profile';

type ProfileData = {
  name?: string | null;
  email?: string | null;
  employeeId?: string | null;
  image?: string | null;
  phone?: string | null;
  department?: string | null;
  joinDate?: string | null; 
  location?: string | null;
  role?: string | null; 
};

// Optimized memoized header
const HeaderCard = React.memo(function HeaderCard({
  imageSource,
  initials,
  name,
  role,
  empId,
}: {
  imageSource: any | null;
  initials: string;
  name: string;
  role: string;
  empId: string;
}) {
  return (
    <View style={styles.headerCard}>
      {imageSource ? (
        <Image source={imageSource} style={styles.headerAvatar} />
      ) : (
        <View style={styles.headerAvatarPlaceholder}>
          <Text style={styles.headerAvatarText}>{initials}</Text>
        </View>
      )}
      <View style={styles.headerTextCol}>
        <Text style={styles.headerName}>{name}</Text>
        <Text style={styles.headerRole}>{role}</Text>
        <Text style={styles.headerEmpId}>{empId}</Text>
      </View>
    </View>
  );
});

const InfoCard = React.memo(function InfoCard({
  email,
  phone,
  dept,
  joinDate,
  location,
}: {
  email: string; phone: string; dept: string; joinDate: string; location: string;
}) {
  return (
    <View style={styles.infoCard}>
      <DetailItem icon="mail-outline" label="Email" value={email} />
      <DetailItem icon="call-outline" label="Phone" value={phone} />
      <DetailItem icon="briefcase-outline" label="Department" value={dept} />
      <DetailItem icon="calendar-outline" label="Join Date" value={joinDate} />
      <DetailItem icon="location-outline" label="Location" value={location} />
    </View>
  );
});

const QuickCard = React.memo(function QuickCard({ items, onPress }: { items: Array<{ key: string; icon: string; label: string }>; onPress: (label: string) => void }) {
  return (
    <View style={styles.quickCard}>
      {items.map((q, idx) => (
        <QuickItem
          key={q.key}
          icon={q.icon as any}
          label={q.label}
          onPress={() => onPress(q.label)}
          first={idx === 0}
          last={idx === items.length - 1}
        />
      ))}
    </View>
  );
});

const LogoutButton = React.memo(function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.logoutBtn} onPress={onPress}>
      <Ionicons name="log-out-outline" size={18} color="#fff" />
      <Text style={styles.logoutText}>Logout</Text>
    </Pressable>
  );
});

export default function ProfileScreen() {
  (Ionicons as any)?.loadFont?.();

  const [profile, setProfile] = React.useState<ProfileData>({});

  console.log("profile====>",profile);
  

  React.useEffect(() => {
    (async () => {
      try {
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

        const eid = merged.employeeId || empIdKey || '';
        if (eid) {
          const remote = await fetchEmployeeProfile(eid);
          if (remote) {
            const next: ProfileData = {
              name: remote.name ?? merged.name,
              email: remote.email ?? merged.email,
              employeeId: remote.employeeId ?? merged.employeeId,
              image: remote.image ?? merged.image,
              phone: remote.phone ?? merged.phone,
              department: remote.department ?? merged.department,
              joinDate: remote.joinDate ?? merged.joinDate,
              location: remote.location ?? merged.location,
              role: remote.role ?? merged.role,
            };
            setProfile(next);
            try { await AsyncStorage.setItem('employeeData', JSON.stringify(remote)); } catch {}
          }
        }
      } catch {}
    })();
  }, []);

  const displayName = String(
    profile.name || profile.employeeId || (profile.email ? profile.email.split('@')[0] : '-') || '-'
  );
  const displayEmail = String(profile.email || '-');
  const displayEmpId = String(profile.employeeId || '-');
  const displayRole = String(profile.role || '-');
  const displayPhone = String(profile.phone || '-');
  const displayDept = String(profile.department || '-');
  const displayJoinDate = formatJoinDate(profile.joinDate) || '-';
  const displayLocation = String(profile.location || '-');

  const initials = React.useMemo(() => {
    const name = (profile.name || '').trim();
    if (name) return name[0].toUpperCase();
    const fallback = (profile.employeeId || profile.email || 'U').toString();
    return fallback[0]?.toUpperCase?.() || 'U';
  }, [profile.name, profile.employeeId, profile.email]);

  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove(['userEmail', 'employeeId', 'employeeData', 'username']);
      Alert.alert('Signed Out', 'Your local session has been cleared.');
    } catch (e) {
      Alert.alert('Error', 'Could not sign out. Please try again.');
    }
  };

  // Prepare FlatList rows to virtualize screen while keeping design
  const quickLinks = React.useMemo(() => ([
    { key: 'ql-personal', icon: 'person-outline', label: 'Personal Information' },
    { key: 'ql-payslips', icon: 'pricetags-outline', label: 'Payslips' },
    { key: 'ql-calendar', icon: 'calendar-outline', label: 'My Calendar' },
    { key: 'ql-docs', icon: 'document-text-outline', label: 'Documents' },
    { key: 'ql-settings', icon: 'settings-outline', label: 'Settings' },
  ]), []);

  type Row =
    | { type: 'header'; key: string }
    | { type: 'info'; key: string }
    | { type: 'quick-title'; key: string }
    | { type: 'quick-card'; key: string }
    | { type: 'logout'; key: string };

  const rows: Row[] = React.useMemo(() => ([
    { type: 'header', key: 'header' },
    { type: 'info', key: 'info' },
    { type: 'quick-title', key: 'quick-title' },
    { type: 'quick-card', key: 'quick-card' },
    { type: 'logout', key: 'logout' },
  ]), []);

  // Compute image source once with minimal churn
  const imageSource = React.useMemo(() => {
    const src = String(profile.image || '');
    if (!src) return null;
    const apiKey = (Config as any).ERP_APIKEY || (Config as any).ERP_API_KEY || '';
    const apiSecret = (Config as any).ERP_SECRET || (Config as any).ERP_API_SECRET || '';
    const host = ((Config as any).ERP_URL_METHOD || (Config as any).ERP_URL_RESOURCE || '').replace(/\/api\/(method|resource)$/i, '');
    const needsAuth = !!src && host && src.startsWith(host) && src.includes('/private/');
    return needsAuth ? ({ uri: src, headers: { Authorization: `token ${apiKey}:${apiSecret}` } } as any)
                     : ({ uri: src } as any);
  }, [profile.image]);

  const onQuickPress = React.useCallback((label: string) => Alert.alert(label, 'Coming soon.'), []);

  const renderItem: ListRenderItem<Row> = React.useCallback(({ item }) => {
    switch (item.type) {
      case 'header':
        return (
          <HeaderCard
            imageSource={imageSource}
            initials={initials}
            name={displayName}
            role={displayRole}
            empId={displayEmpId}
          />
        );
      case 'info':
        return (
          <InfoCard
            email={displayEmail}
            phone={displayPhone}
            dept={displayDept}
            joinDate={displayJoinDate}
            location={displayLocation}
          />
        );
      case 'quick-title':
        return <Text style={styles.quickTitle}>Quick Links</Text>;
      case 'quick-card':
        return <QuickCard items={quickLinks} onPress={onQuickPress} />;
      case 'logout':
        return <LogoutButton onPress={signOut} />;
      default:
        return null;
    }
  }, [imageSource, initials, displayName, displayRole, displayEmpId, displayEmail, displayPhone, displayDept, displayJoinDate, displayLocation, quickLinks, onQuickPress, signOut]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#090a1a" />
      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
      />
    </>
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
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
    marginBottom: 14,
  },
  headerTextCol: { flex: 1, marginLeft: 12 },
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
  headerName: { color: '#fff', fontWeight: '700', marginTop: 0 },
  headerRole: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  headerEmpId: { color: '#9ca3af', fontSize: 11, marginTop: 2 },

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
