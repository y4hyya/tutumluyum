import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, shadowOffset } from '@/theme';

interface HardShadowProps {
  children: ReactNode;
  /** Hide the shadow (e.g. while a button is pressed). */
  disabled?: boolean;
  offset?: number;
  style?: ViewStyle;
}

/**
 * The only shadow allowed in this app: a solid ink rectangle offset by
 * (+offset, +offset) behind the child. No blur, no elevation, no opacity.
 */
export function HardShadow({ children, disabled, offset = shadowOffset, style }: HardShadowProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {!disabled && (
        <View
          pointerEvents="none"
          style={[styles.shadow, { top: offset, left: offset }]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.ink,
  },
});
