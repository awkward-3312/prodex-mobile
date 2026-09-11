import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { memo, useState } from 'react';

import { PressableScale } from '../motion';
import { colors, fontWeights, radii, spacing, surfaces, shadows, typography } from '../../theme';
import type { PosProduct } from '../../types/pos';
import { formatCurrency } from '../../utils/formatCurrency';
import { StatusBadge } from '../ui/StatusBadge';

type Props = { product: PosProduct; onPress: () => void; style?: StyleProp<ViewStyle> };

const tones = {
  blue: { background: colors.blueSoft, icon: colors.blue },
  teal: { background: colors.tealSoft, icon: colors.teal },
  amber: { background: colors.amberSoft, icon: colors.amber },
  red: { background: colors.redSoft, icon: colors.red },
};

export const ProductCard = memo(function ProductCard({ product, onPress, style }: Props) {
  // Reserve two text lines and a status slot, including with Dynamic Type.
  const { fontScale } = useWindowDimensions();
  const [imageFailed, setImageFailed] = useState(false);
  const isUnavailable = product.canSell === false || (product.stockStatus === 'Sin stock' && !product.oversellingAllowed);
  const isException = isUnavailable || product.stockStatus === 'Bajo stock' || (!!product.oversellingAllowed && product.stock <= 0);
  const tone = tones[product.tone];
  const hasImage = !!product.imageUrl && !imageFailed;

  return (
    <PressableScale accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}, ${product.stockStatus}`} accessibilityRole="button" accessibilityState={{ disabled: isUnavailable }} disabled={isUnavailable} onPress={onPress} style={[styles.card, style, isUnavailable && styles.disabled]}>
      <View style={[styles.image, { backgroundColor: tone.background }]}>
        {hasImage ? <Image source={{ uri: product.imageUrl ?? '' }} onError={() => setImageFailed(true)} resizeMode="contain" style={styles.productImage} /> : <Ionicons name={product.icon} size={28} color={tone.icon} />}
      </View>
      <Text style={[styles.name, { height: 36 * fontScale }]} numberOfLines={2}>{product.name}</Text>
      <View style={[styles.priceRow, { height: Math.max(28, 42 * fontScale) }]}>
        <Text style={styles.price} numberOfLines={2}>{formatCurrency(product.price)}</Text>
        <View style={[styles.add, isUnavailable && styles.addUnavailable]}>
          {!isUnavailable && <Ionicons name="add" size={18} color={colors.white} />}
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
  image: { height: 100, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  name: { marginTop: spacing.sm, includeFontPadding: false, textAlignVertical: 'top', color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.xs },
  add: { flexShrink: 0, width: 28, height: 28, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  addUnavailable: { backgroundColor: 'transparent' },
  price: { flex: 1, minWidth: 0, includeFontPadding: false, color: colors.ink, fontSize: 17, fontWeight: fontWeights.heavy, lineHeight: 21 },
  statusArea: { marginTop: spacing.xs, justifyContent: 'center' },
  disabled: { opacity: 0.72 },
});
