import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, radii, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { StatusBadge } from '../ui/StatusBadge';
import type { CashRegisterHistoryItem } from '../../services/cashRegister/mobileCashRegisterService';

type Props = { item: CashRegisterHistoryItem };

function statusTone(closingStatus: string | null): 'positive' | 'warning' {
  return closingStatus === 'balanced' ? 'positive' : 'warning';
}

export const CashRegisterHistoryRow = memo(function CashRegisterHistoryRow({ item }: Props) {
  const location = item.inventoryLocation ?? item.branch ?? item.warehouse;

  return (
    <View style={styles.row}>
      <View style={styles.topLine}>
        <Text style={styles.title} numberOfLines={1}>Caja #{item.id}</Text>
        {item.totalSales ? <Text style={styles.total} numberOfLines={1}>{formatCurrency(Number(item.totalSales))}</Text> : null}
      </View>
      <View style={styles.bottomLine}>
        <Text style={styles.meta} numberOfLines={1}>{[item.user.name, location].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</Text>
        {item.closingStatusLabel ? <StatusBadge label={item.closingStatusLabel} tone={statusTone(item.closingStatus)} /> : null}
      </View>
      {item.closedAt ? <Text style={styles.date}>{item.closedAt}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 88, justifyContent: 'center', padding: spacing.lg, marginBottom: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 7 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold },
  total: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.heavy },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  meta: { flex: 1, color: colors.inkMuted, fontSize: 12 },
  date: { color: colors.inkMuted, fontSize: 11 },
});
