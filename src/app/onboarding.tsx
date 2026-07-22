import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card } from '@/components/ui';
import { setSetting } from '@/db/repos/settings';
import { colors, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

const STEPS = [
  {
    kicker: '01 / GİZLİLİK',
    title: 'EKSTREN\nTELEFONUNDAN\nÇIKMIYOR.',
    body: 'PDF ekstren cihazında işlenir. Sunucu yok, hesap yok, internet yok. Uçak modunda bile çalışır.',
  },
  {
    kicker: '02 / ABONELİKLER',
    title: 'UNUTTUĞUN\nABONELİKLERİ\nYAKALA.',
    body: 'Aylardır ödediğin servisleri tek tek bulur, toplam ne kadar gittiğini yüzüne söyler.',
    example: true,
  },
  {
    kicker: '03 / BAŞLA',
    title: 'PDF YÜKLE,\n60 SANİYEDE\nGÖR.',
    body: 'Bankanın e-posta ile gönderdiği ekstre PDF’ini seç. Gerisini biz hallederiz — cihazından çıkmadan.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = async () => {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    await setSetting('onboarded', '1');
    router.replace('/import');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.progress}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressBox, i <= step && styles.progressBoxActive]} />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={styles.kicker}>{current.kicker}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        {current.example ? (
          <Card edge={colors.alert} style={styles.example}>
            <Badge label="Abonelik" tone="alert" />
            <Text style={styles.exampleTitle}>SPOTIFY</Text>
            <Text style={styles.exampleLine}>7 aydır ödüyorsun · ₺149,99/ay</Text>
            <Text style={styles.exampleTotal}>₺1.049,93</Text>
            <Text style={styles.exampleSub}>toplam ödenen</Text>
          </Card>
        ) : null}
      </View>

      <Button label={isLast ? 'Ekstre Yükle' : 'Devam'} variant={isLast ? 'accent' : 'primary'} size="lg" onPress={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.xl,
  },
  progress: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressBox: {
    flex: 1,
    height: 8,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  progressBoxActive: {
    backgroundColor: colors.accent,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: letterSpacing.heading,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.h3,
    lineHeight: 24,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  example: {
    marginTop: spacing.xl,
  },
  exampleTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  exampleLine: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  exampleTotal: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.display,
    color: colors.alert,
    marginTop: spacing.sm,
  },
  exampleSub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
  },
});
