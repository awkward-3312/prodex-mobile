import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartSheet } from '../../src/components/pos/CartSheet';
import { CartSummaryBar } from '../../src/components/pos/CartSummaryBar';
import { CategoryChip } from '../../src/components/pos/CategoryChip';
import { PosHeader } from '../../src/components/pos/PosHeader';
import { PosSearchBar } from '../../src/components/pos/PosSearchBar';
import { ProductCard } from '../../src/components/pos/ProductCard';
import { posCategories, posProducts } from '../../src/config/posMockData';
import { usePosCart } from '../../src/context/PosCartContext';
import { colors, radii, spacing } from '../../src/theme';
import type { PosProduct } from '../../src/types/pos';

type Category = typeof posCategories[number];

export default function PosScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Todos');
  const [cartVisible, setCartVisible] = useState(false);
  const [message, setMessage] = useState('');
  const { items, itemCount, subtotalCents, discountCents, taxCents, totalCents, addProduct, increase, decrease, remove } = usePosCart();

  useEffect(() => {
    if (message.length === 0) return undefined;
    const timeout = setTimeout(() => setMessage(''), 2500);
    return () => clearTimeout(timeout);
  }, [message]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return posProducts.filter((product) => {
      const matchesCategory = category === 'Todos'
        || (category === 'Favoritos' && product.favorite)
        || product.category === category;
      const matchesSearch = normalizedSearch.length === 0
        || [product.name, product.sku, product.barcode].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage);
  };

  const renderHeader = () => (
    <>
      <PosHeader onOptionsPress={() => showMessage('Opciones del POS estarán disponibles próximamente.')} />
      <PosSearchBar value={search} onChangeText={setSearch} onScanPress={() => router.push('/pos/scanner')} />
      <FlatList
        horizontal
        data={posCategories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <CategoryChip label={item} selected={category === item} onPress={() => setCategory(item)} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      />
      <Text style={styles.productsTitle}>Productos</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => addProduct(item)} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<View style={styles.emptyProducts}><Text style={styles.emptyTitle}>No encontramos productos</Text><Text style={styles.emptyText}>Prueba con otro nombre, SKU o código de barras.</Text></View>}
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      {message.length > 0 && <Pressable accessibilityLabel="Cerrar mensaje" accessibilityRole="button" onPress={() => setMessage('')} style={[styles.snackbar, { bottom: 136 + insets.bottom }]}><Text style={styles.messageText}>{message}</Text><Text style={styles.messageClose}>Cerrar</Text></Pressable>}
      <CartSummaryBar itemCount={itemCount} totalCents={totalCents} onViewCart={() => setCartVisible(true)} onCheckout={() => router.push('/pos/checkout')} />
      <CartSheet visible={cartVisible} items={items} subtotalCents={subtotalCents} discountCents={discountCents} taxCents={taxCents} totalCents={totalCents} onClose={() => setCartVisible(false)} onIncrease={increase} onDecrease={decrease} onRemove={remove} onCheckout={() => router.push('/pos/checkout')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg },
  categories: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  productsTitle: { marginTop: spacing.md, marginBottom: spacing.sm, color: colors.ink, fontSize: 16, fontWeight: '800' },
  productRow: { justifyContent: 'space-between', marginBottom: spacing.md },
  snackbar: { position: 'absolute', left: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.blueSoft, zIndex: 20 },
  messageText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 17 },
  messageClose: { marginLeft: spacing.sm, color: colors.blue, fontSize: 11, fontWeight: '800' },
  emptyProducts: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  emptyText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});
