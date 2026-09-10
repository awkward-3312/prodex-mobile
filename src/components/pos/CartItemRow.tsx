import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';
import type { CartItem } from '../../types/pos';
import { formatMinorUnits } from '../../utils/formatCurrency';

type Props = { item: CartItem; onIncrease: () => void; onDecrease: () => void; onRemove: () => void };

export function CartItemRow({ item, onIncrease, onDecrease, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.name} numberOfLines={2}>{item.product.name}</Text><Text style={styles.unit}>{formatMinorUnits(item.unitPriceCents)} c/u</Text></View>
      <View style={styles.controls}><Pressable accessibilityLabel={`Disminuir cantidad de ${item.product.name}`} accessibilityRole="button" onPress={onDecrease} style={styles.control}><Ionicons name="remove" size={17} color={colors.ink} /></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable accessibilityLabel={`Aumentar cantidad de ${item.product.name}`} accessibilityRole="button" onPress={onIncrease} style={styles.control}><Ionicons name="add" size={17} color={colors.ink} /></Pressable></View>
      <View style={styles.total}><Text style={styles.subtotal}>{formatMinorUnits(item.unitPriceCents * item.quantity)}</Text><Pressable accessibilityLabel={`Eliminar ${item.product.name}`} accessibilityRole="button" onPress={onRemove} style={styles.remove}><Ionicons name="trash-outline" size={17} color={colors.red} /></Pressable></View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  unit: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 11 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  control: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  quantity: { minWidth: 18, color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  total: { minWidth: 62, alignItems: 'flex-end', gap: spacing.xs },
  subtotal: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
