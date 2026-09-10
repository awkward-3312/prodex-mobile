import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../../theme';
import type { CartItem } from '../../types/pos';
import { formatMinorUnits } from '../../utils/formatCurrency';
import { CartItemRow } from './CartItemRow';

type Props = { visible: boolean; items: CartItem[]; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number; onClose: () => void; onIncrease: (id: string) => void; onDecrease: (id: string) => void; onRemove: (id: string) => void; onCheckout: () => void };

export function CartSheet({ visible, items, subtotalCents, discountCents, taxCents, totalCents, onClose, onIncrease, onDecrease, onRemove, onCheckout }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const hasItems = items.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Cerrar carrito" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <SafeAreaView edges={[]} style={[styles.sheet, { maxHeight: height * 0.8, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.header}><View><Text style={styles.title}>Carrito actual</Text><Text style={styles.customerLabel}>Cliente</Text><Text style={styles.customer}>Consumidor final</Text></View><Pressable accessibilityLabel="Cerrar carrito" accessibilityRole="button" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color={colors.ink} /></Pressable></View>
          <View style={styles.customerAction}><Text style={styles.customerHint}>Venta sin cliente asignado</Text><Pressable accessibilityLabel="Cambiar cliente" accessibilityRole="button" onPress={() => undefined}><Text style={styles.change}>Cambiar</Text></Pressable></View>
          <Text style={styles.productsTitle}>Productos</Text>
          <ScrollView style={styles.items} contentContainerStyle={styles.itemsContent} showsVerticalScrollIndicator={false}>
            {hasItems ? items.map((item) => <CartItemRow key={item.product.id} item={item} onIncrease={() => onIncrease(item.product.id)} onDecrease={() => onDecrease(item.product.id)} onRemove={() => onRemove(item.product.id)} />) : <Text style={styles.empty}>Agrega productos para comenzar la venta.</Text>}
          </ScrollView>
          <View style={styles.totals}><View style={styles.totalLine}><Text style={styles.muted}>Subtotal</Text><Text style={styles.lineValue}>{formatMinorUnits(subtotalCents)}</Text></View><View style={styles.totalLine}><Text style={styles.muted}>Descuento</Text><Text style={styles.lineValue}>{formatMinorUnits(discountCents)}</Text></View><View style={styles.totalLine}><Text style={styles.muted}>Impuestos</Text><Text style={styles.lineValue}>{formatMinorUnits(taxCents)}</Text></View><View style={styles.grandLine}><Text style={styles.grandLabel}>Total</Text><Text style={styles.grandValue}>{formatMinorUnits(totalCents)}</Text></View></View>
          <Pressable accessibilityLabel="Cobrar venta" accessibilityRole="button" accessibilityState={{ disabled: !hasItems }} disabled={!hasItems} onPress={onCheckout} style={({ pressed }) => [styles.checkout, !hasItems && styles.disabled, pressed && styles.pressed]}><Text style={styles.checkoutText}>Cobrar</Text></Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(23, 50, 77, 0.38)' },
  sheet: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.surface },
  handle: { alignSelf: 'center', width: 38, height: 4, marginBottom: spacing.md, borderRadius: radii.pill, backgroundColor: colors.line },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  customerLabel: { marginTop: spacing.md, color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  customer: { marginTop: spacing.xs, color: colors.ink, fontSize: 14, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  customerAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  customerHint: { color: colors.inkMuted, fontSize: 11 },
  change: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  productsTitle: { marginTop: spacing.sm, color: colors.ink, fontSize: 14, fontWeight: '800' },
  items: { flex: 1, minHeight: 0, marginTop: spacing.xs },
  itemsContent: { paddingBottom: spacing.sm },
  empty: { paddingVertical: spacing.xl, color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
  totals: { paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  muted: { color: colors.inkMuted, fontSize: 12 },
  lineValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  grandLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  grandLabel: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  grandValue: { color: colors.brandDark, fontSize: 20, fontWeight: '800' },
  checkout: { minHeight: 48, marginTop: spacing.md, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  checkoutText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
