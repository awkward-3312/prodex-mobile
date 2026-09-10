import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { formatMinorUnits } from '../../../utils/formatCurrency';

type Props = { totalCents: number; receivedInput: string; receivedCents: number; shortfallCents: number; changeCents: number; quickAmounts: { label: string; cents: number }[]; onChange: (value: string) => void; onQuickAmount: (cents: number) => void };

export function CashPaymentForm({ totalCents, receivedInput, receivedCents, shortfallCents, changeCents, quickAmounts, onChange, onQuickAmount }: Props) {
  return <View style={styles.container}><Text style={styles.label}>Monto recibido</Text><TextInput accessibilityLabel="Monto recibido en efectivo" keyboardType="decimal-pad" value={receivedInput} onChangeText={onChange} placeholder="0.00" placeholderTextColor={colors.inkMuted} style={styles.input} /><View style={styles.quickRow}>{quickAmounts.map((amount) => <Pressable key={amount.label} accessibilityLabel={`Usar ${amount.label}`} accessibilityRole="button" onPress={() => onQuickAmount(amount.cents)} style={({ pressed }) => [styles.quick, pressed && styles.pressed]}><Text style={styles.quickText}>{amount.label}</Text></Pressable>)}</View><View style={styles.result}><Text style={styles.resultLabel}>Total</Text><Text style={styles.resultValue}>{formatMinorUnits(totalCents)}</Text><Text style={styles.resultLabel}>{receivedCents >= totalCents ? 'Cambio' : 'Falta'}</Text><Text style={[styles.resultValue, { color: receivedCents >= totalCents ? colors.brand : colors.red }]}>{formatMinorUnits(receivedCents >= totalCents ? changeCents : shortfallCents)}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.brandSoft },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 50, marginTop: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surface, color: colors.ink, fontSize: 22, fontWeight: '800', borderWidth: 1, borderColor: colors.line },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  quick: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  quickText: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  result: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs, marginTop: spacing.md },
  resultLabel: { color: colors.inkMuted, fontSize: 12 },
  resultValue: { marginRight: spacing.md, color: colors.ink, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
