import { useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { colors, borders, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  style?: ViewStyle;
}

/**
 * Bordered mono input. Focus state is a flat color switch on the bottom edge
 * (ink → accent) — the edge is always 4px so nothing shifts.
 */
export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoFocus,
  autoCapitalize = 'none',
  onSubmitEditing,
  style,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const edgeColor = error ? colors.alert : focused ? colors.accent : colors.ink;

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { borderColor: error ? colors.alert : colors.ink, borderBottomColor: edgeColor },
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: borders.std,
    borderBottomWidth: borders.std * 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono,
    fontSize: fontSizes.h3,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.small,
    color: colors.alert,
    marginTop: spacing.xs,
  },
});
