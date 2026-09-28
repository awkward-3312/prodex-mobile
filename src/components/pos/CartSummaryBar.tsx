import { StyleSheet, Text, View } from 'react-native';

import { ExactValueFeedback, FadeInView, PressableScale } from '../motion';
import { colors, fontWeights, motion, radii, spacing, shadows, surfaces } from '../../theme';
import { formatMinorUnits } from '../../utils/formatCurrency';

type Props = { itemCount: number; totalCents: number; onViewCart: () => void; onCheckout: () => void };

export function CartSummaryBar({ itemCount, totalCents, onViewCart, onCheckout }: Props) {
  const hasItems = itemCount > 0;

  return (
    <FadeInView style={styles.wrapper} distance={hasItems ? 10 : 0} duration={motion.duration.slow}>
      <View style={styles.info}><ExactValueFeedback style={styles.count} value={hasItems ? `${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'}` : 'Carrito vacío'} /><ExactValueFeedback style={styles.total} value={formatMinorUnits(totalCents)} />{hasItems && <Text style={styles.estimate}>Subtotal estimado</Text>}</View>
      {hasItems && <PressableScale accessibilityLabel="Ver carrito" accessibilityRole="button" onPress={onViewCart} style={styles.secondary}><Text style={styles.secondaryText}>Ver carrito</Text></PressableScale>}
      <PressableScale accessibilityLabel="Cobrar venta" accessibilityRole="button" accessibilityState={{ disabled: !hasItems }} disabled={!hasItems} onPress={onCheckout} scaleTo={motion.pressScalePrimary} style={[styles.primary, !hasItems && styles.disabled]}><Text style={styles.primaryText}>Cobrar</Text></PressableScale>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrapper: { ...surfaces.card, ...shadows.card, position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.sm, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, zIndex: 10, borderTopWidth: 3, borderTopColor: colors.accent },
  info: { flex: 1, minWidth: 74 },
  count: { color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.bold },
  total: { marginTop: spacing.xs, color: colors.ink, fontSize: 16, fontWeight: fontWeights.heavy },
  estimate: { marginTop: 2, color: colors.inkMuted, fontSize: 10, fontWeight: fontWeights.bold },
  secondary: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.bold },
  primary: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  primaryText: { color: colors.onAccent, fontSize: 12, fontWeight: fontWeights.bold },
  disabled: { opacity: 0.45 },
});
