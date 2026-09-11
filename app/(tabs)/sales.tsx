import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView } from '../../src/components/motion';
import { CategoryChip } from '../../src/components/pos/CategoryChip';
import { SaleRow } from '../../src/components/sales/SaleRow';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SearchField } from '../../src/components/ui/SearchField';
import { useAuth } from '../../src/context/AuthContext';
import { getMobileSales, mergeMobileSalesPages, mobileSaleKey, MobileSalesError } from '../../src/services/sales/mobileSalesService';
import { colors, fontWeights, spacing } from '../../src/theme';
import type { MobileSale, MobileSalePagination, MobileSalePaymentStatus } from '../../src/types/mobileSales';

const PER_PAGE = 30;

const STATUS_FILTERS: { id: MobileSalePaymentStatus | null; label: string }[] = [
  { id: null, label: 'Todas' },
  { id: 'paid', label: 'Pagadas' },
  { id: 'partial', label: 'Parciales' },
  { id: 'unpaid', label: 'Pendientes' },
];

function salesErrorMessage(error: MobileSalesError) {
  if (error.status === 'forbidden') return 'No tienes acceso al historial de ventas.';
  if (error.status === 'validation_error') return 'PRODEX no pudo validar la solicitud.';
  if (error.status === 'rate_limited') return 'PRODEX recibió muchas solicitudes. Intenta de nuevo en un momento.';
  if (error.status === 'server_error') return 'PRODEX no está disponible en este momento.';
  if (error.status === 'timeout' || error.status === 'network_error') return 'No pudimos cargar las ventas.';
  return 'No pudimos cargar las ventas.';
}

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<MobileSalePaymentStatus | null>(null);
  const [sales, setSales] = useState<MobileSale[]>([]);
  const [pagination, setPagination] = useState<MobileSalePagination | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const salesRef = useRef<MobileSale[]>([]);
  const { session, signOut } = useAuth();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const hasActiveFilters = debouncedSearch.length > 0 || paymentStatus !== null;

  const loadSales = useCallback(async ({ page, mode }: { page: number; mode: 'replace' | 'append' | 'refresh' }) => {
    if (!session?.baseUrl || !session.accessToken) return;

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
        setLoadingSearch(salesRef.current.length > 0);
        setLoadingInitial(salesRef.current.length === 0);
      }
    }

    try {
      const response = await getMobileSales({
        baseUrl: session.baseUrl,
        accessToken: session.accessToken,
        search: debouncedSearch,
        paymentStatus,
        page,
        perPage: PER_PAGE,
        signal: controller.signal,
      });
      if (!mounted.current || requestSeq.current !== seq) return;

      setErrorMessage(null);
      setPagination(response.pagination);
      setSales((current) => (mode === 'append' ? mergeMobileSalesPages(current, response.items) : response.items));
    } catch (error) {
      if (!mounted.current || requestSeq.current !== seq) return;
      if (error instanceof MobileSalesError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      setErrorMessage(error instanceof MobileSalesError ? salesErrorMessage(error) : 'No pudimos cargar las ventas.');
      if (mode !== 'append') setSales([]);
    } finally {
      if (mode === 'append') loadingMoreRef.current = false;
      if (!mounted.current || requestSeq.current !== seq) return;
      setLoadingInitial(false);
      setLoadingSearch(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, paymentStatus, session?.accessToken, session?.baseUrl, signOut]);

  useEffect(() => {
    setPagination(null);
    setErrorMessage(null);
    void loadSales({ page: 1, mode: 'replace' });
  }, [debouncedSearch, paymentStatus, loadSales]);

  const handleRetry = () => {
    void loadSales({ page: 1, mode: 'replace' });
  };

  const handleRefresh = () => {
    void loadSales({ page: 1, mode: 'refresh' });
  };

  const handleEndReached = () => {
    if (loadingInitial || loadingMore || loadingMoreRef.current || refreshing || !pagination?.has_more) return;
    void loadSales({ page: pagination.page + 1, mode: 'append' });
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setPaymentStatus(null);
  };

  const renderRow = useCallback(({ item }: { item: MobileSale }) => <SaleRow sale={item} />, []);

  const renderHeader = () => (
    <FadeInView distance={6}>
      <AppHeader title="Ventas" subtitle="Historial y estados de cobro" icon="receipt-outline" />

      <SearchField
        accessibilityLabel="Buscar venta por referencia o cliente"
        placeholder="Buscar por referencia o cliente"
        value={search}
        onChangeText={setSearch}
        style={styles.searchBox}
      />

      <View style={styles.filtersRow}>
        {STATUS_FILTERS.map((filter) => (
          <CategoryChip key={filter.label} label={filter.label} selected={paymentStatus === filter.id} onPress={() => setPaymentStatus(filter.id)} />
        ))}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Ventas recientes</Text>
        {loadingSearch && <ActivityIndicator size="small" color={colors.brand} />}
      </View>
    </FadeInView>
  );

  const renderEmpty = () => {
    if (loadingInitial) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.emptyStateText}>Cargando ventas...</Text>
        </View>
      );
    }
    if (errorMessage) {
      return <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={handleRetry} compact />;
    }
    if (hasActiveFilters) {
      return <EmptyState icon="search-outline" title="No encontramos ventas con estos filtros." actionLabel="Limpiar filtros" onAction={clearFilters} compact />;
    }
    return <EmptyState icon="receipt-outline" title="Aún no hay ventas registradas." compact />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={sales}
        keyExtractor={mobileSaleKey}
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
  searchBox: { marginTop: spacing.lg },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  titleRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.xs },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: fontWeights.bold },
  footerSpinner: { paddingVertical: spacing.lg },
  emptyState: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  emptyStateText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});
