import { useState } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, borders, fonts, fontSizes, letterSpacing, shadowOffset, spacing } from '@/theme';

import { HardShadow } from './HardShadow';

type ButtonVariant = 'primary' | 'accent' | 'danger' | 'positive' | 'outline';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; fg: string }> = {
  primary: { bg: colors.ink, fg: colors.paper },
  accent: { bg: colors.accent, fg: colors.ink },
  danger: { bg: colors.alert, fg: colors.paper },
  positive: { bg: colors.positive, fg: colors.ink },
  outline: { bg: colors.surface, fg: colors.ink },
};

const SIZE_STYLES = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: fontSizes.small },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: fontSizes.h3 },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, fontSize: fontSizes.h2 },
} as const;

/**
 * Solid fill, thick border, hard offset shadow. On press the shadow collapses
 * to 0,0 and the face translates by (+4,+4) — the button physically "sits
 * down". No easing, no opacity change.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const { bg, fg } = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const down = pressed && !disabled;

  return (
    <HardShadow disabled={down || disabled} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.face,
          {
            backgroundColor: disabled ? colors.paper : bg,
            paddingVertical: sizeStyle.paddingVertical,
            paddingHorizontal: sizeStyle.paddingHorizontal,
          },
          down && { transform: [{ translateX: shadowOffset }, { translateY: shadowOffset }] },
        ]}>
        <Text
          style={[
            styles.label,
            { color: disabled ? colors.muted : fg, fontSize: sizeStyle.fontSize },
          ]}>
          {label}
        </Text>
      </Pressable>
    </HardShadow>
  );
}

const styles = StyleSheet.create({
  face: {
    borderWidth: borders.std,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.heading,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.heading,
  },
});
