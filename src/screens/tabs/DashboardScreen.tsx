import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
 
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';


type Props = {
  onOpenMenu?: () => void;
};

export default function DashboardScreen({ onOpenMenu }: Props) {
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
      <AppHeader
        title={`Welcome Back, ${username}`}
        subtitle="Guest"
        bgColor="#000"
        statusBarStyle="light-content"
        leftImageUri={profileImage}
        leftInitial={(username?.trim?.()?.[0] || '?').toUpperCase()}
        onLeftPress={onOpenMenu}
        rightIcon="notifications-outline"
        tall
      />

      <View style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  
});
