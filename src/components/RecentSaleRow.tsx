import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';
import type { RecentSale } from '../types/dashboard';
import { formatCurrency } from '../utils/formatCurrency';

type Props = { sale: RecentSale };

export function RecentSaleRow({ sale }: Props) {
  const statusStyle = statusStyles[sale.status];
  const saleCode = sale.id.replace('sale-', '#');

  return (
    <Pressable
      accessibilityLabel={`${saleCode}, ${sale.customer}, ${sale.time}, ${formatCurrency(sale.amount)}, estado ${sale.status}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <View style={styles.meta}><Text style={styles.code}>{saleCode}</Text><Text style={styles.time}>{sale.time}</Text></View>
        <Text style={styles.name} numberOfLines={1}>{sale.customer}</Text>
      </View>
      <View style={styles.summary}>
        <Text style={styles.value}>{formatCurrency(sale.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.background }]}><Text style={[styles.status, { color: statusStyle.text }]}>{sale.status}</Text></View>
      </View>
    </Pressable>
  );
}

const statusStyles = {
  Pagada: { background: colors.brandSoft, text: colors.brandDark },
  Pendiente: { background: colors.amberSoft, text: colors.amber },
} as const;

const styles = StyleSheet.create({
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { opacity: 0.72 },
  details: { flex: 1, paddingRight: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  code: { color: colors.inkMuted, fontSize: 11, fontWeight: '800' },
  name: { marginTop: spacing.sm, color: colors.ink, fontSize: 14, fontWeight: '700' },
  time: { color: colors.inkMuted, fontSize: 11 },
  summary: { alignItems: 'flex-end', gap: spacing.sm },
  value: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  status: { fontSize: 11, fontWeight: '800' },
});
