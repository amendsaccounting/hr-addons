import React from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  title: string;
  subtitle?: string;
  bgColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
  onLeftPress?: () => void;
  leftImageUri?: string | null;
  leftInitial?: string;
  rightIcon?: string;
  onRightPress?: () => void;
  tall?: boolean;
};

const AppHeader: React.FC<Props> = ({
  title,
  subtitle,
  bgColor = '#0b0b1b',
  statusBarStyle = 'light-content',
  onLeftPress,
  leftImageUri,
  leftInitial,
  rightIcon,
  onRightPress,
  tall,
}) => {
  (Ionicons as any)?.loadFont?.();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { backgroundColor: bgColor }]}>      
      <StatusBar barStyle={statusBarStyle} backgroundColor={bgColor} />
      <View style={{ height: insets.top, backgroundColor: bgColor }} />
      <View style={[styles.row, tall && { minHeight: 110, paddingBottom: 20 }]}>        
        <Pressable onPress={onLeftPress} accessibilityRole="button" hitSlop={10} style={styles.left}>
          {leftImageUri ? (
            <Image source={{ uri: leftImageUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{(leftInitial || '?').toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.center}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {!!subtitle && <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onRightPress} style={styles.right}>
          {!!rightIcon && <Ionicons name={rightIcon as any} size={24} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: { paddingRight: 12 },
  center: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' },
  right: { paddingLeft: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#cbd5e1', fontSize: 13, marginTop: 0, fontWeight: '600' },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default AppHeader;

