import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { memo, useState } from 'react';

import { PressableScale } from '../motion';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../theme';
import type { PosProduct } from '../../types/pos';
import { formatCurrency } from '../../utils/formatCurrency';

type Props = { product: PosProduct; onPress: () => void; style?: StyleProp<ViewStyle> };

const tones = {
  blue: { background: colors.blueSoft, icon: colors.blue },
  teal: { background: colors.tealSoft, icon: colors.teal },
  amber: { background: colors.amberSoft, icon: colors.amber },
  red: { background: colors.redSoft, icon: colors.red },
};

export const ProductCard = memo(function ProductCard({ product, onPress, style }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const isUnavailable = product.canSell === false || (product.stockStatus === 'Sin stock' && !product.oversellingAllowed);
  const isException = isUnavailable || product.stockStatus === 'Bajo stock' || (!!product.oversellingAllowed && product.stock <= 0);
  const tone = tones[product.tone];
  const hasImage = !!product.imageUrl && !imageFailed;

  return (
    <PressableScale accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}, ${product.stockStatus}`} accessibilityRole="button" accessibilityState={{ disabled: isUnavailable }} disabled={isUnavailable} onPress={onPress} style={[styles.card, style, isUnavailable && styles.disabled]}>
      <View style={[styles.image, { backgroundColor: tone.background }]}>
        {hasImage ? <Image source={{ uri: product.imageUrl ?? '' }} onError={() => setImageFailed(true)} style={styles.productImage} /> : <Ionicons name={product.icon} size={28} color={tone.icon} />}
      </View>
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.price}>{formatCurrency(product.price)}</Text>
      {isException && (
        <View style={[styles.stockBadge, isUnavailable ? styles.stockUnavailable : styles.stockLow]}>
          <Text style={[styles.stock, !isUnavailable && styles.lowStock, isUnavailable && styles.unavailable]} numberOfLines={1}>{isUnavailable ? (product.sellabilityReason ?? 'No disponible') : product.oversellingAllowed && product.stock <= 0 ? 'Venta permitida' : `${product.stock} disp.`}</Text>
        </View>
      )}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: { ...surfaces.card, width: '48%', minHeight: 166, padding: spacing.sm },
  image: { height: 78, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  name: { marginTop: spacing.sm, color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold, lineHeight: 18 },
  price: { marginTop: spacing.xs, color: colors.ink, fontSize: 17, fontWeight: fontWeights.heavy, lineHeight: 21 },
  stockBadge: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
  stockLow: { backgroundColor: colors.amberSoft },
  stockUnavailable: { backgroundColor: colors.redSoft },
  stock: { color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.semibold },
  lowStock: { color: colors.amber },
  unavailable: { color: colors.red },
  disabled: { opacity: 0.48 },
});
