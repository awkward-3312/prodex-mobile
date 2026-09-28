import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { memo, useCallback, useEffect, useState } from 'react';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PressableScale, useProdexMotion } from '../motion';
import { colors, fontWeights, radii, spacing, surfaces, shadows, typography } from '../../theme';
import type { PosProduct } from '../../types/pos';
import { formatCurrency } from '../../utils/formatCurrency';
import { StatusBadge } from '../ui/StatusBadge';
import { prodexEasing } from '../motion/easing';

type Props = { product: PosProduct; onPress: (product: PosProduct) => boolean; style?: StyleProp<ViewStyle> };

export const ProductCard = memo(function ProductCard({ product, onPress, style }: Props) {
  // Reserve two text lines and a status slot, including with Dynamic Type.
  const { fontScale } = useWindowDimensions();
  const [imageFailed, setImageFailed] = useState(false);
  const { durations } = useProdexMotion();
  const confirmation = useSharedValue(0);
  const isUnavailable = product.canSell === false || (product.stockStatus === 'Sin stock' && !product.oversellingAllowed);
  const isException = isUnavailable || product.stockStatus === 'Bajo stock' || (!!product.oversellingAllowed && product.stock <= 0);
  const hasImage = !!product.imageUrl && !imageFailed;

  const flashStyle = useAnimatedStyle(() => ({ opacity: confirmation.value * 0.62 }));
  const confirmationStyle = useAnimatedStyle(() => ({ opacity: confirmation.value }));

  useEffect(() => () => cancelAnimation(confirmation), [confirmation]);

  const handlePress = useCallback(() => {
    if (!onPress(product)) return;
    cancelAnimation(confirmation);
    confirmation.value = 0;
    const halfDuration = Math.max(60, Math.round(durations.touch / 2));
    confirmation.value = withSequence(
      withTiming(1, { duration: halfDuration, easing: prodexEasing.emphasis }),
      withTiming(0, { duration: halfDuration, easing: prodexEasing.standard }),
    );
  }, [confirmation, durations.touch, onPress, product]);

  return (
    <PressableScale accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}, ${product.stockStatus}`} accessibilityRole="button" accessibilityState={{ disabled: isUnavailable }} disabled={isUnavailable} onPress={handlePress} style={[styles.card, style, isUnavailable && styles.disabled]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.confirmationFlash, flashStyle]} />
      <View style={styles.image}>
        {hasImage ? <Image source={{ uri: product.imageUrl ?? '' }} onError={() => setImageFailed(true)} resizeMode="contain" style={styles.productImage} /> : <Ionicons name={product.icon} size={28} color={colors.accentDark} />}
      </View>
      <Text style={[styles.name, { height: 36 * fontScale }]} numberOfLines={2}>{product.name}</Text>
      <View style={[styles.priceRow, { height: Math.max(28, 42 * fontScale) }]}>
        <Text style={styles.price} numberOfLines={2}>{formatCurrency(product.price)}</Text>
        <View style={[styles.add, isUnavailable && styles.addUnavailable]}>
          {!isUnavailable && <Ionicons name="add" size={18} color={colors.onAccent} />}
          {!isUnavailable && <Animated.View pointerEvents="none" style={[styles.confirmationIcon, confirmationStyle]}><Ionicons name="checkmark" size={17} color={colors.onAccent} /></Animated.View>}
        </View>
      </View>
      <View style={[styles.statusArea, { height: Math.ceil(16 * fontScale + 10) }]}>
        {isException && (
          <StatusBadge
            label={isUnavailable ? (product.sellabilityReason ?? 'No disponible') : product.oversellingAllowed && product.stock <= 0 ? 'Venta permitida' : `${product.stock} disp.`}
            tone={isUnavailable ? 'critical' : 'warning'}
          />
        )}
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: { ...surfaces.card, ...shadows.card, width: '100%', padding: spacing.md },
  confirmationFlash: { borderRadius: radii.md, backgroundColor: colors.accentSoft },
  image: { backgroundColor: colors.accentSoft, height: 100, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  name: { marginTop: spacing.sm, includeFontPadding: false, textAlignVertical: 'top', color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.xs },
  add: { flexShrink: 0, width: 28, height: 28, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  confirmationIcon: { ...StyleSheet.absoluteFill, borderRadius: 10, backgroundColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  addUnavailable: { backgroundColor: 'transparent' },
  price: { flex: 1, minWidth: 0, includeFontPadding: false, color: colors.ink, fontSize: 17, fontWeight: fontWeights.heavy, lineHeight: 21 },
  statusArea: { marginTop: spacing.xs, justifyContent: 'center' },
  disabled: { opacity: 0.72 },
});
