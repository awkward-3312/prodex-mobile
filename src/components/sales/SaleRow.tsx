import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, spacing, typography } from '../../theme';
import type { MobileSale } from '../../types/mobileSales';
import { formatCurrency, parseMinorUnits } from '../../utils/formatCurrency';
import { StatusBadge } from '../ui/StatusBadge';

type Props = { sale: MobileSale };

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

export const SaleRow = memo(function SaleRow({ sale }: Props) {
  const customerName = sale.customer?.name ?? 'Cliente no registrado';

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <View style={styles.topLine}>
          <Text style={styles.reference} numberOfLines={1}>{sale.reference}</Text>
          <Text style={styles.total} numberOfLines={1}>{formatCurrency(parseMinorUnits(sale.grand_total) / 100)}</Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={styles.meta} numberOfLines={1}>{customerName} · {formatSaleDateTime(sale.date)}</Text>
          <StatusBadge label={STATUS_LABEL[sale.payment_status]} tone={sale.payment_status === 'paid' ? 'positive' : 'warning'} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 64, justifyContent: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  main: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reference: { flex: 1, color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold },
  total: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.heavy },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  meta: { flex: 1, color: colors.inkMuted, fontSize: 12 },
});
