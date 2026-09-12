import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../../motion';
import { colors, fontWeights, radii, spacing, typography } from '../../../theme';
import type { CheckoutPaymentMethod } from '../../../types/mobilePosCheckout';

type PaymentOption = CheckoutPaymentMethod | { id: 'mixed'; name: string; type: 'mixed'; is_cash: false; is_card: false };
type Props = { method: PaymentOption; selected: boolean; onPress: () => void };

function methodStyle(method: PaymentOption): { icon: keyof typeof Ionicons.glyphMap; color: string; background: string } {
  if (method.id === 'mixed') return { icon: 'git-compare-outline', color: colors.purple, background: colors.purpleSoft };
  if (method.is_cash) return { icon: 'cash-outline', color: colors.brand, background: colors.brandSoft };
  if (method.is_card) return { icon: 'card-outline', color: colors.blue, background: colors.blueSoft };
  return { icon: 'swap-horizontal-outline', color: colors.teal, background: colors.tealSoft };
}

export function displayPaymentMethodName(method: PaymentOption) {
  if (method.id === 'mixed') return method.name;
  const normalized = method.name.trim().toLowerCase();
  if (normalized === 'tpe' || normalized === 'western union') return method.name;
  if (normalized === 'cash') return 'Efectivo';
  if (normalized === 'bank transfer') return 'Transferencia bancaria';
  if (normalized === 'check') return 'Cheque';
  if (normalized === 'credit card') return 'Tarjeta de crédito';
  if (normalized === 'other') return 'Otro';
  return method.name;
}

export function PaymentMethodCard({ method, selected, onPress }: Props) {
  const option = methodStyle(method);
  const label = displayPaymentMethodName(method);
  return <PressableScale accessibilityLabel={`Método de pago ${label}`} accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.card, { backgroundColor: selected ? option.background : colors.surface, borderColor: selected ? option.color : colors.line }]}><View style={[styles.icon, { backgroundColor: selected ? colors.surface : option.background }]}><Ionicons name={option.icon} size={22} color={option.color} /></View><Text style={[styles.label, selected && { color: option.color }]}>{label}</Text>{selected && <Ionicons name="checkmark-circle" size={17} color={option.color} />}</PressableScale>;
}

const styles = StyleSheet.create({
  card: { width: '48%', minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, borderWidth: 1, borderRadius: radii.sm },
  icon: { width: 32, height: 32, borderRadius: radii.xs, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: colors.ink, fontSize: typography.caption, fontWeight: fontWeights.semibold },
});
