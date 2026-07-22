import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Divider, Screen } from '@/components/ui';
import { listRecurringGroups, setRecurringStatus } from '@/db/repos/recurring';
import { RecurringGroupRow, RecurringStatus } from '@/db/types';
import { daysBetween } from '@/lib/dates';
import { formatLira, sumKurus } from '@/lib/money';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, fontSizes, spacing } from '@/theme';

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'HAFTALIK',
  monthly: 'AYLIK',
  quarterly: '3 AYLIK',
  yearly: 'YILLIK',
};

const CADENCE_SUFFIX: Record<string, string> = {
  weekly: '/hafta',
  monthly: '/ay',
  quarterly: '/3 ay',
  yearly: '/yıl',
};

export default function Subscriptions() {
  const router = useRouter();
  const revision = useAppStore((s) => s.revision);
  const bumpRevision = useAppStore((s) => s.bumpRevision);
  const [groups, setGroups] = useState<RecurringGroupRow[] | null>(null);

  useEffect(() => {
    let live = true;
    listRecurringGroups().then((g) => {
      if (live) setGroups(g);
    });
    return () => {
      live = false;
    };
  }, [revision]);

  const setStatus = async (group: RecurringGroupRow, status: RecurringStatus) => {
    await setRecurringStatus(group.id, status === group.status ? 'new' : status);
    bumpRevision();
  };

  if (!groups) return <Screen title="Abonelikler" kicker="tekrarlayan ödemeler">{null}</Screen>;

  if (groups.length === 0) {
    return (
      <Screen title="Abonelikler" kicker="tekrarlayan ödemeler">
        <Card thick padding={spacing.xl}>
          <Text style={styles.emptyTitle}>HENÜZ BULGU YOK</Text>
          <Text style={styles.emptyBody}>
            Tekrarlayan ödemeleri yakalamak için en az 2 farklı aya ait ekstre gerekir. Ne kadar çok
            ay yüklersen o kadar isabetli olur.
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

  const activeTotal = sumKurus(
    groups.filter((g) => g.is_active === 1 && g.status !== 'cancelled').map((g) => g.total_paid),
  );

  return (
    <Screen title="Abonelikler" kicker="tekrarlayan ödemeler">
      <Card flat style={styles.summary}>
        <Text style={styles.summaryLabel}>AKTİF ABONELİKLERE BUGÜNE DEK GİDEN</Text>
        <Text style={styles.summaryValue}>{formatLira(activeTotal)}</Text>
      </Card>

      {groups.map((group) => (
        <SubscriptionCard key={group.id} group={group} onStatus={setStatus} />
      ))}
    </Screen>
  );
}

function SubscriptionCard({
  group,
  onStatus,
}: {
  group: RecurringGroupRow;
  onStatus: (group: RecurringGroupRow, status: RecurringStatus) => void;
}) {
  const cancelled = group.status === 'cancelled';
  const edge = cancelled ? colors.positive : group.status === 'to_cancel' ? colors.accent : colors.alert;

  return (
    <Card thick edge={edge} style={styles.card}>
      <View style={styles.badgeRow}>
        <Badge label={CADENCE_LABEL[group.cadence] ?? group.cadence} tone="ink" />
        {group.is_active === 0 ? <Badge label="Durmuş görünüyor" tone="muted" /> : null}
        {group.status === 'to_cancel' ? <Badge label="İptal edilecek" tone="accent" /> : null}
        {cancelled ? <Badge label="İptal edildi" tone="positive" /> : null}
      </View>

      <Text style={styles.merchant}>{group.display_name.toUpperCase()}</Text>
      <Text style={styles.priceLine}>
        {formatLira(group.avg_amount)}
        {CADENCE_SUFFIX[group.cadence] ?? ''} · {group.occurrence_count} ödeme ·{' '}
        {Math.round(group.confidence * 100)}% eminlik
      </Text>
      <Text style={styles.monthsLine}>
        {monthsPhrase(group)} — hâlâ kullanıyor musun?
      </Text>

      <Divider gap={spacing.md} />

      <Text style={styles.totalLabel}>TOPLAM ÖDENEN</Text>
      <Text style={[styles.totalValue, cancelled && styles.totalValueCancelled]}>
        {formatLira(group.total_paid)}
      </Text>

      <View style={styles.actions}>
        <Button
          label="Kullanıyorum"
          size="sm"
          variant={group.status === 'acknowledged' ? 'positive' : 'outline'}
          style={styles.action}
          onPress={() => onStatus(group, 'acknowledged')}
        />
        <Button
          label="İptal Edeceğim"
          size="sm"
          variant={group.status === 'to_cancel' ? 'accent' : 'outline'}
          style={styles.action}
          onPress={() => onStatus(group, 'to_cancel')}
        />
        <Button
          label="İptal Ettim"
          size="sm"
          variant={cancelled ? 'primary' : 'outline'}
          style={styles.action}
          onPress={() => onStatus(group, 'cancelled')}
        />
      </View>
    </Card>
  );
}

function monthsPhrase(group: RecurringGroupRow): string {
  if (group.cadence === 'yearly') return `${group.occurrence_count} yıldır ödüyorsun`;
  if (group.cadence === 'weekly') return `${group.occurrence_count} haftadır ödüyorsun`;
  const months = Math.max(1, Math.round(daysBetween(group.first_seen, group.last_seen) / 30.44) + 1);
  return `${months} aydır ödüyorsun`;
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
  summary: {
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  summaryValue: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.big,
    color: colors.alert,
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.xl,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  merchant: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  priceLine: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  monthsLine: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.body,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  totalValue: {
    fontFamily: fonts.monoBold,
    fontSize: 56,
    color: colors.alert,
  },
  totalValueCancelled: {
    color: colors.positive,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
});
