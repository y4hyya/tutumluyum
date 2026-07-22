import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

interface StatBlockProps {
  label: string;
  value: string;
  /** Secondary line under the value (delta, count, explanation). */
  sub?: string;
  tone?: 'ink' | 'alert' | 'positive';
  size?: 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

const VALUE_SIZES = { md: fontSizes.big, lg: fontSizes.display, xl: 56 } as const;

const TONES = { ink: colors.ink, alert: colors.alert, positive: colors.positive } as const;

/**
 * Section label + a genuinely large Space Mono number. The workhorse of the
 * dashboard and the subscriptions screen.
 */
export function StatBlock({ label, value, sub, tone = 'ink', size = 'lg', style }: StatBlockProps) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.value, { fontSize: VALUE_SIZES[size], color: TONES[tone] }]}>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fonts.monoBold,
    color: colors.ink,
  },
  sub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
