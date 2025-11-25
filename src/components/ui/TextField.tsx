import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, radii, spacing } from '../../styles/theme';

type Props = TextInputProps & {
  label?: string;
  leftIcon?: string;
  errorText?: string | null;
  onPress?: () => void; // Optional press handler to make field behave like a picker
};

export default function TextField({ label, leftIcon, errorText, style, onPress, ...inputProps }: Props) {
  const Row: any = onPress ? Pressable : View;
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Row style={styles.inputRow} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}>
        {leftIcon ? (
          <Ionicons name={leftIcon as any} size={16} color={colors.textMuted} style={styles.leftIcon} />
        ) : null}
        <TextInput
          style={[styles.input, style as any]}
          placeholderTextColor={colors.textMuted}
          editable={onPress ? false : inputProps.editable}
          pointerEvents={onPress ? 'none' as any : undefined}
          {...inputProps}
        />
      </Row>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    backgroundColor: colors.gray100,
    height: 44,
  },
  leftIcon: { marginLeft: spacing.lg, marginRight: spacing.sm, color: colors.textMuted },
  input: { flex: 1, paddingHorizontal: spacing.sm, color: colors.text },
  errorText: { color: colors.error, marginTop: spacing.xs },
});
