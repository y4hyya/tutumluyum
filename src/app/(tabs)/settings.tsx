import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Divider, Screen } from '@/components/ui';
import { wipeAllData } from '@/db';
import { listCategories } from '@/db/repos/categories';
import { CategoryRow } from '@/db/types';
import { useAppStore } from '@/store/appStore';
import { colors, borders, fonts, fontSizes, spacing } from '@/theme';

export default function Settings() {
  const router = useRouter();
  const bumpRevision = useAppStore((s) => s.bumpRevision);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories);
  }, []);

  const wipe = async () => {
    setWiping(true);
    await wipeAllData();
    setWiping(false);
    setConfirmWipe(false);
    bumpRevision();
    router.replace('/');
  };

  return (
    <Screen title="Ayarlar" kicker="tutumluyum">
      <Card thick edge={colors.positive}>
        <Badge label="Gizlilik sözü" tone="positive" />
        <Text style={styles.privacyTitle}>%100 CİHAZ İÇİ</Text>
        <Text style={styles.body}>
          Sunucu yok. Hesap yok. Analitik yok. Ağ çağrısı yok — kaynak kodda ESLint kuralı ve
          testlerle yasaklı. PDF ekstren telefonda çözümlenir, veriler telefonda SQLite içinde
          durur. Uçak modunda dene: her şey aynen çalışır.
        </Text>
      </Card>

      <Divider />

      <Text style={styles.sectionLabel}>KATEGORİLER</Text>
      <Card flat>
        {categories.map((c, i) => (
          <View key={c.id} style={[styles.categoryRow, i === categories.length - 1 && styles.categoryRowLast]}>
            <View style={[styles.swatch, { backgroundColor: c.color }]} />
            <Text style={styles.categoryLabel}>{c.label_tr}</Text>
            <Text style={styles.categoryKey}>{c.key}</Text>
          </View>
        ))}
        <Text style={styles.hint}>
          Bir işleme dokunarak kategorisini düzeltebilirsin; düzeltmeler hatırlanır.
        </Text>
      </Card>

      <Divider />

      <Text style={styles.sectionLabel}>VERİ</Text>
      <Card thick edge={colors.alert}>
        <Text style={styles.body}>
          Tüm ekstreleri, işlemleri ve abonelik bulgularını cihazdan kalıcı olarak siler.
        </Text>
        <Button label="Verilerimi Sil" variant="danger" style={styles.wipeButton} onPress={() => setConfirmWipe(true)} />
      </Card>

      <Divider />
      <Text style={styles.version}>
        Tutumluyum v{Constants.expoConfig?.version ?? '0.0.0'} · açık kaynak · veri toplamaz
      </Text>
      {__DEV__ ? (
        <Button label="Kitchen Sink" variant="outline" style={styles.wipeButton} onPress={() => router.push('/dev/kitchen-sink')} />
      ) : null}

      <Modal visible={confirmWipe} transparent animationType="none" onRequestClose={() => setConfirmWipe(false)}>
        <View style={styles.modalBackdrop}>
          <Card thick>
            <Text style={styles.modalTitle}>HEPSİNİ SİL?</Text>
            <Text style={styles.body}>
              Bütün veriler cihazdan silinir ve uygulama başa döner. Bu işlem geri alınamaz.
            </Text>
            <View style={styles.modalActions}>
              <Button label="Vazgeç" variant="outline" style={styles.modalButton} onPress={() => setConfirmWipe(false)} />
              <Button label={wiping ? 'Siliniyor…' : 'Evet, Sil'} variant="danger" style={styles.modalButton} disabled={wiping} onPress={wipe} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  privacyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  body: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    lineHeight: 20,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hair,
    borderBottomColor: colors.ink,
  },
  categoryRowLast: {
    borderBottomWidth: 0,
  },
  swatch: {
    width: 14,
    height: 14,
    borderWidth: borders.std,
    borderColor: colors.ink,
  },
  categoryLabel: {
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.body,
    color: colors.ink,
  },
  categoryKey: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.tiny,
    color: colors.muted,
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: spacing.md,
  },
  wipeButton: {
    marginTop: spacing.lg,
  },
  version: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});
