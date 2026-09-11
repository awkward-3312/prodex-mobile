import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '../../motion';
import { colors, radii, spacing, surfaces, typography } from '../../../theme';
import type { CheckoutCurrency } from '../../../types/mobilePosCheckout';
import { formatCheckoutMinorUnits } from '../../../utils/formatCurrency';

type Props = { totalCents: number; receivedInput: string; receivedCents: number; shortfallCents: number; changeCents: number; quickAmounts: { label: string; cents: number }[]; currency?: CheckoutCurrency; onChange: (value: string) => void; onQuickAmount: (cents: number) => void };

export function CashPaymentForm({ totalCents, receivedInput, receivedCents, shortfallCents, changeCents, quickAmounts, currency, onChange, onQuickAmount }: Props) {
  return <View style={styles.container}><Text style={styles.label}>Monto recibido</Text><TextInput accessibilityLabel="Monto recibido en efectivo" keyboardType="decimal-pad" value={receivedInput} onChangeText={onChange} placeholder="0.00" placeholderTextColor={colors.inkMuted} style={styles.input} /><View style={styles.quickRow}>{quickAmounts.map((amount) => <PressableScale key={amount.label} accessibilityLabel={`Usar ${amount.label}`} accessibilityRole="button" onPress={() => onQuickAmount(amount.cents)} style={styles.quick}><Text style={styles.quickText}>{amount.label}</Text></PressableScale>)}</View><View style={styles.result}><Text style={styles.resultLabel}>Total</Text><Text style={styles.resultValue}>{formatCheckoutMinorUnits(totalCents, currency)}</Text><Text style={styles.resultLabel}>{receivedCents >= totalCents ? 'Cambio' : 'Falta'}</Text><Text style={[styles.resultValue, { color: receivedCents >= totalCents ? colors.brand : colors.red }]}>{formatCheckoutMinorUnits(receivedCents >= totalCents ? changeCents : shortfallCents, currency)}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { ...surfaces.card, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  label: { color: colors.ink, fontSize: typography.caption, fontWeight: '800' },
  input: { ...surfaces.input, marginTop: spacing.sm, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 20, fontWeight: '800' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  quick: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  quickText: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  result: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs, marginTop: spacing.sm },
  resultLabel: { color: colors.inkMuted, fontSize: 12 },
  resultValue: { marginRight: spacing.md, color: colors.ink, fontSize: 13, fontWeight: '800' },
});
