import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Divider, ListRow, Screen, StatBlock } from '@/components/ui';
import { deleteStatement, getStatement, StatementListItem } from '@/db/repos/statements';
import { listTransactions, statementPositiveSpend, TransactionListItem } from '@/db/repos/transactions';
import { listUnparsedLines } from '@/db/repos/unparsed';
import { UnparsedLineRow } from '@/db/types';
import { formatDate, formatMonthYear } from '@/lib/dates';
import { formatLira, Kurus } from '@/lib/money';
import { recomputeRecurrence } from '@/services/recurrenceSync';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, fontSizes, spacing } from '@/theme';

export default function StatementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const statementId = Number(id);
  const router = useRouter();
  const bumpRevision = useAppStore((s) => s.bumpRevision);

  const [statement, setStatement] = useState<StatementListItem | null>(null);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [unparsed, setUnparsed] = useState<UnparsedLineRow[]>([]);
  const [spend, setSpend] = useState<Kurus>(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s, t, u, sp] = await Promise.all([
        getStatement(statementId),
        listTransactions({ statementId }),
        listUnparsedLines(statementId),
        statementPositiveSpend(statementId),
      ]);
      if (!live) return;
      setStatement(s);
      setTransactions(t);
      setUnparsed(u);
      setSpend(sp);
      setLoaded(true);
    })();
    return () => {
      live = false;
    };
  }, [statementId]);

  const remove = async () => {
    await deleteStatement(statementId);
    await recomputeRecurrence();
    setConfirmDelete(false);
    bumpRevision();
    router.back();
  };

  if (!loaded) return <Screen title="Ekstre">{null}</Screen>;

  if (!statement) {
    return (
      <Screen title="Ekstre">
        <Card flat>
          <Text style={styles.body}>Bu ekstre bulunamadı — silinmiş olabilir.</Text>
        </Card>
        <Button label="Geri Dön" variant="outline" style={styles.spaced} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen
      title={statement.statement_date ? formatMonthYear(statement.statement_date) : 'Ekstre'}
      kicker={`${statement.bank_code} · kart •••• ${statement.card_last4 ?? '????'}`}
      headerRight={statement.status === 'needs_review' ? <Badge label="Kontrol gerekli" tone="alert" /> : undefined}>
      <View style={styles.statRow}>
        <StatBlock label="Dönem borcu" value={statement.total_amount !== null ? formatLira(statement.total_amount) : '—'} size="md" style={styles.stat} />
        <StatBlock label="Harcama" value={formatLira(spend)} size="md" style={styles.stat} />
      </View>
      <Text style={styles.metaLine}>
        Asgari ödeme: {statement.min_payment !== null ? formatLira(statement.min_payment) : '—'} · Son ödeme:{' '}
        {statement.due_date ? formatDate(statement.due_date) : '—'}
      </Text>

      {unparsed.length > 0 ? (
        <>
          <Divider thick />
          <Card thick edge={colors.alert}>
            <Badge label={`${unparsed.length} anlaşılamayan satır`} tone="alert" />
            <Text style={styles.unparsedIntro}>
              Bu satırları çözümleyemedik ve TOPLAMLARA KATMADIK. Yanlış rakam göstermektense eksik
              gösteririz:
            </Text>
            {unparsed.map((u) => (
              <View key={u.id} style={styles.unparsedRow}>
                <Text style={styles.unparsedText}>“{u.raw_text}”</Text>
                <Text style={styles.unparsedReason}>
                  s.{u.page + 1} — {u.reason}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Divider thick />
      <Text style={styles.sectionLabel}>İŞLEMLER ({transactions.length})</Text>
      {transactions.map((t) => (
        <ListRow
          key={t.id}
          title={t.merchant_key}
          subtitle={`${formatDate(t.txn_date)} · ${t.category_label ?? 'Diğer'}`}
          value={formatLira(t.amount)}
          valueTone={t.amount < 0 ? 'positive' : 'ink'}
        />
      ))}

      <Divider thick />
      <Button label="Bu Ekstreyi Sil" variant="danger" onPress={() => setConfirmDelete(true)} />

      <Modal visible={confirmDelete} transparent animationType="none" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.modalBackdrop}>
          <Card thick>
            <Text style={styles.modalTitle}>EKSTREYİ SİL?</Text>
            <Text style={styles.body}>
              {statement.transaction_count} işlem ve bu döneme ait tüm veriler silinir. Abonelik
              bulguları yeniden hesaplanır. Bu işlem geri alınamaz.
            </Text>
            <View style={styles.modalActions}>
              <Button label="Vazgeç" variant="outline" style={styles.modalButton} onPress={() => setConfirmDelete(false)} />
              <Button label="Sil" variant="danger" style={styles.modalButton} onPress={remove} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    lineHeight: 20,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  metaLine: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  unparsedIntro: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.small,
    lineHeight: 18,
    color: colors.ink,
    marginVertical: spacing.sm,
  },
  unparsedRow: {
    marginTop: spacing.sm,
  },
  unparsedText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.ink,
  },
  unparsedReason: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.tiny,
    color: colors.alert,
    marginTop: 2,
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
