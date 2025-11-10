import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

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
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>        
        <Pressable onPress={onOpenMenu} accessibilityRole="button" hitSlop={10} style={styles.headerLeft}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{(username?.trim?.()?.[0] || '?').toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Welcome Back</Text>
          <Text style={styles.headerSubtitle}>Guest</Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={10} style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingBottom: 28,
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: { paddingRight: 12 },
  headerCenter: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  headerSubtitle: { color: '#cbd5e1', fontSize: 13, marginTop: 0, fontWeight: '600' },
  headerRight: { paddingLeft: 12 },
});
