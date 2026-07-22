import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart, Button, Card, Divider, Screen, StatBlock } from '@/components/ui';
import { countActiveSubscriptions } from '@/db/repos/recurring';
import { listStatements, StatementListItem } from '@/db/repos/statements';
import { CategoryTotal, statementPositiveSpend, totalsByCategory } from '@/db/repos/transactions';
import { formatMonthYear } from '@/lib/dates';
import { formatLira, Kurus } from '@/lib/money';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, fontSizes, spacing } from '@/theme';

interface DashboardData {
  latest: StatementListItem | null;
  spend: Kurus;
  previousSpend: Kurus | null;
  categories: CategoryTotal[];
  activeSubscriptions: number;
}

export default function Dashboard() {
  const router = useRouter();
  const revision = useAppStore((s) => s.revision);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const statements = await listStatements();
      if (statements.length === 0) {
        if (live) setData({ latest: null, spend: 0, previousSpend: null, categories: [], activeSubscriptions: 0 });
        return;
      }
      const latest = statements[0];
      const [spend, categories, activeSubscriptions] = await Promise.all([
        statementPositiveSpend(latest.id),
        totalsByCategory(latest.id),
        countActiveSubscriptions(),
      ]);
      const previousSpend =
        statements.length > 1 ? await statementPositiveSpend(statements[1].id) : null;
      if (live) setData({ latest, spend, previousSpend, categories, activeSubscriptions });
    })();
    return () => {
      live = false;
    };
  }, [revision]);

  if (!data) {
    return <Screen title="Özet" kicker="tutumluyum">{null}</Screen>;
  }

  if (!data.latest) {
    return (
      <Screen title="Özet" kicker="tutumluyum">
        <Card thick padding={spacing.xl}>
          <Text style={styles.emptyTitle}>HENÜZ EKSTRE YOK</Text>
          <Text style={styles.emptyBody}>
            İlk PDF ekstreni yükle; harcamaların kategorilere ayrılsın, unutulan aboneliklerin
            ortaya çıksın. Her şey cihazında kalır.
          </Text>
          <Button
            label="Ekstre Yükle"
            variant="accent"
            size="lg"
            style={styles.emptyButton}
            onPress={() => router.push('/import')}
          />
        </Card>
      </Screen>
    );
  }

  const delta = data.previousSpend === null ? null : data.spend - data.previousSpend;

  return (
    <Screen title="Özet" kicker={formatMonthYear(data.latest.statement_date ?? '')}>
      <StatBlock
        label="Bu dönem harcama"
        value={formatLira(data.spend)}
        size="xl"
        sub={
          delta === null
            ? `${data.latest.transaction_count} işlem`
            : `${delta >= 0 ? '+' : ''}${formatLira(delta)} geçen döneme göre`
        }
        tone={delta !== null && delta > 0 ? 'alert' : 'ink'}
      />

      <Divider thick />

      {data.activeSubscriptions > 0 ? (
        <Card edge={colors.alert} style={styles.subsCard}>
          <View style={styles.subsRow}>
            <View style={styles.subsText}>
              <Text style={styles.subsCount}>{data.activeSubscriptions}</Text>
              <Text style={styles.subsLabel}>AKTİF ABONELİK TESPİT EDİLDİ</Text>
            </View>
            <Button label="Gör" variant="danger" size="sm" onPress={() => router.push('/(tabs)/subscriptions')} />
          </View>
        </Card>
      ) : null}

      <Text style={styles.sectionLabel}>KATEGORİLERE GÖRE</Text>
      {data.categories.length === 0 ? (
        <Card flat>
          <Text style={styles.emptyBody}>Bu dönemde kategorilendirilecek harcama yok.</Text>
        </Card>
      ) : (
        <BarChart
          data={data.categories.map((c) => ({
            label: c.category_label,
            value: c.total,
            color: c.category_color,
          }))}
          formatValue={(v) => formatLira(Math.round(v))}
        />
      )}

      <Divider />
      <Button label="Yeni Ekstre Yükle" variant="primary" onPress={() => router.push('/import')} />
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
  subsCard: {
    marginBottom: spacing.xl,
  },
  subsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subsText: {
    flex: 1,
  },
  subsCount: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.big,
    color: colors.alert,
  },
  subsLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.muted,
    marginBottom: spacing.md,
  },
});
