import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, borders, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

type BadgeTone = 'ink' | 'accent' | 'alert' | 'positive' | 'muted';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
}

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  ink: { bg: colors.ink, fg: colors.paper, border: colors.ink },
  accent: { bg: colors.accent, fg: colors.ink, border: colors.ink },
  alert: { bg: colors.alert, fg: colors.paper, border: colors.ink },
  positive: { bg: colors.positive, fg: colors.ink, border: colors.ink },
  muted: { bg: colors.surface, fg: colors.muted, border: colors.muted },
};

export function Badge({ label, tone = 'ink', style }: BadgeProps) {
  const t = TONE_STYLES[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: borders.std,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.tiny,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
});
