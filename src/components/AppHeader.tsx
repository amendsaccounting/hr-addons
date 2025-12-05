import * as React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, ViewStyle, TextStyle, ImageSourcePropType, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import { back as BackImage } from '../assets/images';

type RightItem =
  | { type: 'bell'; onPress?: () => void; badgeCount?: number }
  | { type: 'avatar'; onPress?: () => void; uri?: string; source?: ImageSourcePropType; label?: string }
  | { type: 'custom'; element: React.ReactNode };

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightItems?: RightItem[];
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  bottomBorder?: boolean;
  variant?: 'light' | 'dark';
  backgroundColor?: string;
};

export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightItems = [
    { type: 'bell' },
    { type: 'avatar' },
  ],
  containerStyle,
  titleStyle,
  subtitleStyle,
  bottomBorder = true,
  variant = 'light',
  backgroundColor,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = variant === 'dark';
  const bg = backgroundColor || (isDark ? '#1a1f36' : '#ffffff');
  const titleColor = isDark ? '#ffffff' : '#111827';
  const subtitleColor = isDark ? '#cbd5e1' : '#6b7280';
  const iconColor = isDark ? '#ffffff' : '#111827';
  const ringColor = isDark ? 'rgba(255,255,255,0.2)' : '#e5e7eb';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top, backgroundColor: bg },
        bottomBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
        containerStyle,
      ]}
    >
      <StatusBar animated barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />
      <View style={styles.row}>
        <View style={styles.leftRow}>
          {showBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backPlain}
            >
              <Image source={BackImage as any} style={[styles.backImage, { tintColor: iconColor }]} />
            </Pressable>
          )}
          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: titleColor }, titleStyle]} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: subtitleColor }, subtitleStyle]} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightRow}>
          {rightItems?.map((item, idx) => {
            if (item.type === 'bell') {
              return (
                <Pressable
                  key={`bell-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  onPress={item.onPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.iconPlain, { marginLeft: idx === 0 ? 0 : 16 }]}
                >
                  <Ionicons name="notifications-outline" size={20} color={iconColor} />
                  {item.badgeCount ? (
                    <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(99, item.badgeCount)}</Text></View>
                  ) : null}
                </Pressable>
              );
            }
            if (item.type === 'avatar') {
              const avatar = item.source || (item.uri ? { uri: item.uri } : undefined);
              return (
                <Pressable
                  key={`avatar-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel="Profile"
                  onPress={item.onPress}
                  style={[
                    styles.iconBtn,
                    { marginLeft: idx === 0 ? 0 : 16, borderColor: ringColor, backgroundColor: isDark ? 'transparent' : '#fff' },
                  ]}
                >
                  {avatar ? (
                    <Image source={avatar} style={styles.avatar} />
                  ) : (item.label ? (
                    <Text style={[styles.avatarInitial, { color: iconColor }]}>{String(item.label).slice(0,1).toUpperCase()}</Text>
                  ) : (
                    <Ionicons name="person-outline" size={18} color={iconColor} />
                  ))}
                </Pressable>
              );
            }
            return <View key={`custom-${idx}`} style={styles.customWrap}>{item.element}</View>;
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
  },
  row: {
    height: Platform.OS === 'ios' ? 56 : 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  titleBox: { marginLeft: 10, flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rightRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backPlain: { paddingHorizontal: 4, paddingVertical: 6, marginRight: 4 },
  backImage: { width: 20, height: 20, resizeMode: 'contain' },
  iconPlain: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 22, height: 22, borderRadius: 11 },
  avatarInitial: { fontSize: 12, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  customWrap: { marginLeft: 16 },
});
