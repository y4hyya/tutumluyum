import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, borders, fonts, fontSizes, spacing } from '@/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned mono value, e.g. a formatted amount. */
  value?: string;
  valueTone?: 'ink' | 'alert' | 'positive' | 'muted';
  /** Extra element rendered under the value (e.g. a Badge). */
  right?: ReactNode;
  onPress?: () => void;
}

const VALUE_TONES = {
  ink: colors.ink,
  alert: colors.alert,
  positive: colors.positive,
  muted: colors.muted,
} as const;

/**
 * Dense list row with a hairline ink separator. Pressed state is a flat
 * accent flash — no ripple, no opacity fade.
 */
export function ListRow({ title, subtitle, value, valueTone = 'ink', right, onPress }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}>
      <View style={styles.left}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {value ? <Text style={[styles.value, { color: VALUE_TONES[valueTone] }]}>{value}</Text> : null}
        {right}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: borders.hair,
    borderBottomColor: colors.ink,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.accent,
  },
  left: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.body,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  value: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.body,
  },
});
