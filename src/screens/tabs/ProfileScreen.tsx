import * as React from 'react';
import { useState, useCallback,useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, FlatList, ListRenderItem } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/AppHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { logoutSession } from '../../services/authentication';
import { clearSessionSidCookie } from '../../services/secureStore';
import { requestLogout } from '../../services/session';
import { fetchEmployeeProfile, type ProfileView } from '../../services/profile';

type Props = {
  onBack?: () => void;
  name?: string;
  avatarSource?: any | null;
};

export default function ProfileScreen({ onBack, name = 'Nijin Joy', avatarSource = null }: Props) {
  (Ionicons as any)?.loadFont?.();
  const [displayName, setDisplayName] = useState<string>(name);
  const [displayAvatar, setDisplayAvatar] = useState<any | null>(avatarSource);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  useEffect(() => { setDisplayName(name); }, [name]);
  useEffect(() => { setDisplayAvatar(avatarSource); }, [avatarSource]);
  useEffect(() => {
    // If missing avatar/name, try fetch via employeeId
    (async () => {
      try {
        const AsyncStorageMod = require('@react-native-async-storage/async-storage').default;
        const storedName = await AsyncStorageMod.getItem('userFullName');
        let storedImg = await AsyncStorageMod.getItem('userImage');
        if (storedName && !name) setDisplayName(storedName);
        // Make absolute URL if needed
        try {
          const Config = require('react-native-config').default || require('react-native-config');
          const hostSrc = (Config?.ERP_URL_METHOD || Config?.ERP_METHOD_URL || Config?.ERP_URL_RESOURCE || Config?.ERP_URL || '').replace(/\/$/, '');
          const host = hostSrc.replace(/\/api\/(resource|method)$/i, '');
          if (storedImg && storedImg.startsWith('/')) storedImg = host + storedImg;
        } catch {}
        if (storedImg && !avatarSource) setDisplayAvatar({ uri: storedImg });
        if (!storedName || !storedImg) {
          const id = await AsyncStorageMod.getItem('employeeId');
          if (id) {
            const view = await fetchEmployeeProfile(id);
            if (view) {
              setProfile(view);
              if (!storedImg && view.image && !avatarSource) setDisplayAvatar({ uri: view.image });
              if (!storedName && view.name && !name) setDisplayName(view.name);
            }
          }
        }
      } catch {}
    })();
  }, []);

  type Row =
    | { type: 'profile-head'; key: string }
    | { type: 'list-card-1'; key: string }
    | { type: 'list-card-2'; key: string }
    | { type: 'logout'; key: string };

  const rows: Row[] = [
    { type: 'profile-head', key: 'profile-head' },
    { type: 'list-card-1', key: 'list-card-1' },
    { type: 'list-card-2', key: 'list-card-2' },
    { type: 'logout', key: 'logout' },
  ];

  // Bottom sheet modal state
  const [sheet, setSheet] = useState<{ visible: boolean; section: 'employee' | 'company' | 'contact' | 'salary' | null }>({ visible: false, section: null });
  const openSheet = useCallback((section: 'employee' | 'company' | 'contact' | 'salary') => setSheet({ visible: true, section }), []);
  const closeSheet = useCallback(() => setSheet({ visible: false, section: null }), []);

  const renderItem: ListRenderItem<Row> = useCallback(({ item }) => {
    switch (item.type) {
      case 'profile-head':
        return (
          <View style={styles.profileHead}>
            {displayAvatar ? (
              <Image source={displayAvatar} style={styles.avatarLg} />
            ) : (
              <View style={styles.avatarLgPlaceholder}>
                <Text style={styles.avatarLgText}>{(displayName[0] || 'U').toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.profileName}>{displayName}</Text>
          </View>
        );
      case 'list-card-1':
        return (
          <View style={styles.card}>
            <NavRow icon="person-outline" label="Employee Details" onPress={() => openSheet('employee')} first />
            <NavRow icon="briefcase-outline" label="Company Information" onPress={() => openSheet('company')} />
            <NavRow icon="document-text-outline" label="Contact Information" onPress={() => openSheet('contact')} />
            <NavRow icon="cash-outline" label="Salary Information" onPress={() => openSheet('salary')} last />
          </View>
        );
      case 'list-card-2':
        return (
          <View style={styles.card}>
            <NavRow icon="settings-outline" label="Settings" onPress={() => {}} first last />
          </View>
        );
      case 'logout':
        return <LogoutButton onPress={() => {
          Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => {
              try {
                console.log('[profile] logout confirmed');
                const ok = await logoutSession();
                await clearSessionSidCookie();
                try {
                  await AsyncStorage.removeItem('userEmail');
                  await AsyncStorage.removeItem('employeeId');
                  await AsyncStorage.removeItem('userFullName');
                  await AsyncStorage.removeItem('userImage');
                  await AsyncStorage.removeItem('userId');
                } catch {}
                try { console.log('[profile] logoutSession result:', ok); } catch {}
              } catch (e: any) {
                console.log('[profile] logout error', e?.message || e);
              } finally {
                onBack?.();
                requestLogout();
              }
            }},
          ]);
        }} />;
      default:
        return null;
    }
  }, [avatarSource, name]);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Profile"
        showBack
        onBack={onBack}
        rightItems={[]}
        bottomBorder
        variant="dark"
      />

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
      />

      <BottomSheet
        visible={sheet.visible}
        title={sheet.section === 'employee' ? 'Employee Details'
              : sheet.section === 'company' ? 'Company Information'
              : sheet.section === 'contact' ? 'Contact Information'
              : sheet.section === 'salary' ? 'Salary Information'
              : ''}
        onClose={closeSheet}
      >
        {sheet.section === 'employee' && (
          <>
            <KVRow label="Employee ID" value={profile?.employeeId || null} />
            <KVRow label="Name" value={profile?.name || displayName} />
            <KVRow label="Department" value={profile?.department || null} />
            <KVRow label="Designation" value={profile?.role || null} />
            <KVRow label="Join Date" value={formatJoinDate(profile?.joinDate || null)} />
          </>
        )}
        {sheet.section === 'company' && (
          <>
            <KVRow label="Company" value={profile?.company || null} />
            <KVRow label="Department" value={profile?.department || null} />
            <KVRow label="Designation" value={profile?.role || null} />
            <KVRow label="Branch" value={profile?.location || null} />
            <KVRow label="Grade" value={profile?.grade || null} />
            <KVRow label="Reports to" value={profile?.reportsTo || null} />
            <KVRow label="Employment Type" value={profile?.employmentType || null} />
          </>
        )}
        {sheet.section === 'contact' && (
          <>
            <KVRow label="Email" value={profile?.email || null} />
            <KVRow label="Phone" value={profile?.phone || null} />
            <KVRow label="Location" value={profile?.location || null} />
          </>
        )}
        {sheet.section === 'salary' && (
          <>
            <KVRow label="Currency" value={undefined} />
            <KVRow label="Payment Mode" value={undefined} />
            <KVRow label="Last Revised" value={undefined} />
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function NavRow({ icon, label, onPress, first, last }: { icon: string; label: string; onPress: () => void; first?: boolean; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
      ]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={18} color="#111827" style={{ width: 22 }} />
        <Text style={styles.rowText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6b7280" />
    </Pressable>
  );
}

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.logoutBtn} onPress={onPress}>
      <Ionicons name="log-out-outline" size={18} color="#ef4444" />
      <Text style={styles.logoutText}>Log Out</Text>
    </Pressable>
  );
}

// Bottom sheet components
function BottomSheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new (require('react-native').Animated.Value)(0)).current;
  const opacity = useRef(new (require('react-native').Animated.Value)(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    const { Animated, Dimensions, Easing } = require('react-native');
    const h = Dimensions.get('window').height;
    if (visible) {
      try { (translateY as any).stopAnimation?.(); (opacity as any).stopAnimation?.(); } catch {}
      translateY.setValue(h);
      opacity.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.25, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
    } else if (mounted) {
      try { (translateY as any).stopAnimation?.(); (opacity as any).stopAnimation?.(); } catch {}
      Animated.parallel([
        Animated.timing(translateY, { toValue: h, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible, mounted, translateY, opacity]);

  if (!mounted) return null;
  const { Animated } = require('react-native');
  return (
    <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 200 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity }]} />
      </Pressable>
      <Animated.View style={[styles.sheetWrap, { transform: [{ translateY }] }] }>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <View style={styles.sheetDivider} />
        <View>{children}</View>
      </Animated.View>
    </View>
  );
}

function KVRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value?.toString?.() || '-'}</Text>
    </View>
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
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  listContent: { paddingBottom: 24, paddingTop: 16 },
  profileHead: { alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#111827' },
  avatarLgPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: { color: '#fff', fontWeight: '700', fontSize: 22 },
  profileName: { marginTop: 8, marginBottom: 8, color: '#111827', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginHorizontal: 12,
    marginTop: 12,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  rowLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 0 },
  rowText: { marginLeft: 8, color: '#111827', fontWeight: '600' },
  logoutBtn: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: { color: '#ef4444', fontWeight: '700', marginLeft: 8 },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 8,
  },
  sheetTitle: { alignSelf: 'center', fontWeight: '700', color: '#111827', marginBottom: 8 },
  sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee', marginBottom: 4 },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  kvLabel: { color: '#6b7280' },
  kvValue: { color: '#111827', fontWeight: '600' },
});
