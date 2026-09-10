import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';

type Props = { reference: string; onChange: (value: string) => void };

export function TransferPaymentForm({ reference, onChange }: Props) {
  return <View style={styles.container}><Text style={styles.label}>Transferencia</Text><Text style={styles.hint}>Registra una referencia para el comprobante.</Text><TextInput accessibilityLabel="Referencia de transferencia opcional" value={reference} onChangeText={onChange} placeholder="Número de comprobante" placeholderTextColor={colors.inkMuted} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.tealSoft },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  hint: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 11 },
  input: { minHeight: 46, marginTop: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surface, color: colors.ink, borderWidth: 1, borderColor: colors.line },
});
