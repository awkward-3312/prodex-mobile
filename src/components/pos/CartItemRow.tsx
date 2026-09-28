import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { ExactValueFeedback, PressableScale, useProdexMotion } from '../motion';
import { colors, fontWeights, motion, radii, spacing } from '../../theme';
import type { CartItem } from '../../types/pos';
import { formatMinorUnits } from '../../utils/formatCurrency';
import { calculateLineSubtotalMinorUnits } from '../../utils/posCart';

type Props = { item: CartItem; animateEntering?: boolean; onIncrease: (id: string) => void; onDecrease: (id: string) => void; onRemove: (id: string) => void };

export const CartItemRow = memo(function CartItemRow({ item, animateEntering = false, onIncrease, onDecrease, onRemove }: Props) {
  const { reducedMotion } = useProdexMotion();
  const productId = item.product.id;
  const entering = reducedMotion
    ? FadeIn.duration(motion.duration.touch)
    : FadeInDown.duration(motion.duration.state).withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] });
  const exiting = FadeOut.duration(reducedMotion ? motion.duration.touch : motion.duration.exit);

  return (
    <Animated.View entering={animateEntering ? entering : undefined} exiting={exiting} layout={reducedMotion ? undefined : LinearTransition.duration(motion.duration.exit)} style={styles.row}>
      <View style={styles.copy}><Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>{item.product.variantName ? <Text style={styles.variant} numberOfLines={1}>{item.product.variantName}</Text> : null}<Text style={styles.unit}>{formatMinorUnits(item.unitPriceCents)} c/u</Text></View>
      <View style={styles.controls}><PressableScale accessibilityLabel={`Disminuir cantidad de ${item.product.name}`} accessibilityRole="button" onPress={() => onDecrease(productId)} style={styles.control}><Ionicons name="remove" size={17} color={colors.ink} /></PressableScale><ExactValueFeedback style={styles.quantity} value={item.quantity} /><PressableScale accessibilityLabel={`Aumentar cantidad de ${item.product.name}`} accessibilityRole="button" onPress={() => onIncrease(productId)} style={styles.control}><Ionicons name="add" size={17} color={colors.ink} /></PressableScale></View>
      <View style={styles.total}><ExactValueFeedback style={styles.subtotal} value={formatMinorUnits(calculateLineSubtotalMinorUnits(item.unitPriceCents, item.quantity))} /><PressableScale accessibilityLabel={`Eliminar ${item.product.name}`} accessibilityRole="button" onPress={() => onRemove(productId)} style={styles.remove}><Ionicons name="trash-outline" size={17} color={colors.red} /></PressableScale></View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 76, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  copy: { flexGrow: 1, flexBasis: '100%' },
  name: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold, lineHeight: 17 },
  variant: { marginTop: 2, color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.medium },
  unit: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  control: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  quantity: { minWidth: 18, color: colors.ink, fontSize: 13, fontWeight: fontWeights.semibold, textAlign: 'center' },
  total: { minWidth: 62, alignItems: 'flex-end', gap: spacing.xs },
  subtotal: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
