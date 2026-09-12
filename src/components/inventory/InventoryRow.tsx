import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, radii, spacing, typography } from '../../theme';
import type { MobileInventoryItem } from '../../types/mobileInventory';
import { formatQuantity } from '../../utils/formatQuantity';
import { StatusBadge } from '../ui/StatusBadge';

type Props = { item: MobileInventoryItem };

export const InventoryRow = memo(function InventoryRow({ item }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = !!item.image_url && !imageFailed;
  // display_name already composes "Producto · Variante" server-side — the
  // secondary line must not repeat variant_name, only code/SKU, falling back
  // to GTIN only when there is no code to show.
  const secondary = item.code ?? item.gtin ?? '—';
  const isOutOfStock = item.inventory.out_of_stock;
  const isLowStock = item.inventory.low_stock;
  const isException = isOutOfStock || isLowStock;

  return (
    <View style={styles.row}>
      <View style={styles.image}>
        {hasImage ? (
          <Image source={{ uri: item.image_url ?? '' }} onError={() => setImageFailed(true)} style={styles.productImage} />
        ) : (
          <Ionicons name="cube-outline" size={18} color={colors.inkMuted} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>{item.display_name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{secondary}</Text>
      </View>
      <View style={styles.stockColumn}>
        <Text style={[styles.quantity, isOutOfStock && styles.quantityUnavailable]} numberOfLines={1}>
          {formatQuantity(item.inventory.available_quantity)}
        </Text>
        {isException && <StatusBadge label={isOutOfStock ? 'Agotado' : 'Bajo stock'} tone={isOutOfStock ? 'critical' : 'warning'} />}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  image: { width: 46, height: 46, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold },
  meta: { marginTop: 2, color: colors.inkMuted, fontSize: 12 },
  stockColumn: { minWidth: 74, alignItems: 'flex-end', gap: 2 },
  quantity: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.heavy },
  quantityUnavailable: { color: colors.red },
});
