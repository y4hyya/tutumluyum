import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ListRow, Screen } from '@/components/ui';
import { CategoryRow } from '@/db/types';
import { listCategories } from '@/db/repos/categories';
import {
  listTransactions,
  recategorizeMerchant,
  TransactionListItem,
} from '@/db/repos/transactions';
import { formatDate } from '@/lib/dates';
import { formatLira } from '@/lib/money';
import { useAppStore } from '@/store/appStore';
import { colors, borders, fonts, fontSizes, spacing } from '@/theme';

export default function Transactions() {
  const revision = useAppStore((s) => s.revision);
  const bumpRevision = useAppStore((s) => s.bumpRevision);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<TransactionListItem[] | null>(null);
  const [recatTarget, setRecatTarget] = useState<TransactionListItem | null>(null);

  useEffect(() => {
    listCategories().then(setCategories);
  }, [revision]);

  useEffect(() => {
    let live = true;
    listTransactions({ categoryId, search: search.trim() || undefined }).then((r) => {
      if (live) setRows(r);
    });
    return () => {
      live = false;
    };
  }, [revision, categoryId, search]);

  const applyCategory = async (category: CategoryRow) => {
    if (!recatTarget) return;
    await recategorizeMerchant(recatTarget.merchant_key, recatTarget.merchant_key, category.id);
    setRecatTarget(null);
    bumpRevision();
  };

  return (
    <Screen title="İşlemler" kicker="tüm dönemler" scroll={false}>
      <View style={styles.filters}>
        <Input value={search} onChangeText={setSearch} placeholder="Ara: migros, spotify…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <FilterChip label="TÜMÜ" active={categoryId === undefined} onPress={() => setCategoryId(undefined)} />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              label={c.label_tr}
              color={c.color}
              active={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
            />
          ))}
        </ScrollView>
      </View>

      {rows !== null && rows.length === 0 ? (
        <Card flat style={styles.empty}>
          <Text style={styles.emptyText}>
            {search || categoryId !== undefined
              ? 'Bu filtreyle eşleşen işlem yok.'
              : 'Henüz işlem yok — önce bir ekstre yükle.'}
          </Text>
        </Card>
      ) : (
        <FlatList
          data={rows ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ListRow
              title={item.merchant_key}
              subtitle={`${formatDate(item.txn_date)} · ${item.category_label ?? 'Diğer'}${
                item.installment_no ? ` · Taksit ${item.installment_no}/${item.installment_total}` : ''
              }`}
              value={formatLira(item.amount)}
              valueTone={item.amount < 0 ? 'positive' : 'ink'}
              onPress={() => setRecatTarget(item)}
            />
          )}
        />
      )}

      <Modal visible={recatTarget !== null} transparent animationType="none" onRequestClose={() => setRecatTarget(null)}>
        <View style={styles.modalBackdrop}>
          <Card thick style={styles.modalCard}>
            <Text style={styles.modalTitle}>KATEGORİ SEÇ</Text>
            <Text style={styles.modalSub} numberOfLines={2}>
              {recatTarget?.merchant_key} — bu satıcının tüm işlemlerine uygulanır ve hatırlanır.
            </Text>
            <ScrollView style={styles.modalList}>
              {categories.map((c) => (
                <Pressable key={c.id} onPress={() => applyCategory(c)} style={styles.modalRow}>
                  <View style={[styles.swatch, { backgroundColor: c.color }]} />
                  <Text style={styles.modalRowText}>{c.label_tr}</Text>
                  {recatTarget?.category_id === c.id ? <Text style={styles.modalCheck}>✓</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Vazgeç" variant="outline" onPress={() => setRecatTarget(null)} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function FilterChip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {color ? <View style={[styles.chipSwatch, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  chipRow: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: borders.std,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipSwatch: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.tiny,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.ink,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  empty: {
    margin: spacing.lg,
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    color: colors.ink,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    color: colors.ink,
  },
  modalSub: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  modalList: {
    marginBottom: spacing.lg,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: borders.hair,
    borderBottomColor: colors.ink,
  },
  swatch: {
    width: 16,
    height: 16,
    borderWidth: borders.std,
    borderColor: colors.ink,
  },
  modalRowText: {
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.body,
    color: colors.ink,
  },
  modalCheck: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.h3,
    color: colors.positive,
  },
});
