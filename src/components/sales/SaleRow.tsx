import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, radii, spacing, typography } from '../../theme';
import type { MobileSale } from '../../types/mobileSales';
import { formatCurrency, parseMinorUnits } from '../../utils/formatCurrency';
import { PressableScale } from '../motion';
import { StatusBadge } from '../ui/StatusBadge';

type Props = { sale: MobileSale; onPress?: (sale: MobileSale) => void };

const STATUS_LABEL: Record<MobileSale['payment_status'], string> = {
  paid: 'Pagada',
  partial: 'Parcial',
  unpaid: 'Pendiente',
};

function formatSaleDateTime(value: string): string {
  const [datePart, timePart] = value.split(' ');
  if (!datePart) return value;
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return value;

  let hours = 0;
  let minutes = 0;
  if (timePart) {
    const [h, mi] = timePart.split(':').map(Number);
    hours = Number.isFinite(h) ? h : 0;
    minutes = Number.isFinite(mi) ? mi : 0;
  }

  const date = new Date(y, m - 1, d, hours, minutes);
  if (Number.isNaN(date.getTime())) return value;

  const datePortion = date.toLocaleDateString('es-HN', { day: '2-digit', month: 'short' });
  const timePortion = date.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  return `${datePortion}, ${timePortion}`;
}

export const SaleRow = memo(function SaleRow({ sale, onPress }: Props) {
  const customerName = sale.customer?.name ?? 'Cliente no registrado';
  const totalLabel = formatCurrency(parseMinorUnits(sale.grand_total) / 100);
  const content = (
    <View style={styles.main}>
      <View style={styles.topLine}>
        <Text style={styles.reference} numberOfLines={1}>{sale.reference}</Text>
        <Text style={styles.total} numberOfLines={1}>{totalLabel}</Text>
      </View>
      <View style={styles.bottomLine}>
        <Text style={styles.meta} numberOfLines={1}>{customerName}</Text>
        <StatusBadge label={STATUS_LABEL[sale.payment_status]} tone={sale.payment_status === 'paid' ? 'positive' : 'warning'} />
      </View>
      <Text style={styles.date}>{formatSaleDateTime(sale.date)}</Text>
    </View>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Abrir factura ${sale.reference}, total ${totalLabel}`}
      onPress={() => onPress(sale)}
      style={styles.row}
    >
      <View style={styles.rowInner}>
        {content}
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 104, justifyContent: 'center', padding: spacing.lg, marginBottom: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  main: { flex: 1, gap: 7 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reference: { flex: 1, color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold },
  total: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.heavy },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  date: { color: colors.inkMuted, fontSize: 11 },
  meta: { flex: 1, color: colors.inkMuted, fontSize: 12 },
});
