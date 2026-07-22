import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, ListRow, Screen } from '@/components/ui';
import { listStatements, StatementListItem } from '@/db/repos/statements';
import { formatDate, formatMonthYear } from '@/lib/dates';
import { formatLira } from '@/lib/money';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, fontSizes, spacing } from '@/theme';

export default function Statements() {
  const router = useRouter();
  const revision = useAppStore((s) => s.revision);
  const [statements, setStatements] = useState<StatementListItem[] | null>(null);

  useEffect(() => {
    let live = true;
    listStatements().then((s) => {
      if (live) setStatements(s);
    });
    return () => {
      live = false;
    };
  }, [revision]);

  if (!statements) return <Screen title="Ekstreler" kicker="yüklenen dönemler">{null}</Screen>;

  return (
    <Screen title="Ekstreler" kicker="yüklenen dönemler">
      {statements.length === 0 ? (
        <Card thick padding={spacing.xl}>
          <Text style={styles.emptyTitle}>HİÇ EKSTRE YÜKLENMEDİ</Text>
          <Text style={styles.emptyBody}>
            PDF ekstrelerini buradan yönetirsin: dönem detayları, anlaşılamayan satırlar, silme.
          </Text>
          <Button
            label="İlk Ekstreyi Yükle"
            variant="accent"
            size="lg"
            style={styles.emptyButton}
            onPress={() => router.push('/import')}
          />
        </Card>
      ) : (
        <>
          {statements.map((s) => (
            <ListRow
              key={s.id}
              title={s.statement_date ? formatMonthYear(s.statement_date) : (s.source_filename ?? 'Ekstre')}
              subtitle={`${s.bank_code} · ${s.transaction_count} işlem · kesim ${
                s.statement_date ? formatDate(s.statement_date) : '—'
              }${s.status === 'needs_review' ? ' · KONTROL GEREKLİ' : ''}${
                s.unparsed_count > 0 ? ` · ${s.unparsed_count} anlaşılamayan satır` : ''
              }`}
              value={s.total_amount !== null ? formatLira(s.total_amount) : '—'}
              valueTone={s.status === 'needs_review' ? 'alert' : s.total_amount !== null && s.total_amount < 0 ? 'positive' : 'ink'}
              onPress={() => router.push(`/statement/${s.id}`)}
            />
          ))}
          <Button label="Yeni Ekstre Yükle" variant="primary" style={styles.footerButton} onPress={() => router.push('/import')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    lineHeight: 20,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  footerButton: {
    marginTop: spacing.xl,
  },
});
