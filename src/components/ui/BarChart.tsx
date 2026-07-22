import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, borders, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Flat fill color; defaults to ink. */
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  /** Formats the raw value for the right column (e.g. formatLira). */
  formatValue: (value: number) => string;
  /** Index rendered with an accent bar (e.g. selected category). */
  highlightIndex?: number;
}

const BAR_HEIGHT = 22;

/**
 * Horizontal bar chart, hand-built from flat SVG rectangles with ink borders.
 * No curves, no fills with alpha, no animation.
 */
export function BarChart({ data, formatValue, highlightIndex }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.root}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0);
        const fill = i === highlightIndex ? colors.accent : (d.color ?? colors.ink);
        return (
          <View key={`${d.label}-${i}`} style={styles.row}>
            <View style={styles.rowHead}>
              <Text numberOfLines={1} style={styles.label}>
                {d.label}
              </Text>
              <Text style={styles.value}>{formatValue(d.value)}</Text>
            </View>
            <View style={styles.track}>
              <Svg width="100%" height={BAR_HEIGHT}>
                {d.value > 0 ? (
                  <Rect
                    x={borders.std / 2}
                    y={borders.std / 2}
                    width={`${pct}%`}
                    height={BAR_HEIGHT - borders.std}
                    fill={fill}
                    stroke={colors.ink}
                    strokeWidth={borders.std}
                  />
                ) : null}
              </Svg>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  label: {
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.ink,
  },
  track: {
    borderLeftWidth: borders.std,
    borderLeftColor: colors.ink,
  },
});
