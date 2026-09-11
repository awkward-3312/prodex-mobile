import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { FadeInView, PressableScale } from '../motion';
import { colors, fontWeights, motion, radii, spacing, surfaces } from '../../theme';
import { formatMinorUnits } from '../../utils/formatCurrency';

type Props = { itemCount: number; totalCents: number; onViewCart: () => void; onCheckout: () => void };

export function CartSummaryBar({ itemCount, totalCents, onViewCart, onCheckout }: Props) {
  const hasItems = itemCount > 0;
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  const totalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    if (!hasItems) return;
    pulse.value = reducedMotion ? 1 : withSequence(withTiming(1.035, { duration: motion.duration.fast }), withTiming(1, { duration: motion.duration.fast }));
  }, [hasItems, itemCount, pulse, reducedMotion, totalCents]);

  return (
    <FadeInView style={styles.wrapper} distance={hasItems ? 10 : 0} duration={motion.duration.slow}>
      <View style={styles.info}><Text style={styles.count}>{hasItems ? `${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'}` : 'Carrito vacío'}</Text><Animated.Text style={[styles.total, totalStyle]}>{formatMinorUnits(totalCents)}</Animated.Text>{hasItems && <Text style={styles.estimate}>Subtotal estimado</Text>}</View>
      {hasItems && <PressableScale accessibilityLabel="Ver carrito" accessibilityRole="button" onPress={onViewCart} style={styles.secondary}><Text style={styles.secondaryText}>Ver carrito</Text></PressableScale>}
      <PressableScale accessibilityLabel="Cobrar venta" accessibilityRole="button" accessibilityState={{ disabled: !hasItems }} disabled={!hasItems} onPress={onCheckout} scaleTo={motion.pressScalePrimary} style={[styles.primary, !hasItems && styles.disabled]}><Text style={styles.primaryText}>Cobrar</Text></PressableScale>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrapper: { ...surfaces.card, position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.sm, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, zIndex: 10 },
  info: { flex: 1, minWidth: 74 },
  count: { color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.bold },
  total: { marginTop: spacing.xs, color: colors.ink, fontSize: 16, fontWeight: fontWeights.heavy },
  estimate: { marginTop: 2, color: colors.inkMuted, fontSize: 10, fontWeight: fontWeights.bold },
  secondary: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.bold },
  primary: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 12, fontWeight: fontWeights.bold },
  disabled: { opacity: 0.45 },
});
