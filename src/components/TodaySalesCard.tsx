import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, semantic, spacing } from '../theme';
import type { Trend } from '../types/dashboard';
import { formatCurrency } from '../utils/formatCurrency';

type Props = {
  amount: number;
  percentageChange: number;
  comparisonLabel: string;
  trend: Trend;
};

const trendStyles = {
  positive: { color: semantic.positive, icon: 'arrow-up' as const },
  negative: { color: semantic.critical, icon: 'arrow-down' as const },
  neutral: { color: colors.inkMuted, icon: 'remove' as const },
};

export function TodaySalesCard({ amount, percentageChange, comparisonLabel, trend }: Props) {
  const trendStyle = trendStyles[trend];
  const comparison = `${Math.abs(percentageChange).toFixed(1)}% ${comparisonLabel}`;

  return (
    <View
      accessibilityLabel={`Ventas de hoy, ${formatCurrency(amount)}, ${comparison}`}
      accessible
      style={styles.card}
    >
      <View style={styles.copy}>
        <Text style={styles.label}>Ventas de hoy</Text>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatCurrency(amount)}</Text>
        <View style={styles.comparisonRow}>
          {trend !== 'neutral' && <Ionicons name={trendStyle.icon} size={13} color={trendStyle.color} />}
          <Text style={[styles.comparison, { color: trendStyle.color }]}>{comparison}</Text>
        </View>
      </View>
      <View style={styles.iconWrap}>
        <Ionicons name="trending-up-outline" size={24} color={colors.brand} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', minHeight: 126, marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderLeftWidth: 3, borderColor: colors.line, borderLeftColor: colors.brand, borderRadius: radii.md, backgroundColor: colors.brandSoft },
  copy: { flex: 1, paddingRight: spacing.md },
  label: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  amount: { marginTop: spacing.sm, color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: 0 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  comparison: { fontSize: 12, fontWeight: '700' },
  iconWrap: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});