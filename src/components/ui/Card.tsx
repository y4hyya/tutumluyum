import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, borders, spacing } from '@/theme';

import { HardShadow } from './HardShadow';

interface CardProps {
  children: ReactNode;
  /** 3px border for primary containers instead of the standard 2px. */
  thick?: boolean;
  /** Disable the hard offset shadow (e.g. for nested cards). */
  flat?: boolean;
  /** Left edge color bar, e.g. alert for subscription findings. */
  edge?: string;
  padding?: number;
  style?: ViewStyle;
}

export function Card({
  children,
  thick = false,
  flat = false,
  edge,
  padding = spacing.lg,
  style,
}: CardProps) {
  const face = (
    <View
      style={[
        styles.face,
        { borderWidth: thick ? borders.thick : borders.std, padding },
        edge ? { borderLeftWidth: spacing.sm, borderLeftColor: edge } : null,
      ]}>
      {children}
    </View>
  );

  if (flat) {
    return <View style={style}>{face}</View>;
  }
  return <HardShadow style={style}>{face}</HardShadow>;
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: colors.surface,
    borderColor: colors.ink,
  },
});
