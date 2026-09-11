import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView } from '../../src/components/motion';
import { CategoryChip } from '../../src/components/pos/CategoryChip';
import { InventoryRow } from '../../src/components/inventory/InventoryRow';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import { getMobileInventory, mergeMobileInventoryPages, mobileInventoryItemKey, MobileInventoryError } from '../../src/services/inventory/mobileInventoryService';
import { colors, fontWeights, spacing, surfaces, typography } from '../../src/theme';
import type { MobileInventoryCategory, MobileInventoryItem, MobileInventoryPagination, MobileInventoryStockStatus, MobileInventorySummary } from '../../src/types/mobileInventory';

const ALL_CATEGORY = { id: null, name: 'Todos' } as const;
const PER_PAGE = 30;

const STOCK_FILTERS: { id: MobileInventoryStockStatus | null; label: string }[] = [
  { id: null, label: 'Todos' },
  { id: 'low_stock', label: 'Bajo stock' },
  { id: 'out_of_stock', label: 'Agotados' },
];

type SelectedCategory = string | number | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function entityName(value: unknown) {
  return isRecord(value) && typeof value.name === 'string' ? value.name : null;
}

function inventoryErrorMessage(error: MobileInventoryError) {
  if (error.status === 'forbidden_location') return 'No tienes acceso a esta ubicación de inventario.';
  if (error.status === 'inventory_not_ready') return 'El inventario de esta ubicación aún no está disponible en la app.';
  if (error.status === 'invalid_location') return 'No se pudo usar la ubicación de inventario.';
  if (error.status === 'validation_error') return 'PRODEX no pudo validar la solicitud.';
  if (error.status === 'rate_limited') return 'PRODEX recibió muchas solicitudes. Intenta de nuevo en un momento.';
  if (error.status === 'server_error') return 'PRODEX no está disponible en este momento.';
  if (error.status === 'timeout' || error.status === 'network_error') return 'No pudimos cargar el inventario.';
  return 'No pudimos cargar el inventario.';
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<SelectedCategory>(null);
  const [stockStatus, setStockStatus] = useState<MobileInventoryStockStatus | null>(null);
  const [items, setItems] = useState<MobileInventoryItem[]>([]);
  const [categories, setCategories] = useState<MobileInventoryCategory[]>([]);
  const [summary, setSummary] = useState<MobileInventorySummary | null>(null);
  const [pagination, setPagination] = useState<MobileInventoryPagination | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'not_ready' | 'generic' | null>(null);
  const requestSeq = useRef(0);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const itemsRef = useRef<MobileInventoryItem[]>([]);
  const previousLocationRef = useRef<string | number | null | undefined>(undefined);
  const { operationalContext, inventoryLocationId, session, signOut } = useAuth();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const categoryChips = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);
  const hasActiveFilters = debouncedSearch.length > 0 || categoryId !== null || stockStatus !== null;
  const locationLabel = entityName(operationalContext?.inventory_location) ?? 'Ubicación de inventario';

  const loadInventory = useCallback(async ({ page, mode }: { page: number; mode: 'replace' | 'append' | 'refresh' }) => {
    if (!session?.baseUrl || !session.accessToken) return;
    if (inventoryLocationId === null || inventoryLocationId === undefined || inventoryLocationId === '') {
      setLoadingInitial(false);
      setErrorKind('generic');
      setErrorMessage('No se pudo determinar la ubicación de inventario.');
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
      const response = await getMobileInventory({
        baseUrl: session.baseUrl,
        accessToken: session.accessToken,
        inventoryLocationId,
        search: debouncedSearch,
        categoryId,
        stockStatus,
        page,
        perPage: PER_PAGE,
        signal: controller.signal,
      });
      if (!mounted.current || requestSeq.current !== seq) return;

      setErrorMessage(null);
      setErrorKind(null);
      setPagination(response.pagination);
      setSummary(response.summary);
      setCategories(response.categories);
      setItems((current) => (mode === 'append' ? mergeMobileInventoryPages(current, response.items) : response.items));
    } catch (error) {
      if (!mounted.current || requestSeq.current !== seq) return;
      if (error instanceof MobileInventoryError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      if (error instanceof MobileInventoryError && error.status === 'inventory_not_ready') {
        setErrorKind('not_ready');
      } else {
        setErrorKind('generic');
      }
      setErrorMessage(error instanceof MobileInventoryError ? inventoryErrorMessage(error) : 'No pudimos cargar el inventario.');
      if (mode !== 'append') {
        setItems([]);
        setSummary(null);
      }
    } finally {
      if (mode === 'append') loadingMoreRef.current = false;
      if (!mounted.current || requestSeq.current !== seq) return;
      setLoadingInitial(false);
      setLoadingSearch(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [categoryId, debouncedSearch, stockStatus, inventoryLocationId, session?.accessToken, session?.baseUrl, signOut]);

  useEffect(() => {
    if (previousLocationRef.current !== inventoryLocationId) {
      setItems([]);
      itemsRef.current = [];
      previousLocationRef.current = inventoryLocationId;
    }
    setPagination(null);
    setErrorMessage(null);
    setErrorKind(null);
    void loadInventory({ page: 1, mode: 'replace' });
  }, [categoryId, debouncedSearch, stockStatus, inventoryLocationId, loadInventory]);

  const handleRetry = () => {
    void loadInventory({ page: 1, mode: 'replace' });
  };

  const handleRefresh = () => {
    void loadInventory({ page: 1, mode: 'refresh' });
  };

  const handleEndReached = () => {
    if (loadingInitial || loadingMore || loadingMoreRef.current || refreshing || !pagination?.has_more) return;
    void loadInventory({ page: pagination.page + 1, mode: 'append' });
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryId(null);
    setStockStatus(null);
  };

  const renderRow = useCallback(({ item }: { item: MobileInventoryItem }) => <InventoryRow item={item} />, []);

  const renderHeader = () => (
    <FadeInView distance={6}>
      <AppHeader title="Inventario" subtitle={locationLabel} icon="cube-outline" />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary ? summary.total_items : '--'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Bajo stock</Text>
          <Text style={[styles.summaryValue, { color: colors.amber }]}>{summary ? summary.low_stock_count : '--'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Agotados</Text>
          <Text style={[styles.summaryValue, { color: colors.red }]}>{summary ? summary.out_of_stock_count : '--'}</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color={colors.inkMuted} />
        <TextInput
          accessibilityLabel="Buscar producto por nombre, SKU o código de barras"
          placeholder="Buscar producto, SKU o código"
          placeholderTextColor={colors.inkMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable accessibilityLabel="Limpiar búsqueda" accessibilityRole="button" onPress={() => setSearch('')} style={styles.clear}>
            <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        horizontal
        data={categoryChips}
        keyExtractor={(item) => String(item.id ?? 'all')}
        renderItem={({ item }) => <CategoryChip label={item.name} selected={categoryId === item.id} onPress={() => setCategoryId(item.id)} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      />

      <View style={styles.stockFiltersRow}>
        {STOCK_FILTERS.map((filter) => (
          <CategoryChip key={filter.label} label={filter.label} selected={stockStatus === filter.id} onPress={() => setStockStatus(filter.id)} />
        ))}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Existencias</Text>
        {loadingSearch && <ActivityIndicator size="small" color={colors.brand} />}
      </View>
    </FadeInView>
  );

  const renderEmpty = () => {
    if (loadingInitial) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.emptyStateText}>Cargando inventario...</Text>
        </View>
      );
    }
    if (errorKind === 'not_ready') {
      return <EmptyState icon="time-outline" title="Inventario aún no disponible" message={errorMessage ?? undefined} actionLabel="Reintentar" onAction={handleRetry} compact />;
    }
    if (errorMessage) {
      return <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={handleRetry} compact />;
    }
    if (hasActiveFilters) {
      return <EmptyState icon="search-outline" title="No encontramos productos con estos filtros." actionLabel="Limpiar filtros" onAction={clearFilters} compact />;
    }
    return <EmptyState icon="cube-outline" title="No hay productos en esta ubicación." compact />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={mobileInventoryItemKey}
        renderItem={renderRow}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={loadingMore ? <View style={styles.footerSpinner}><ActivityIndicator color={colors.brand} /></View> : null}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  summaryCard: { ...surfaces.card, flex: 1, padding: spacing.md },
  summaryLabel: { color: colors.inkMuted, fontSize: typography.label, fontWeight: fontWeights.bold },
  summaryValue: { marginTop: spacing.xs, color: colors.ink, fontSize: typography.metric, fontWeight: fontWeights.heavy },
  searchBox: { ...surfaces.input, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
  searchInput: { flex: 1, minHeight: 44, color: colors.ink, fontSize: typography.body },
  clear: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  stockFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.xs },
  titleRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: fontWeights.bold },
  footerSpinner: { paddingVertical: spacing.lg },
  emptyState: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  emptyStateText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});
