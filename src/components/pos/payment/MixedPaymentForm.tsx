import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { formatMinorUnits } from '../../../utils/formatCurrency';

type Props = { totalCents: number; cashInput: string; cardInput: string; transferInput: string; paidCents: number; pendingCents: number; excessCents: number; onChange: (method: 'cash' | 'card' | 'transfer', value: string) => void };

export function MixedPaymentForm({ totalCents, cashInput, cardInput, transferInput, paidCents, pendingCents, excessCents, onChange }: Props) {
  const fields = [{ key: 'cash' as const, label: 'Efectivo', value: cashInput, color: colors.brand }, { key: 'card' as const, label: 'Tarjeta', value: cardInput, color: colors.blue }, { key: 'transfer' as const, label: 'Transferencia', value: transferInput, color: colors.teal }];
  return <View style={styles.container}><Text style={styles.label}>Distribuye el total</Text>{fields.map((field) => <View key={field.key} style={styles.field}><Text style={[styles.fieldLabel, { color: field.color }]}>{field.label}</Text><TextInput accessibilityLabel={`Monto de ${field.label}`} keyboardType="decimal-pad" value={field.value} onChangeText={(value) => onChange(field.key, value)} placeholder="0.00" placeholderTextColor={colors.inkMuted} style={styles.input} /></View>)}<View style={styles.status}><View><Text style={styles.statusLabel}>Total</Text><Text style={styles.statusValue}>{formatMinorUnits(totalCents)}</Text></View><View><Text style={styles.statusLabel}>Pagado</Text><Text style={styles.statusValue}>{formatMinorUnits(paidCents)}</Text></View><View><Text style={styles.statusLabel}>{excessCents > 0 ? 'Exceso' : 'Pendiente'}</Text><Text style={[styles.statusValue, { color: excessCents > 0 ? colors.red : pendingCents === 0 ? colors.brand : colors.amber }]}>{formatMinorUnits(excessCents > 0 ? excessCents : pendingCents)}</Text></View></View></View>;
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.purpleSoft },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  field: { marginTop: spacing.sm },
  fieldLabel: { fontSize: 11, fontWeight: '800' },
  input: { minHeight: 44, marginTop: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surface, color: colors.ink, borderWidth: 1, borderColor: colors.line },
  status: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  statusLabel: { color: colors.inkMuted, fontSize: 11 },
  statusValue: { marginTop: spacing.xs, color: colors.ink, fontSize: 13, fontWeight: '800' },
});
