import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { Badge, Button, Card, Divider, Input, Screen, StatBlock } from '@/components/ui';
import { formatKurus, formatLira } from '@/lib/money';
import { formatMonthYear } from '@/lib/dates';
import {
  ExtractionTimeoutError,
  PasswordRequiredError,
  PdfParseError,
  WrongPasswordError,
} from '@/pdf/errors';
import { UnsupportedBankError } from '@/parsers/registry';
import { DuplicateStatementError, ImportResult, importStatement } from '@/services/importStatement';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, fontSizes, spacing } from '@/theme';

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'password'; uri: string; filename: string | null; wrong: boolean }
  | { kind: 'done'; result: ImportResult }
  | { kind: 'error'; title: string; message: string };

export default function ImportScreen() {
  const router = useRouter();
  const bumpRevision = useAppStore((s) => s.bumpRevision);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [password, setPassword] = useState('');

  const runImport = async (uri: string, filename: string | null, pw?: string) => {
    setPhase({ kind: 'working', message: 'PDF okunuyor ve çözümleniyor…' });
    try {
      const result = await importStatement(uri, filename, pw);
      bumpRevision();
      setPassword('');
      setPhase({ kind: 'done', result });
    } catch (e) {
      if (e instanceof PasswordRequiredError) {
        setPhase({ kind: 'password', uri, filename, wrong: false });
      } else if (e instanceof WrongPasswordError) {
        setPhase({ kind: 'password', uri, filename, wrong: true });
      } else if (e instanceof UnsupportedBankError) {
        setPhase({
          kind: 'error',
          title: 'Desteklenmeyen banka',
          message:
            `Bu PDF tanınan bir banka ekstresine benzemiyor. Şu an desteklenen bankalar: ${e.supportedBanks.join(', ')}. ` +
            'Genel/tahmini çözümleme yapılmaz — yanlış rakam göstermektense hiç göstermeyiz.',
        });
      } else if (e instanceof DuplicateStatementError) {
        setPhase({
          kind: 'error',
          title: 'Bu ekstre zaten yüklü',
          message: 'Aynı döneme ait bu ekstre daha önce içeri aktarılmış. Ekstreler sekmesinden görebilirsin.',
        });
      } else if (e instanceof ExtractionTimeoutError) {
        setPhase({
          kind: 'error',
          title: 'Zaman aşımı',
          message: 'PDF çözümleme çok uzun sürdü. Dosyayı tekrar seçmeyi dene.',
        });
      } else if (e instanceof PdfParseError) {
        setPhase({
          kind: 'error',
          title: 'PDF okunamadı',
          message: 'Bu dosya geçerli bir PDF gibi görünmüyor ya da içeriği çözümlenemedi.',
        });
      } else {
        setPhase({
          kind: 'error',
          title: 'Beklenmeyen hata',
          message: e instanceof Error ? e.message : 'Bilinmeyen bir hata oluştu.',
        });
      }
    }
  };

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || res.assets.length === 0) return;
    const asset = res.assets[0];
    await runImport(asset.uri, asset.name ?? null);
  };

  return (
    <Screen title="Ekstre Yükle" kicker="pdf içeri aktar">
      {phase.kind === 'idle' ? (
        <>
          <Card thick padding={spacing.xl}>
            <Text style={styles.dropTitle}>PDF EKSTRENİ SEÇ</Text>
            <Text style={styles.dropBody}>
              Bankanın e-posta ile gönderdiği aylık kredi kartı ekstresi. Dosya cihazından çıkmaz;
              tüm çözümleme telefonda olur.
            </Text>
            <Button label="Dosya Seç" variant="accent" size="lg" style={styles.dropButton} onPress={pick} />
          </Card>
          <Divider />
          <Text style={styles.supported}>DESTEKLENEN BANKALAR</Text>
          <Card flat>
            <Text style={styles.bankLine}>İş Bankası (Maximum)</Text>
            <Text style={styles.bankNote}>
              Yeni banka eklemek gerçek ekstre ile test gerektirir — docs/ADD_A_BANK.md
            </Text>
          </Card>
        </>
      ) : null}

      {phase.kind === 'working' ? (
        <Card thick padding={spacing.xl}>
          <ActivityIndicator color={colors.ink} size="large" />
          <Text style={styles.workingText}>{phase.message}</Text>
          <Text style={styles.workingSub}>İnternet kullanılmıyor — her şey cihazda.</Text>
        </Card>
      ) : null}

      {phase.kind === 'password' ? (
        <Card thick edge={phase.wrong ? colors.alert : undefined} padding={spacing.xl}>
          <Text style={styles.dropTitle}>ŞİFRELİ PDF</Text>
          <Text style={styles.dropBody}>
            {phase.wrong
              ? 'Şifre yanlış. Tekrar dene.'
              : 'Bu ekstre şifre korumalı. Bankanın belirttiği şifreyi gir (genellikle T.C. kimlik no ya da kart bilgisinden türetilir).'}
          </Text>
          <Input
            label="Ekstre şifresi"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            secureTextEntry
            autoFocus
            error={phase.wrong ? 'Şifre doğrulanamadı' : undefined}
            style={styles.passwordInput}
            onSubmitEditing={() => runImport(phase.uri, phase.filename, password)}
          />
          <Button
            label="Aç ve Çözümle"
            variant="accent"
            onPress={() => runImport(phase.uri, phase.filename, password)}
          />
          <Button label="Vazgeç" variant="outline" style={styles.secondaryButton} onPress={() => setPhase({ kind: 'idle' })} />
        </Card>
      ) : null}

      {phase.kind === 'done' ? <DoneView result={phase.result} onAgain={() => setPhase({ kind: 'idle' })} /> : null}

      {phase.kind === 'error' ? (
        <Card thick edge={colors.alert} padding={spacing.xl}>
          <Badge label="Hata" tone="alert" />
          <Text style={styles.errorTitle}>{phase.title}</Text>
          <Text style={styles.dropBody}>{phase.message}</Text>
          <Button label="Tekrar Dene" variant="primary" style={styles.dropButton} onPress={() => setPhase({ kind: 'idle' })} />
        </Card>
      ) : null}

      {phase.kind === 'idle' || phase.kind === 'done' ? (
        <Button
          label="Özete Git"
          variant="outline"
          style={styles.secondaryButton}
          onPress={() => router.replace('/(tabs)/dashboard')}
        />
      ) : null}
    </Screen>
  );
}

function DoneView({ result, onAgain }: { result: ImportResult; onAgain: () => void }) {
  const router = useRouter();
  return (
    <>
      <Card thick edge={result.needsReview ? colors.alert : colors.positive} padding={spacing.xl}>
        <Badge
          label={result.needsReview ? 'Kontrol gerekli' : 'Başarılı'}
          tone={result.needsReview ? 'alert' : 'positive'}
        />
        <Text style={styles.doneTitle}>
          {result.bankName}
          {result.statementDate ? ` — ${formatMonthYear(result.statementDate)}` : ''}
        </Text>
        <StatBlock label="İşlem" value={String(result.transactionCount)} size="md" />
        <Divider />
        <Text style={styles.reconcileLine}>
          {result.reconcile.ok
            ? `Mutabakat tamam: satırların toplamı ekstre borcunu kuruşu kuruşuna tutuyor (${formatLira(result.reconcile.computedTotal)}).`
            : result.reconcile.reason === 'missing-expected-total'
              ? 'Ekstre üzerindeki toplam tutar bulunamadı; mutabakat yapılamadı.'
              : `Mutabakat TUTMADI: fark ${formatKurus(result.reconcile.deltaKurus)} TL. Anlaşılamayan satırlar aşağıda listelenir.`}
        </Text>
        {result.unparsedCount > 0 ? (
          <Text style={styles.unparsedLine}>
            {result.unparsedCount} satır anlaşılamadı — ekstre detayında tek tek görebilirsin. Emin
            olmadığımız hiçbir rakamı toplama katmayız.
          </Text>
        ) : null}
      </Card>
      <Button
        label="Abonelikleri Gör"
        variant="danger"
        style={styles.dropButton}
        onPress={() => router.replace('/(tabs)/subscriptions')}
      />
      <Button label="Başka Ekstre Yükle" variant="outline" style={styles.secondaryButton} onPress={onAgain} />
    </>
  );
}

const styles = StyleSheet.create({
  dropTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
  },
  dropBody: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    lineHeight: 20,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  dropButton: {
    marginTop: spacing.lg,
  },
  secondaryButton: {
    marginTop: spacing.md,
  },
  supported: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  bankLine: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.body,
    color: colors.ink,
  },
  bankNote: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  workingText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.h3,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  workingSub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  passwordInput: {
    marginVertical: spacing.lg,
  },
  errorTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  doneTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
    marginVertical: spacing.sm,
  },
  reconcileLine: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    lineHeight: 18,
    color: colors.ink,
  },
  unparsedLine: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.small,
    lineHeight: 18,
    color: colors.alert,
    marginTop: spacing.sm,
  },
});
