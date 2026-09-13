import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClientRow } from '../../src/components/clients/ClientRow';
import { FadeInView, PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SearchField } from '../../src/components/ui/SearchField';
import { useAuth } from '../../src/context/AuthContext';
import { searchDirectoryClients } from '../../src/services/clients/mobileClientsService';
import { MobilePosCheckoutError } from '../../src/services/pos/mobilePosCheckoutService';
import { colors, spacing } from '../../src/theme';
import type { ClientSearchResult } from '../../src/types/mobilePosCheckout';

const PER_PAGE = 30;

function clientsErrorMessage(error: MobilePosCheckoutError) {
  if (error.status === 'forbidden') return 'No tienes acceso a clientes.';
  if (error.status === 'invalid_request') return 'PRODEX no pudo validar la búsqueda.';
  if (error.status === 'rate_limited') return 'PRODEX recibió muchas solicitudes. Intenta de nuevo en un momento.';
  if (error.status === 'server_error') return 'PRODEX no está disponible en este momento.';
  return 'No pudimos cargar los clientes.';
}

function mergeClientPages(current: ClientSearchResult[], incoming: ClientSearchResult[]): ClientSearchResult[] {
  const seen = new Set(current.map((client) => String(client.id)));
  const merged = [...current];
  incoming.forEach((client) => {
    const key = String(client.id);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(client);
    }
  });
  return merged;
}

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut, hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [clients, setClients] = useState<ClientSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const clientsRef = useRef<ClientSearchResult[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => { clientsRef.current = clients; }, [clients]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const loadClients = useCallback(async ({ targetPage, mode }: { targetPage: number; mode: 'replace' | 'append' | 'refresh' }) => {
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
        setLoadingSearch(clientsRef.current.length > 0);
        setLoadingInitial(clientsRef.current.length === 0);
      }
    }

    try {
      const response = await searchDirectoryClients({ baseUrl: session.baseUrl, accessToken: session.accessToken, search: debouncedSearch, page: targetPage, perPage: PER_PAGE, signal: controller.signal });
      if (!mounted.current || requestSeq.current !== seq) return;

      setErrorMessage(null);
      setPage(response.pagination.page);
      setHasMore(response.pagination.has_more);
      setClients((current) => (mode === 'append' ? mergeClientPages(current, response.items) : response.items));
    } catch (error) {
      if (!mounted.current || requestSeq.current !== seq) return;
      if (error instanceof MobilePosCheckoutError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      setErrorMessage(error instanceof MobilePosCheckoutError ? clientsErrorMessage(error) : 'No pudimos cargar los clientes.');
      if (mode !== 'append') setClients([]);
    } finally {
      if (mode === 'append') loadingMoreRef.current = false;
      if (!mounted.current || requestSeq.current !== seq) return;
      setLoadingInitial(false);
      setLoadingSearch(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, session?.accessToken, session?.baseUrl, signOut]);

  useEffect(() => {
    setHasMore(false);
    setErrorMessage(null);
    void loadClients({ targetPage: 1, mode: 'replace' });
  }, [debouncedSearch, loadClients]);

  const handleRetry = () => void loadClients({ targetPage: 1, mode: 'replace' });
  const handleRefresh = () => void loadClients({ targetPage: 1, mode: 'refresh' });
  const handleEndReached = () => {
    if (loadingInitial || loadingMore || loadingMoreRef.current || refreshing || !hasMore) return;
    void loadClients({ targetPage: page + 1, mode: 'append' });
  };

  const openClient = useCallback((client: ClientSearchResult) => {
    router.push(`/clients/${client.id}`);
  }, []);

  const renderRow = useCallback(({ item }: { item: ClientSearchResult }) => <ClientRow client={item} onPress={openClient} />, [openClient]);

  const renderHeader = () => (
    <FadeInView distance={6}>
      <AppHeader title="Clientes" subtitle="Directorio del tenant" onBack={() => router.back()} />
      {hasPermission?.('Customers_add') ? <PressableScale accessibilityRole="button" onPress={() => router.push('/clients/manage')} style={{ padding: spacing.md, backgroundColor: colors.brand }}><Text style={{ color: colors.white }}>Nuevo cliente</Text></PressableScale> : null}
      <SearchField
        accessibilityLabel="Buscar cliente por nombre, teléfono o RTN"
        placeholder="Buscar por nombre, teléfono o RTN"
        value={search}
        onChangeText={setSearch}
        style={styles.searchBox}
      />
    </FadeInView>
  );

  const renderEmpty = () => {
    if (loadingInitial) {
      return <View style={styles.emptyState}><ActivityIndicator color={colors.brand} /></View>;
    }
    if (errorMessage) {
      return <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={handleRetry} compact />;
    }
    if (debouncedSearch.length > 0) {
      return <EmptyState icon="search-outline" title="No encontramos clientes con esa búsqueda." compact />;
    }
    return <EmptyState icon="people-outline" title="Aún no hay clientes registrados." compact />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id)}
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
      {loadingSearch && !loadingInitial ? <View style={styles.searchSpinner}><ActivityIndicator size="small" color={colors.brand} /></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg },
  searchBox: { marginTop: spacing.md, marginBottom: spacing.md },
  footerSpinner: { paddingVertical: spacing.lg },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
  searchSpinner: { position: 'absolute', top: spacing.xl, right: spacing.xl },
});
