import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

type Props = {
  onOpenMenu?: () => void;
};

export default function DashboardScreen({ onOpenMenu }: Props) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState<string>('Guest');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('employeeData');
        if (raw) {
          const parsed = JSON.parse(raw);
          const name = parsed?.user;
          if (typeof name === 'string') {
            const trimmed = name.trim();
            const display = trimmed.length === 0 || trimmed.toLowerCase() === 'guest' ? 'Guest' : trimmed;
            setUsername(display);
          }
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>        
        <View style={styles.headerTopRow}>
          <Pressable onPress={onOpenMenu} accessibilityRole="button" hitSlop={10} style={styles.headerLeft}>
            <Ionicons name="menu" size={20} color="#fff" />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.headerGreeting}>Welcome Back</Text>
            <Text style={styles.headerUsername} numberOfLines={1}>{username}</Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={10} style={styles.headerRight}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </Pressable>
        </View>
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
    paddingBottom: 16,
    marginBottom: 12,
    minHeight: 56,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: { paddingRight: 12 },
  headerTitles: { flex: 1 },
  headerGreeting: { color: '#fff', fontSize: 16, opacity: 0.9 },
  headerUsername: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  headerRight: { paddingLeft: 12 },
});
