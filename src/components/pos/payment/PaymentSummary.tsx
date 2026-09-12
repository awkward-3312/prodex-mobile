import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../../theme';
import { formatCheckoutMinorUnits } from '../../../utils/formatCurrency';
import type { CheckoutCurrency } from '../../../types/mobilePosCheckout';

type Props = {
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  authoritative?: boolean;
  currency?: CheckoutCurrency;
};

function money(value: number, currency?: CheckoutCurrency) {
  return formatCheckoutMinorUnits(value, currency);
}

export function PaymentSummary({ itemCount, subtotalCents, discountCents, taxCents, totalCents, authoritative = false, currency }: Props) {
  return <View style={[styles.card, authoritative && styles.validated]}><View style={styles.header}><View><Text style={styles.title}>Resumen</Text><Text style={styles.mode}>{authoritative ? 'Validado por PRODEX' : 'Pendiente de validación fiscal'}</Text></View><Text style={styles.count}>{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</Text></View><View style={styles.line}><Text style={styles.label}>{authoritative ? 'Subtotal' : 'Subtotal estimado'}</Text><Text style={styles.value}>{money(subtotalCents, currency)}</Text></View>{discountCents > 0 && <View style={styles.line}><Text style={styles.label}>Descuento</Text><Text style={styles.value}>{money(discountCents, currency)}</Text></View>}<View style={styles.line}><Text style={styles.label}>{authoritative ? 'ISV' : 'Impuesto'}</Text><Text style={styles.value}>{authoritative ? money(taxCents, currency) : 'Pendiente'}</Text></View><View style={styles.totalLine}><Text style={styles.totalLabel}>{authoritative ? 'Total' : 'Estimado'}</Text><Text style={styles.total}>{money(totalCents, currency)}</Text></View></View>;
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, padding: spacing.lg },
  validated: { borderColor: colors.brandSoft, backgroundColor: colors.surface },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  title: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  mode: { marginTop: 2, color: colors.inkMuted, fontSize: typography.label, fontWeight: fontWeights.bold },
  count: { color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.bold },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  label: { color: colors.inkMuted, fontSize: 12 },
  value: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.brandSoft, borderRadius: radii.sm, gap: spacing.sm, flexWrap: 'wrap' },
  totalLabel: { color: colors.brandDark, fontSize: 13, fontWeight: fontWeights.bold },
  total: { color: colors.brandDark, fontSize: 28, fontWeight: fontWeights.heavy },
});
