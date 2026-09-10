import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../theme';
import { formatMinorUnits } from '../../../utils/formatCurrency';

type Props = { saleNumber: string; totalCents: number; method: string; customer: string; completedAt: string; changeCents: number; onNewSale: () => void; onReceipt: () => void };

export function SaleSuccess({ saleNumber, totalCents, method, customer, completedAt, changeCents, onNewSale, onReceipt }: Props) {
  return <View style={styles.screen}><View style={styles.icon}><Ionicons name="checkmark" size={36} color={colors.brand} /></View><Text style={styles.title}>Venta completada</Text><Text style={styles.number}>{saleNumber}</Text><View style={styles.summary}><View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{formatMinorUnits(totalCents)}</Text></View><View style={styles.row}><Text style={styles.label}>Método</Text><Text style={styles.value}>{method}</Text></View><View style={styles.row}><Text style={styles.label}>Cliente</Text><Text style={styles.value}>{customer}</Text></View><View style={styles.row}><Text style={styles.label}>Fecha y hora</Text><Text style={styles.value}>{completedAt}</Text></View>{changeCents > 0 && <View style={styles.row}><Text style={styles.label}>Cambio</Text><Text style={[styles.value, { color: colors.brand }]}>{formatMinorUnits(changeCents)}</Text></View>}</View><Pressable accessibilityLabel="Iniciar nueva venta" accessibilityRole="button" onPress={onNewSale} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Nueva venta</Text></Pressable><Pressable accessibilityLabel="Ver comprobante" accessibilityRole="button" onPress={onReceipt} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Ver comprobante</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  icon: { width: 76, height: 76, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  title: { marginTop: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  number: { marginTop: spacing.xs, color: colors.brand, fontSize: 13, fontWeight: '800' },
  summary: { width: '100%', marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  totalLabel: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  total: { color: colors.brandDark, fontSize: 24, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  label: { color: colors.inkMuted, fontSize: 12 },
  value: { maxWidth: '58%', color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  primary: { width: '100%', minHeight: 48, marginTop: spacing.xl, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  secondary: { minHeight: 44, marginTop: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.brand, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
