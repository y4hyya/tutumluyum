import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>TUTUMLUYUM</Text>
      <Text style={styles.subtitle}>Ekstren telefonundan çıkmıyor.</Text>
      {__DEV__ ? (
        <Button
          label="Kitchen Sink"
          variant="accent"
          style={styles.devButton}
          onPress={() => router.push('/dev/kitchen-sink')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: 'flex-end',
    padding: spacing.xl,
    paddingBottom: 64,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.big,
    letterSpacing: letterSpacing.heading,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  devButton: {
    marginTop: spacing.xl,
  },
});
