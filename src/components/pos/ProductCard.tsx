import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { colors, radii, spacing } from '../../theme';
import type { PosProduct } from '../../types/pos';
import { formatCurrency } from '../../utils/formatCurrency';

type Props = { product: PosProduct; onPress: () => void };

const tones = {
  blue: { background: colors.blueSoft, icon: colors.blue },
  teal: { background: colors.tealSoft, icon: colors.teal },
  amber: { background: colors.amberSoft, icon: colors.amber },
  red: { background: colors.redSoft, icon: colors.red },
};

export function ProductCard({ product, onPress }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const isUnavailable = product.canSell === false || (product.stockStatus === 'Sin stock' && !product.oversellingAllowed);
  const tone = tones[product.tone];
  const hasImage = !!product.imageUrl && !imageFailed;

  return (
    <Pressable accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}, ${product.stockStatus}`} accessibilityRole="button" accessibilityState={{ disabled: isUnavailable }} disabled={isUnavailable} onPress={onPress} style={({ pressed }) => [styles.card, isUnavailable && styles.disabled, pressed && styles.pressed]}>
      <View style={[styles.image, { backgroundColor: tone.background }]}>
        {hasImage ? <Image source={{ uri: product.imageUrl ?? '' }} onError={() => setImageFailed(true)} style={styles.productImage} /> : <Ionicons name={product.icon} size={28} color={tone.icon} />}
      </View>
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.price}>{formatCurrency(product.price)}</Text>
      <View style={styles.stockRow}>
        <View style={[styles.dot, { backgroundColor: isUnavailable ? colors.red : product.stockStatus === 'Bajo stock' ? colors.amber : colors.brand }]} />
        <Text style={[styles.stock, product.stockStatus === 'Bajo stock' && styles.lowStock, isUnavailable && styles.unavailable]}>{isUnavailable ? (product.sellabilityReason ?? 'No disponible') : product.oversellingAllowed && product.stock <= 0 ? 'Venta permitida' : `${product.stock} disponibles`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', minHeight: 180, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  image: { height: 90, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  name: { marginTop: spacing.sm, color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 18 },
  price: { marginTop: spacing.xs, color: colors.ink, fontSize: 18, fontWeight: '800', lineHeight: 22 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: radii.pill },
  stock: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  lowStock: { color: colors.amber },
  unavailable: { color: colors.red },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.75 },
});
