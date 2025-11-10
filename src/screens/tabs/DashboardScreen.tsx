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
  const [username, setUsername] = useState<string>('User');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('employeeData');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user) setUsername(String(parsed.user));
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>        
        <Pressable onPress={onOpenMenu} accessibilityRole="button" hitSlop={10} style={styles.headerLeft}>
          <Ionicons name="menu" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Welcome Back, {username}</Text>
        <Pressable accessibilityRole="button" hitSlop={10} style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: { paddingRight: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  headerRight: { paddingLeft: 12 },
});
