import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, surfaces } from '../../theme';
import { formatMinorUnits } from '../../utils/formatCurrency';

type Props = { itemCount: number; totalCents: number; onViewCart: () => void; onCheckout: () => void };

export function CartSummaryBar({ itemCount, totalCents, onViewCart, onCheckout }: Props) {
  const hasItems = itemCount > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.info}><Text style={styles.count}>{hasItems ? `${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'}` : 'Carrito vacío'}</Text><Text style={styles.total}>{formatMinorUnits(totalCents)}</Text>{hasItems && <Text style={styles.estimate}>Subtotal estimado</Text>}</View>
      {hasItems && <Pressable accessibilityLabel="Ver carrito" accessibilityRole="button" onPress={onViewCart} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Ver carrito</Text></Pressable>}
      <Pressable accessibilityLabel="Cobrar venta" accessibilityRole="button" accessibilityState={{ disabled: !hasItems }} disabled={!hasItems} onPress={onCheckout} style={({ pressed }) => [styles.primary, !hasItems && styles.disabled, pressed && styles.pressed]}><Text style={styles.primaryText}>Cobrar</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { ...surfaces.card, position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.sm, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, zIndex: 10 },
  info: { flex: 1, minWidth: 74 },
  count: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  total: { marginTop: spacing.xs, color: colors.ink, fontSize: 16, fontWeight: '800' },
  estimate: { marginTop: 2, color: colors.inkMuted, fontSize: 10, fontWeight: '700' },
  secondary: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  primary: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
