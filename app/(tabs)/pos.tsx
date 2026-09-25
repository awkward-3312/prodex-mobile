import { PosRegisterGuard } from '../../src/components/pos/PosRegisterGuard';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../src/components/motion';
import { CartSheet } from '../../src/components/pos/CartSheet';
import { CartSummaryBar } from '../../src/components/pos/CartSummaryBar';
import { CategoryChip } from '../../src/components/pos/CategoryChip';
import { PosHeader } from '../../src/components/pos/PosHeader';
import { PosSearchBar } from '../../src/components/pos/PosSearchBar';
import { ProductCard } from '../../src/components/pos/ProductCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import { canAddProductQuantity, usePosCart } from '../../src/context/PosCartContext';
import { getMobilePosCatalog, mapMobilePosCatalogItemToPosProduct, mergeCatalogPages, MobilePosCatalogError } from '../../src/services/pos/mobilePosCatalogService';
import { colors, fontWeights, radii, shadows, spacing } from '../../src/theme';
import type { MobilePosCatalogItem, MobilePosCategory, MobilePosPagination } from '../../src/types/mobilePosCatalog';
import type { PosProduct } from '../../src/types/pos';
import { decideCheckoutNavigation } from '../../src/utils/posCart';

const ALL_CATEGORY = { id: null, name: 'Todos' } as const;
const PER_PAGE = 30;

type SelectedCategory = string | number | null;

function catalogErrorMessage(error: MobilePosCatalogError) {
  if (error.status === 'forbidden') return 'No tienes acceso al catálogo de esta ubicación.';
  if (error.status === 'invalid_location') return 'No se pudo usar la ubicación de inventario.';
  if (error.status === 'rate_limited') return 'PRODEX recibió muchas solicitudes. Intenta de nuevo en un momento.';
  if (error.status === 'server_error') return 'PRODEX no está disponible en este momento.';
  if (error.status === 'timeout' || error.status === 'network_error') return 'No pudimos cargar los productos.';
  return 'No pudimos cargar los productos.';
}

function emptyMessage(search: string, categoryId: SelectedCategory) {
  if (search.trim().length > 0) return 'No encontramos productos para esta búsqueda.';
  if (categoryId !== null) return 'No hay productos en esta categoría.';
  return 'No hay productos disponibles en esta ubicación.';
}

function PosScreenContent() {
  const { width: windowWidth } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState(windowWidth);
  const cardWidth = Math.max(0, (layoutWidth - spacing.lg * 2 - spacing.md) / 2);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<SelectedCategory>(null);
  const [items, setItems] = useState<MobilePosCatalogItem[]>([]);
  const [categories, setCategories] = useState<MobilePosCategory[]>([]);
  const [pagination, setPagination] = useState<MobilePosPagination | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'warning' } | null>(null);
  const pendingCheckoutRef = useRef(false);
  const checkoutNavigatingRef = useRef(false);
  const requestSeq = useRef(0);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const itemsRef = useRef<MobilePosCatalogItem[]>([]);
  const categoriesRef = useRef<MobilePosCategory[]>([]);
  const previousLocationRef = useRef<string | number | null | undefined>(undefined);
  const { session, inventoryLocationId, signOut } = useAuth();
  const { items: cartItems, itemCount, subtotalCents, discountCents, taxCents, totalCents, cartLocked, submission, salesRevision, addProduct, increase, decrease, remove } = usePosCart();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!cartVisible && pendingCheckoutRef.current) {
      pendingCheckoutRef.current = false;
      router.push('/pos/checkout');
    }
  }, [cartVisible]);

  useFocusEffect(useCallback(() => {
    checkoutNavigatingRef.current = false;
  }, []));

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timeout);
  }, [message]);

  const products = useMemo(() => items.map(mapMobilePosCatalogItemToPosProduct), [items]);
  const categoryChips = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const loadCatalog = useCallback(async ({ page, mode }: { page: number; mode: 'replace' | 'append' | 'refresh' }) => {
    if (!session?.baseUrl || !session.accessToken) return;
    if (inventoryLocationId === null || inventoryLocationId === undefined || inventoryLocationId === '') {
      setLoadingInitial(false);
      setErrorMessage('No se pudo determinar la ubicación de venta.');
      return;
    }

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (mode === 'append') {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      loadingMoreRef.current = false;
      if (mode === 'refresh') setRefreshing(true);
      else {
      setLoadingSearch(itemsRef.current.length > 0);
      setLoadingInitial(itemsRef.current.length === 0);
      }
    }

    try {
      const response = await getMobilePosCatalog({
        baseUrl: session.baseUrl,
        accessToken: session.accessToken,
        inventoryLocationId,
        search: debouncedSearch,
        categoryId,
        page,
        perPage: PER_PAGE,
        signal: controller.signal,
      });
      if (!mounted.current || requestSeq.current !== seq) return;

      setErrorMessage(null);
      setPagination(response.pagination);
      setItems((current) => (mode === 'append' ? mergeCatalogPages(current, response.items) : response.items));
      if (debouncedSearch.length === 0 && categoryId === null) setCategories(response.categories);
      else if (categoriesRef.current.length === 0 && response.categories.length > 0) setCategories(response.categories);
    } catch (error) {
      if (!mounted.current || requestSeq.current !== seq) return;
      if (error instanceof MobilePosCatalogError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      setErrorMessage(error instanceof MobilePosCatalogError ? catalogErrorMessage(error) : 'No pudimos cargar los productos.');
      if (mode !== 'append') setItems([]);
    } finally {
      if (mode === 'append') loadingMoreRef.current = false;
      if (!mounted.current || requestSeq.current !== seq) return;
      setLoadingInitial(false);
      setLoadingSearch(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [categoryId, debouncedSearch, inventoryLocationId, session?.accessToken, session?.baseUrl, signOut]);

  useEffect(() => {
    if (previousLocationRef.current !== inventoryLocationId) {
      setItems([]);
      itemsRef.current = [];
      previousLocationRef.current = inventoryLocationId;
    }
    setPagination(null);
    setErrorMessage(null);
    void loadCatalog({ page: 1, mode: 'replace' });
  }, [categoryId, debouncedSearch, inventoryLocationId, loadCatalog, salesRevision]);

  const showMessage = useCallback((text: string, tone: 'success' | 'warning') => {
    setMessage({ text, tone });
  }, []);

  const handleRetry = () => {
    void loadCatalog({ page: 1, mode: 'replace' });
  };

  const handleRefresh = () => {
    void loadCatalog({ page: 1, mode: 'refresh' });
  };

  const handleEndReached = () => {
    if (loadingInitial || loadingMore || loadingMoreRef.current || refreshing || !pagination?.has_more) return;
    void loadCatalog({ page: pagination.page + 1, mode: 'append' });
  };

  const handleAddProduct = useCallback((product: PosProduct) => {
    if (cartLocked) { router.push('/pos/checkout'); return; }
    if (product.canSell === false) {
      showMessage(product.sellabilityReason ?? 'Este producto no puede venderse.', 'warning');
      return;
    }
    const existing = cartItems.find((item) => item.product.id === product.id);
    if (!canAddProductQuantity(existing, product, 1)) {
      showMessage('Stock máximo alcanzado', 'warning');
      return;
    }
    addProduct(product);
    showMessage(`${product.name} agregado al carrito`, 'success');
  }, [addProduct, cartItems, cartLocked, showMessage]);

  const handleCheckoutFromCart = useCallback(() => {
    const decision = decideCheckoutNavigation({ cartVisible, navigating: checkoutNavigatingRef.current });
    if (decision === 'ignore') return;
    checkoutNavigatingRef.current = true;
    if (decision === 'close_then_navigate') {
      pendingCheckoutRef.current = true;
      setCartVisible(false);
    } else {
      router.push('/pos/checkout');
    }
  }, [cartVisible]);

  const renderProduct = useCallback(({ item }: { item: PosProduct }) => (
    <View style={[styles.productSlot, { width: cardWidth }]}><ProductCard product={item} onPress={() => handleAddProduct(item)} style={styles.productCard} /></View>
  ), [cardWidth, handleAddProduct]);

  const renderSubmissionNotice = () => {
    if (!cartLocked) return null;
    const tone = submission.status === 'success' ? 'success' : submission.status === 'loading' ? 'loading' : 'warning';
    const text = submission.status === 'success' ? 'Venta registrada. Ver confirmación' : submission.status === 'loading' ? 'Comprobando confirmaciones guardadas…' : 'Hay una confirmación pendiente. Revisar venta';
    return (
      <PressableScale accessibilityRole="button" onPress={() => router.push('/pos/checkout')} style={[styles.submissionNotice, tone === 'success' && styles.noticeSuccess, tone === 'warning' && styles.noticeWarning]}>
        {tone === 'loading' ? <ActivityIndicator size="small" color={colors.inkMuted} /> : <Ionicons name={tone === 'success' ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={tone === 'success' ? colors.green : colors.amber} />}
        <Text style={[styles.noticeText, tone === 'success' && styles.noticeTextSuccess, tone === 'warning' && styles.noticeTextWarning]}>{text}</Text>
      </PressableScale>
    );
  };

  const renderHeader = () => (
    <FadeInView distance={6}>
      <PosHeader />
      {renderSubmissionNotice()}
      <PosSearchBar value={search} onChangeText={setSearch} onScanPress={() => router.push('/pos/scanner')} />
      <FlatList
        horizontal
        data={categoryChips}
        keyExtractor={(item) => String(item.id ?? 'all')}
        renderItem={({ item }) => <CategoryChip label={item.name} selected={categoryId === item.id} onPress={() => setCategoryId(item.id)} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      />
      <View style={styles.titleRow}>
        <Text style={styles.productsTitle}>Productos</Text>
        {loadingSearch && <ActivityIndicator size="small" color={colors.brand} />}
      </View>
    </FadeInView>
  );

  const renderEmpty = () => {
    if (loadingInitial) return <View style={styles.emptyProducts}><ActivityIndicator color={colors.brand} /><Text style={styles.emptyText}>Cargando productos...</Text></View>;
    if (errorMessage) return <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={handleRetry} compact />;
    return <EmptyState icon="cube-outline" title={emptyMessage(debouncedSearch, categoryId)} compact />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        onLayout={({ nativeEvent }) => setLayoutWidth(nativeEvent.layout.width)}
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        renderItem={renderProduct}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={loadingMore ? <View style={styles.footerSpinner}><ActivityIndicator color={colors.brand} /></View> : null}
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
      />
      {message && <FadeInView distance={8} style={[styles.snackbarWrap, { bottom: 136 + insets.bottom }]}><PressableScale accessibilityLabel="Cerrar mensaje" accessibilityRole="button" onPress={() => setMessage(null)} style={[styles.snackbar, message.tone === 'success' ? styles.snackbarSuccess : styles.snackbarWarning]}><Ionicons name={message.tone === 'success' ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={message.tone === 'success' ? colors.green : colors.amber} /><Text style={styles.messageText}>{message.text}</Text><Ionicons name="close" size={16} color={colors.inkMuted} /></PressableScale></FadeInView>}
      <CartSummaryBar itemCount={itemCount} totalCents={totalCents} onViewCart={() => setCartVisible(true)} onCheckout={handleCheckoutFromCart} />
      <CartSheet visible={cartVisible} items={cartItems} subtotalCents={subtotalCents} discountCents={discountCents} taxCents={taxCents} totalCents={totalCents} onClose={() => setCartVisible(false)} onIncrease={increase} onDecrease={decrease} onRemove={remove} onCheckout={handleCheckoutFromCart} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  submissionNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md, minHeight: 44, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  noticeWarning: { backgroundColor: colors.amberSoft, borderColor: colors.amberSoft },
  noticeSuccess: { backgroundColor: colors.greenSoft, borderColor: colors.greenSoft },
  noticeText: { flex: 1, color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.bold, lineHeight: 17 },
  noticeTextWarning: { color: colors.amber },
  noticeTextSuccess: { color: colors.green },
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg },
  categories: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  titleRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm },
  productsTitle: { color: colors.ink, fontSize: 16, fontWeight: fontWeights.bold },
  productRow: { columnGap: spacing.md, alignItems: 'stretch', marginBottom: spacing.md },
  productSlot: { minWidth: 0 },
  productCard: { width: '100%' },
  footerSpinner: { paddingVertical: spacing.lg },
  snackbarWrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 20 },
  snackbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, ...shadows.card },
  snackbarSuccess: { backgroundColor: colors.greenSoft },
  snackbarWarning: { backgroundColor: colors.amberSoft },
  messageText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 17, fontWeight: fontWeights.semibold },
  emptyProducts: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: fontWeights.bold, textAlign: 'center' },
  emptyText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});

export default function PosScreen() {
  return <PosRegisterGuard><PosScreenContent /></PosRegisterGuard>;
}
