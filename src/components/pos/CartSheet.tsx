import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../ui/Button';
import { MotionSheet } from '../ui/MotionSheet';
import { colors, fontWeights, spacing, typography } from '../../theme';
import type { CartItem } from '../../types/pos';
import { formatMinorUnits } from '../../utils/formatCurrency';
import { CartItemRow } from './CartItemRow';

type Props = { visible: boolean; items: CartItem[]; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number; onClose: () => void; onIncrease: (id: string) => void; onDecrease: (id: string) => void; onRemove: (id: string) => void; onCheckout: () => void };

export function CartSheet({ visible, items, subtotalCents, discountCents, taxCents, totalCents, onClose, onIncrease, onDecrease, onRemove, onCheckout }: Props) {
  const hasItems = items.length > 0;
  const titleRef = useRef<View | null>(null);
  const knownItemIds = useRef(new Set(items.map((item) => item.product.id)));
  const newItemIds = new Set(items.filter((item) => !knownItemIds.current.has(item.product.id)).map((item) => item.product.id));

  useEffect(() => {
    knownItemIds.current = new Set(items.map((item) => item.product.id));
  }, [items]);

  return (
    <MotionSheet
      visible={visible}
      onClose={onClose}
      heightPct={0.8}
      accessibilityLabel="Carrito actual"
      closeAccessibilityLabel="Cerrar carrito"
      showCloseButton
      initialFocusRef={titleRef}
      contentStyle={styles.sheet}
    >
          <View style={styles.header}><View><View ref={titleRef} accessible accessibilityRole="header"><Text style={styles.title}>Carrito actual</Text></View><Text style={styles.customerLabel}>Cliente</Text><Text style={styles.customer}>Por definir</Text></View></View>
          <View style={styles.customerAction}><Text style={styles.customerHint}>Se selecciona al cobrar la venta</Text></View>
          <Text style={styles.productsTitle}>Productos</Text>
          <ScrollView style={styles.items} contentContainerStyle={styles.itemsContent} showsVerticalScrollIndicator={false}>
            {hasItems ? items.map((item) => <CartItemRow key={item.product.id} item={item} animateEntering={visible && newItemIds.has(item.product.id)} onIncrease={onIncrease} onDecrease={onDecrease} onRemove={onRemove} />) : <Text style={styles.empty}>Agrega productos para comenzar la venta.</Text>}
          </ScrollView>
          <View style={styles.totals}><View style={styles.totalLine}><Text style={styles.muted}>Subtotal estimado</Text><Text style={styles.lineValue}>{formatMinorUnits(subtotalCents)}</Text></View><View style={styles.totalLine}><Text style={styles.muted}>Descuento</Text><Text style={styles.lineValue}>{formatMinorUnits(discountCents)}</Text></View><View style={styles.totalLine}><Text style={styles.muted}>Impuestos</Text><Text style={styles.lineValue}>{taxCents > 0 ? formatMinorUnits(taxCents) : 'Pendiente'}</Text></View><View style={styles.grandLine}><Text style={styles.grandLabel}>Estimado</Text><Text style={styles.grandValue}>{formatMinorUnits(totalCents)}</Text></View></View>
          <Button accessibilityLabel="Cobrar venta" label="Cobrar" disabled={!hasItems} onPress={onCheckout} style={styles.checkout} />
    </MotionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 52 },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  customerLabel: { marginTop: spacing.md, color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.bold },
  customer: { marginTop: spacing.xs, color: colors.ink, fontSize: 14, fontWeight: fontWeights.bold },
  customerAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  customerHint: { color: colors.inkMuted, fontSize: 11 },
  change: { color: colors.brand, fontSize: 12, fontWeight: fontWeights.bold },
  productsTitle: { marginTop: spacing.sm, color: colors.ink, fontSize: 14, fontWeight: fontWeights.bold },
  items: { flex: 1, minHeight: 0, marginTop: spacing.xs },
  itemsContent: { paddingBottom: spacing.sm },
  empty: { paddingVertical: spacing.xl, color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
  totals: { paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  muted: { color: colors.inkMuted, fontSize: 12 },
  lineValue: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  grandLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  grandLabel: { color: colors.ink, fontSize: 16, fontWeight: fontWeights.bold },
  grandValue: { color: colors.brandDark, fontSize: 20, fontWeight: fontWeights.heavy },
  checkout: { marginTop: spacing.md },
});
