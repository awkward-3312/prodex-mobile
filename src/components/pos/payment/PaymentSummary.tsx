import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../theme';
import { formatMinorUnits } from '../../../utils/formatCurrency';

type Props = { itemCount: number; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number };

export function PaymentSummary({ itemCount, subtotalCents, discountCents, taxCents, totalCents }: Props) {
  return <View style={styles.card}><View style={styles.header}><Text style={styles.title}>Resumen de la venta</Text><Text style={styles.count}>{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</Text></View><View style={styles.line}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>{formatMinorUnits(subtotalCents)}</Text></View><View style={styles.line}><Text style={styles.label}>Descuento</Text><Text style={styles.value}>{formatMinorUnits(discountCents)}</Text></View><View style={styles.line}><Text style={styles.label}>Impuestos</Text><Text style={styles.value}>{formatMinorUnits(taxCents)}</Text></View><View style={styles.totalLine}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.total}>{formatMinorUnits(totalCents)}</Text></View></View>;
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  count: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  label: { color: colors.inkMuted, fontSize: 12 },
  value: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  totalLabel: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
  total: { color: colors.brandDark, fontSize: 24, fontWeight: '800' },
});
