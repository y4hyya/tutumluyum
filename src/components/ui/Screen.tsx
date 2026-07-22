import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, borders, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Uppercase Archivo Black page title. */
  title?: string;
  /** Small uppercase label above the title. */
  kicker?: string;
  /** Element rendered to the right of the title (e.g. a Badge). */
  headerRight?: ReactNode;
  /** Disable the outer ScrollView for screens with their own list. */
  scroll?: boolean;
  /** Pinned below the content, above the home indicator. */
  footer?: ReactNode;
}

export function Screen({ children, title, kicker, headerRight, scroll = true, footer }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const header =
    title || kicker ? (
      <View style={styles.header}>
        <View style={styles.headerText}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      {header}
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: borders.thick,
    borderBottomColor: colors.ink,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h1,
    letterSpacing: letterSpacing.heading,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: borders.thick,
    borderTopColor: colors.ink,
    backgroundColor: colors.paper,
  },
});
