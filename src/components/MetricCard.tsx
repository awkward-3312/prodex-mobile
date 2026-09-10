import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../theme';
import type { DashboardMetric } from '../types/dashboard';
import { formatCurrency } from '../utils/formatCurrency';

type Props = {
  metric: DashboardMetric;
};

const toneStyles = {
  brand: { background: colors.brandSoft, icon: colors.brand },
  blue: { background: colors.blueSoft, icon: colors.blue },
  teal: { background: colors.tealSoft, icon: colors.teal },
  amber: { background: colors.amberSoft, icon: colors.amber },
  red: { background: colors.redSoft, icon: colors.red },
};

export function MetricCard({ metric }: Props) {
  const tone = toneStyles[metric.tone];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Ionicons name={metric.icon} size={18} color={tone.icon} />
        </View>
        <Text style={styles.label} numberOfLines={2}>{metric.label}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
        {metric.valueText ?? formatCurrency(metric.value)}
      </Text>
      <Text style={[styles.detail, { color: tone.icon }]}>{metric.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 128,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 28, height: 28, borderRadius: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: colors.inkMuted, fontSize: 12, fontWeight: '600', lineHeight: 15 },
  value: { marginTop: spacing.md, color: colors.ink, fontSize: 21, fontWeight: '800', letterSpacing: 0 },
  detail: { marginTop: spacing.xs, fontSize: 11, fontWeight: '600' },
});
