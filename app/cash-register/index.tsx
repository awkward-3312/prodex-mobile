import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CashMovementModal } from '../../src/components/cashRegister/CashMovementModal';
import { CashRegisterHistoryRow } from '../../src/components/cashRegister/CashRegisterHistoryRow';
import { CategoryChip } from '../../src/components/pos/CategoryChip';
import { FadeInView, PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import {
  getCashRegisterHistory,
  getCurrentCashRegister,
  mobileCashRegisterMessage,
  MobileCashRegisterError,
} from '../../src/services/cashRegister/mobileCashRegisterService';
import type { CashRegisterCurrentResponse, CashRegisterHistoryItem, CashRegisterPaymentMethodTotal } from '../../src/services/cashRegister/mobileCashRegisterService';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { colors, fontWeights, radii, sizing, spacing, surfaces, typography } from '../../src/theme';

const HISTORY_PER_PAGE = 20;

function money(value: string) {
  return formatCurrency(Number(value));
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryLine}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{money(value)}</Text></View>;
}

function PaymentMethodRow({ method }: { method: CashRegisterPaymentMethodTotal }) {
  return <View style={styles.methodRow}><Text style={styles.methodName} numberOfLines={1}>{method.name}</Text><Text style={styles.methodTotal}>{money(method.total)}</Text></View>;
}

function CurrentRegisterView({ canOperate }: { canOperate: boolean }) {
  const { session, signOut } = useAuth();
  const [data, setData] = useState<CashRegisterCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback((mode: 'initial' | 'refresh' = 'initial') => {
    if (!session?.baseUrl || !session.accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setErrorMessage(null);
    getCurrentCashRegister({ baseUrl: session.baseUrl, accessToken: session.accessToken, signal: controller.signal })
      .then((result) => setData(result))
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof MobileCashRegisterError && error.status === 'session_expired') {
          void signOut();
          return;
        }
        setErrorMessage(error instanceof MobileCashRegisterError ? mobileCashRegisterMessage(error.status) : 'No pudimos cargar la caja.');
      })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.baseUrl, session?.accessToken]);

  useEffect(() => {
    load('initial');
    return () => abortRef.current?.abort();
  }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
  }

  if (errorMessage) {
    return <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={() => load('initial')} compact />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.brand} />}
      showsVerticalScrollIndicator={false}
    >
      {data?.status === 'open' ? (
        <FadeInView distance={6}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Caja abierta</Text>
          </View>
          <Text style={styles.locationLabel}>{[data.register.branch?.name, data.register.cashDrawer?.name ?? data.register.inventoryLocation?.name].filter(Boolean).join(' · ') || 'Sin ubicación asignada'}</Text>
          <Text style={styles.openedAt}>Abierta desde {data.register.openedAt}</Text>

          {canOperate ? (
            <View style={styles.movementRow}>
              <PressableScale accessibilityRole="button" accessibilityLabel="Entrada de efectivo" style={[styles.movementButton, styles.movementIn]} onPress={() => setMovementType('in')}>
                <Ionicons name="arrow-down-circle-outline" size={18} color={colors.brand} />
                <Text style={[styles.movementButtonText, { color: colors.brandDark }]}>Entrada</Text>
              </PressableScale>
              <PressableScale accessibilityRole="button" accessibilityLabel="Salida de efectivo" style={[styles.movementButton, styles.movementOut]} onPress={() => setMovementType('out')}>
                <Ionicons name="arrow-up-circle-outline" size={18} color={colors.amber} />
                <Text style={[styles.movementButtonText, { color: colors.amber }]}>Salida</Text>
              </PressableScale>
            </View>
          ) : null}

          <View style={styles.heroCard}>
            <Text style={styles.heroValue}>{money(data.summary.expectedCash)}</Text>
            <Text style={styles.heroLabel}>Efectivo esperado</Text>
          </View>

          <View style={styles.card}>
            <SummaryLine label="Saldo inicial" value={data.register.openingBalance} />
            <SummaryLine label="Ventas en efectivo" value={data.summary.cashSales} />
            <SummaryLine label="Entradas" value={data.summary.cashIn} />
            <SummaryLine label="Salidas" value={data.summary.cashOut} />
            <SummaryLine label="Devoluciones" value={data.summary.cashRefunds} />
          </View>

          <View style={styles.card}>
            <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Ventas totales</Text><Text style={styles.totalsValue}>{money(data.summary.totalSales)}</Text></View>
            <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Transacciones</Text><Text style={styles.totalsValue}>{data.summary.transactionCount}</Text></View>
          </View>

          {data.summary.salesByPaymentMethod.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Métodos de pago</Text>
              {data.summary.salesByPaymentMethod.map((method) => <PaymentMethodRow key={`${method.id ?? method.name}`} method={method} />)}
            </View>
          ) : null}
        </FadeInView>
      ) : (
        <EmptyState
          icon="lock-closed-outline"
          title="No tienes una caja abierta."
          message={canOperate ? 'Abre tu caja para comenzar a registrar ventas y movimientos de efectivo.' : 'Cuando abras una caja desde PRODEX, podrás consultar aquí el resumen de la sesión.'}
          actionLabel={canOperate ? 'Abrir caja' : undefined}
          onAction={canOperate ? () => router.push('/cash-register/open') : undefined}
        />
      )}

      {data?.status === 'open' ? (
        <CashMovementModal
          visible={movementType !== null}
          type={movementType ?? 'in'}
          registerId={data.register.id}
          onClose={() => setMovementType(null)}
          onSuccess={() => { setMovementType(null); load('refresh'); }}
        />
      ) : null}
    </ScrollView>
  );
}

function HistoryView() {
  const { session, signOut } = useAuth();
  const [items, setItems] = useState<CashRegisterHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

  const load = useCallback((targetPage: number, mode: 'replace' | 'append' | 'refresh') => {
    if (!session?.baseUrl || !session.accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (mode === 'append') { loadingMoreRef.current = true; setLoadingMore(true); }
    else if (mode === 'refresh') setRefreshing(true);
    else setLoadingInitial(true);
    setErrorMessage(null);

    getCashRegisterHistory({ baseUrl: session.baseUrl, accessToken: session.accessToken, page: targetPage, perPage: HISTORY_PER_PAGE, signal: controller.signal })
      .then((result) => {
        setPage(result.pagination.page);
        setHasMore(result.pagination.has_more);
        setItems((current) => (mode === 'append' ? [...current, ...result.items] : result.items));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof MobileCashRegisterError && error.status === 'session_expired') {
          void signOut();
          return;
        }
        setErrorMessage(error instanceof MobileCashRegisterError ? mobileCashRegisterMessage(error.status) : 'No pudimos cargar el historial.');
        if (mode !== 'append') setItems([]);
      })
      .finally(() => {
        if (mode === 'append') loadingMoreRef.current = false;
        if (controller.signal.aborted) return;
        setLoadingInitial(false);
        setLoadingMore(false);
        setRefreshing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.baseUrl, session?.accessToken]);

  useEffect(() => {
    load(1, 'replace');
    return () => abortRef.current?.abort();
  }, [load]);

  const handleEndReached = () => {
    if (loadingInitial || loadingMore || loadingMoreRef.current || refreshing || !hasMore) return;
    load(page + 1, 'append');
  };

  if (loadingInitial) {
    return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <CashRegisterHistoryRow item={item} />}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.35}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.brand} />}
      ListFooterComponent={loadingMore ? <View style={styles.footerSpinner}><ActivityIndicator color={colors.brand} /></View> : null}
      ListEmptyComponent={
        errorMessage
          ? <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={() => load(1, 'replace')} compact />
          : <EmptyState icon="time-outline" title="Aún no hay sesiones de caja cerradas." compact />
      }
    />
  );
}

export default function CashRegisterScreen() {
  const { hasPermission } = useAuth();
  const canViewHistory = hasPermission('cash_register_report');
  const canOperate = hasPermission('Pos_view');
  const [tab, setTab] = useState<'current' | 'history'>('current');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppHeader title="Caja" onBack={() => router.back()} />
      </View>
      {canViewHistory ? (
        <View style={styles.segmentRow}>
          <CategoryChip label="Actual" selected={tab === 'current'} onPress={() => setTab('current')} />
          <CategoryChip label="Historial" selected={tab === 'history'} onPress={() => setTab('history')} />
        </View>
      ) : null}
      {tab === 'current' || !canViewHistory ? <CurrentRegisterView canOperate={canOperate} /> : <HistoryView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: spacing.lg },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tabContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  statusText: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  locationLabel: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 13, fontWeight: fontWeights.semibold },
  openedAt: { marginTop: 2, color: colors.inkMuted, fontSize: 12 },
  movementRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  movementButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: sizing.touch, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  movementIn: { backgroundColor: `${colors.brand}0D`, borderColor: `${colors.brand}33` },
  movementOut: { backgroundColor: `${colors.amber}0D`, borderColor: `${colors.amber}33` },
  movementButtonText: { fontSize: 13, fontWeight: fontWeights.bold },
  heroCard: { ...surfaces.card, marginTop: spacing.lg, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.brandSoft },
  heroValue: { color: colors.brandDark, fontSize: 32, fontWeight: fontWeights.heavy },
  heroLabel: { marginTop: 2, color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.bold },
  card: { ...surfaces.card, marginTop: spacing.md, padding: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold, marginBottom: spacing.sm },
  summaryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { color: colors.inkMuted, fontSize: 13 },
  summaryValue: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold },
  totalsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalsLabel: { color: colors.ink, fontSize: 14, fontWeight: fontWeights.semibold },
  totalsValue: { color: colors.ink, fontSize: 14, fontWeight: fontWeights.heavy },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  methodName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: fontWeights.semibold },
  methodTotal: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold },
  footerSpinner: { paddingVertical: spacing.lg },
});
