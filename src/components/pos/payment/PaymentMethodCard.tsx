import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import type { PaymentMethod } from '../../../types/pos';

type Props = { method: PaymentMethod; selected: boolean; onPress: () => void };

const methods: Record<PaymentMethod, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; background: string }> = {
  cash: { label: 'Efectivo', icon: 'cash-outline', color: colors.brand, background: colors.brandSoft },
  card: { label: 'Tarjeta', icon: 'card-outline', color: colors.blue, background: colors.blueSoft },
  transfer: { label: 'Transferencia', icon: 'swap-horizontal-outline', color: colors.teal, background: colors.tealSoft },
  mixed: { label: 'Pago mixto', icon: 'git-compare-outline', color: colors.purple, background: colors.purpleSoft },
};

export function PaymentMethodCard({ method, selected, onPress }: Props) {
  const option = methods[method];
  return <Pressable accessibilityLabel={`Método de pago ${option.label}`} accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: selected ? option.background : colors.surface, borderColor: selected ? option.color : colors.line }, pressed && styles.pressed]}><View style={[styles.icon, { backgroundColor: selected ? colors.surface : option.background }]}><Ionicons name={option.icon} size={22} color={option.color} /></View><Text style={[styles.label, selected && { color: option.color }]}>{option.label}</Text>{selected && <Ionicons name="checkmark-circle" size={17} color={option.color} />}</Pressable>;
}

export function paymentMethodLabel(method: PaymentMethod) { return methods[method].label; }

const styles = StyleSheet.create({
  card: { width: '48%', minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: radii.md },
  icon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
