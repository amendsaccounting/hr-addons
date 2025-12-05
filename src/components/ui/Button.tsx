import * as React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { colors, radii, spacing } from '../../styles/theme';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export default function Button({ title, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? colors.primary : colors.gray100;
  const border = isPrimary ? 'transparent' : colors.gray300;
  const textColor = isPrimary ? colors.white : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.9 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: spacing.md,
  },
  text: { fontWeight: '700' },
});
