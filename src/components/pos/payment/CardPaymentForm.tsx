import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';

type Props = { reference: string; onChange: (value: string) => void };

export function CardPaymentForm({ reference, onChange }: Props) {
  return <View style={styles.container}><Text style={styles.label}>Tarjeta</Text><Text style={styles.hint}>Cobro simulado, sin terminal ni pasarela.</Text><Text style={styles.inputLabel}>Referencia opcional</Text><TextInput accessibilityLabel="Referencia de tarjeta opcional" value={reference} onChangeText={onChange} placeholder="Ej. POS-001" placeholderTextColor={colors.inkMuted} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.blueSoft },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  hint: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 11 },
  inputLabel: { marginTop: spacing.md, color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  input: { minHeight: 46, marginTop: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surface, color: colors.ink, borderWidth: 1, borderColor: colors.line },
});
