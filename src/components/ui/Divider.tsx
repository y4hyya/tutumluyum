import { View } from 'react-native';

import { colors, borders, spacing } from '@/theme';

interface DividerProps {
  /** 3px section divider instead of the standard 2px. */
  thick?: boolean;
  /** Vertical margin around the bar. */
  gap?: number;
}

export function Divider({ thick = false, gap = spacing.lg }: DividerProps) {
  return (
    <View
      style={{
        height: thick ? borders.thick : borders.std,
        backgroundColor: colors.ink,
        marginVertical: gap,
      }}
    />
  );
}
