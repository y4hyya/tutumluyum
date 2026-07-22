import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  BarChart,
  Button,
  Card,
  Divider,
  Input,
  ListRow,
  Screen,
  StatBlock,
} from '@/components/ui';
import { colors, fonts, fontSizes, letterSpacing, spacing } from '@/theme';

function Section({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{name}</Text>
      {children}
    </View>
  );
}

const SWATCHES = Object.entries(colors) as [string, string][];

export default function KitchenSink() {
  const [text, setText] = useState('');

  return (
    <Screen title="Kitchen Sink" kicker="dev / tasarım sistemi">
      <Section name="Renkler">
        <View style={styles.swatchRow}>
          {SWATCHES.map(([name, hex]) => (
            <View key={name} style={styles.swatchBox}>
              <View style={[styles.swatch, { backgroundColor: hex }]} />
              <Text style={styles.swatchName}>{name}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section name="Tipografi">
        <Text style={styles.specimenHeading}>ARCHIVO BLACK</Text>
        <Text style={styles.specimenMono}>Space Mono 0123456789</Text>
        <Text style={styles.specimenMonoBold}>₺12.345,67 — tabular hizalama</Text>
      </Section>

      <Section name="Button">
        <View style={styles.stack}>
          <Button label="Kullanıyorum" variant="positive" />
          <Button label="İptal Edeceğim" variant="danger" />
          <Button label="Ekstre Yükle" variant="primary" />
          <Button label="Seçili Durum" variant="accent" />
          <Button label="İkincil" variant="outline" />
          <Button label="Devre Dışı" disabled />
        </View>
      </Section>

      <Section name="Card">
        <View style={styles.stack}>
          <Card thick>
            <Text style={styles.cardText}>Kalın kenarlıklı birincil kart (3px + sert gölge)</Text>
          </Card>
          <Card edge={colors.alert}>
            <Text style={styles.cardText}>Uyarı kenarlı kart — abonelik bulgusu</Text>
          </Card>
          <Card flat>
            <Text style={styles.cardText}>Gölgesiz düz kart</Text>
          </Card>
        </View>
      </Section>

      <Section name="Input">
        <Input
          label="Ekstre şifresi"
          value={text}
          onChangeText={setText}
          placeholder="••••••"
          error={text.length > 0 && text.length < 4 ? 'Şifre çok kısa' : undefined}
        />
      </Section>

      <Section name="Badge">
        <View style={styles.badgeRow}>
          <Badge label="Yeni" tone="accent" />
          <Badge label="Abonelik" tone="alert" />
          <Badge label="İptal Edildi" tone="positive" />
          <Badge label="Taksit 3/6" tone="ink" />
          <Badge label="Pasif" tone="muted" />
        </View>
      </Section>

      <Section name="StatBlock">
        <StatBlock label="Bu ay toplam" value="₺24.318,55" sub="+₺2.410,00 geçen aya göre" size="lg" />
        <Divider />
        <StatBlock label="Toplam ödenen" value="₺1.049,93" tone="alert" size="xl" sub="7 aydır" />
        <Divider />
        <StatBlock label="Tasarruf" value="₺449,97" tone="positive" size="md" />
      </Section>

      <Section name="BarChart">
        <BarChart
          data={[
            { label: 'Market', value: 8450, color: '#00B37E' },
            { label: 'Yeme-İçme', value: 5210, color: '#FF7A00' },
            { label: 'Abonelik', value: 1620, color: '#FF3B00' },
            { label: 'Ulaşım', value: 940, color: '#0055FF' },
            { label: 'Boş', value: 0 },
          ]}
          formatValue={(v) => `₺${v}`}
          highlightIndex={2}
        />
      </Section>

      <Section name="ListRow">
        <ListRow
          title="SPOTIFY"
          subtitle="15.06.2026 · Abonelik"
          value="₺149,99"
          valueTone="alert"
          onPress={() => {}}
        />
        <ListRow
          title="MİGROS SANAL MARKET"
          subtitle="14.06.2026 · Market"
          value="₺1.284,50"
          onPress={() => {}}
        />
        <ListRow title="İADE — TRENDYOL" subtitle="12.06.2026" value="-₺349,90" valueTone="positive" />
      </Section>

      <Section name="Divider">
        <Text style={styles.cardText}>Standart (2px)</Text>
        <Divider />
        <Text style={styles.cardText}>Kalın (3px)</Text>
        <Divider thick />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatchBox: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  swatchName: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.tiny,
    color: colors.ink,
  },
  specimenHeading: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h1,
    letterSpacing: letterSpacing.heading,
    color: colors.ink,
  },
  specimenMono: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.h3,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  specimenMonoBold: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.h3,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  stack: {
    gap: spacing.lg,
  },
  cardText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    color: colors.ink,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
