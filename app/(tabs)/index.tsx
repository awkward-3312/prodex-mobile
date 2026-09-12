import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandSignature } from '../../src/components/ui/BrandSignature';
import { UserAvatar } from '../../src/components/ui/UserAvatar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SaleRow } from '../../src/components/sales/SaleRow';
import { FadeInView, PressableScale } from '../../src/components/motion';
import { QuickAction } from '../../src/components/QuickAction';
import { useAuth } from '../../src/context/AuthContext';
import { getMobileDashboardSummary, mobileDashboardMessage, MobileDashboardError } from '../../src/services/dashboard/mobileDashboardService';
import type { MobileDashboardSummary } from '../../src/services/dashboard/mobileDashboardService';
import { getMobileSales, saleReceiptRoute } from '../../src/services/sales/mobileSalesService';
import type { MobileSale } from '../../src/types/mobileSales';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../src/theme';

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // Date#getDay(): 0=Sun..6=Sat

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function entityName(value: unknown) {
  return isRecord(value) && typeof value.name === 'string' ? value.name : null;
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function DeltaBadge({ pct, tone }: { pct: number | null; tone: 'onDark' | 'onLight' }) {
  if (pct === null) return null;
  const positive = pct >= 0;
  const color = tone === 'onDark' ? colors.white : positive ? colors.brandDark : colors.red;
  const background = tone === 'onDark' ? 'rgba(255,255,255,0.16)' : positive ? colors.brandSoft : colors.redSoft;
  return (
    <View style={[styles.deltaBadge, { backgroundColor: background }]}>
      <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={11} color={color} />
      <Text style={[styles.deltaText, { color }]}>{Math.abs(pct)}%</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, tenant, operationalContext, session, signOut, hasPermission } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  const companyName = tenant?.company_name ? String(tenant.company_name) : 'Empresa activa';
  const branchName = entityName(operationalContext?.branch) ?? entityName(operationalContext?.inventory_location);
  const canViewReports = hasPermission('Reports_sales');
  const canViewClients = hasPermission('Customers_view');

  const [summary, setSummary] = useState<MobileDashboardSummary | null>(null);
  const [recentSales, setRecentSales] = useState<MobileSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (!session?.baseUrl || !session.accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setErrorMessage(null);
    Promise.all([
      getMobileDashboardSummary({ baseUrl: session.baseUrl, accessToken: session.accessToken, signal: controller.signal }),
      getMobileSales({ baseUrl: session.baseUrl, accessToken: session.accessToken, page: 1, perPage: 3, signal: controller.signal }),
    ])
      .then(([summaryResult, salesResult]) => {
        setSummary(summaryResult);
        setRecentSales(salesResult.items);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof MobileDashboardError && error.status === 'session_expired') {
          void signOut();
          return;
        }
        setErrorMessage(error instanceof MobileDashboardError ? mobileDashboardMessage(error.status) : 'No pudimos cargar el resumen.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.baseUrl, session?.accessToken]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const maxWeekTotal = summary ? Math.max(1, ...summary.week.days.map((day) => Number(day.total))) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandSignature size="sm" />
          <View style={styles.headerActions}>
            <View style={styles.bellButton}><Ionicons name="notifications-outline" size={18} color={colors.ink} /></View>
            <UserAvatar size={36} />
          </View>
        </View>

        <FadeInView style={styles.welcome}>
          <Text style={styles.greeting}>{timeGreeting()}{firstName ? `, ${firstName}` : ''}</Text>
          <Text style={styles.welcomeText} numberOfLines={1}>{companyName}{branchName ? ` · ${branchName}` : ''} · Resumen de hoy</Text>
        </FadeInView>

        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          <QuickAction label="Nueva venta" icon="add" primary onPress={() => router.push('/(tabs)/pos')} />
          <QuickAction label="Productos" icon="pricetag-outline" onPress={() => router.push('/(tabs)/inventory')} />
          <QuickAction label="Inventario" icon="cube-outline" onPress={() => router.push('/(tabs)/inventory')} />
          {canViewClients ? <QuickAction label="Clientes" icon="people-outline" onPress={() => router.push('/clients')} /> : null}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
        ) : errorMessage ? (
          <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={load} compact />
        ) : summary ? (
          <FadeInView distance={6}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <Text style={styles.heroEyebrow}>Ventas de hoy</Text>
                <DeltaBadge pct={summary.today.salesTotalDeltaPct} tone="onDark" />
              </View>
              <Text style={styles.heroValue}>{formatCurrency(Number(summary.today.salesTotal))}</Text>
              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetric}><Text style={styles.heroMetricLabel}>Ingresos</Text><Text style={styles.heroMetricValue}>{formatCurrency(Number(summary.today.salesTotal))}</Text></View>
                <View style={styles.heroMetric}><Text style={styles.heroMetricLabel}>Número de ventas</Text><Text style={styles.heroMetricValue}>{summary.today.salesCount}</Text></View>
              </View>
            </View>

            <View style={styles.ticketCard}>
              <Text style={styles.ticketLabel}>Ticket promedio</Text>
              <Text style={styles.ticketValue}>{formatCurrency(Number(summary.today.averageSale))}</Text>
              <DeltaBadge pct={summary.today.averageSaleDeltaPct} tone="onLight" />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Ventas de la semana</Text>
                {canViewReports ? <PressableScale accessibilityRole="button" accessibilityLabel="Ver reporte" onPress={() => router.push('/reports')}><Text style={styles.link}>Ver reporte</Text></PressableScale> : null}
              </View>
              <Text style={styles.weekTotal}>{formatCurrency(Number(summary.week.total))}</Text>
              <View style={styles.chartRow}>
                {summary.week.days.map((day) => {
                  const value = Number(day.total);
                  const isToday = day.date === summary.week.to;
                  const heightPct = Math.max(6, (value / maxWeekTotal) * 100);
                  const dayIndex = new Date(`${day.date}T12:00:00`).getDay();
                  return (
                    <View key={day.date} style={styles.chartBarColumn}>
                      <View style={styles.chartBarTrack}><View style={[styles.chartBarFill, { height: `${heightPct}%` }, isToday && styles.chartBarFillActive]} /></View>
                      <Text style={[styles.chartBarLabel, isToday && styles.chartBarLabelActive]}>{WEEKDAY_LETTERS[dayIndex]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {recentSales.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Ventas recientes</Text>
                  <PressableScale accessibilityRole="button" accessibilityLabel="Ver todas las ventas" onPress={() => router.push('/(tabs)/sales')}><Text style={styles.link}>Ver todas</Text></PressableScale>
                </View>
                {recentSales.map((sale) => <SaleRow key={String(sale.sale_id)} sale={sale} onPress={(item) => router.push(saleReceiptRoute(item.sale_id))} />)}
              </View>
            ) : null}

            {summary.today.topProducts && summary.today.topProducts.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top productos</Text>
                {summary.today.topProducts.map((product, index) => (
                  <View key={product.id} style={styles.topProductRow}>
                    <Text style={styles.topProductRank}>{index + 1}.</Text>
                    <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.topProductQty}>{Number(product.quantity)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </FadeInView>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellButton: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  welcome: { marginTop: spacing.lg },
  greeting: { color: colors.ink, fontSize: 22, fontWeight: fontWeights.bold, letterSpacing: -0.5 },
  welcomeText: { marginTop: 2, color: colors.inkMuted, fontSize: 13 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  actionsGrid: { flexDirection: 'row', gap: spacing.sm },
  center: { paddingTop: spacing.xxl, alignItems: 'center' },
  hero: { marginTop: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.ink, padding: spacing.lg },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { color: '#B9C7C4', fontSize: 12, fontWeight: fontWeights.semibold },
  heroValue: { marginTop: spacing.sm, color: colors.white, fontSize: 32, fontWeight: fontWeights.heavy, letterSpacing: -0.8 },
  heroMetricsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  heroMetric: { flex: 1 },
  heroMetricLabel: { color: '#B9C7C4', fontSize: 11 },
  heroMetricValue: { marginTop: 2, color: colors.white, fontSize: 15, fontWeight: fontWeights.bold },
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
  deltaText: { fontSize: 11, fontWeight: fontWeights.bold },
  ticketCard: { ...surfaces.card, marginTop: spacing.md, padding: spacing.lg, alignItems: 'flex-start', gap: spacing.xs },
  ticketLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.semibold },
  ticketValue: { color: colors.ink, fontSize: 22, fontWeight: fontWeights.bold },
  card: { ...surfaces.card, marginTop: spacing.md, padding: spacing.lg },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  cardTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  link: { color: colors.brand, fontSize: 12, fontWeight: fontWeights.bold },
  weekTotal: { color: colors.ink, fontSize: 24, fontWeight: fontWeights.heavy, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96, gap: spacing.xs },
  chartBarColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: spacing.xs },
  chartBarTrack: { width: '100%', flex: 1, justifyContent: 'flex-end', borderRadius: radii.xs, overflow: 'hidden', backgroundColor: colors.canvas },
  chartBarFill: { width: '100%', borderRadius: radii.xs, backgroundColor: colors.brandSoft },
  chartBarFillActive: { backgroundColor: colors.brand },
  chartBarLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.semibold },
  chartBarLabelActive: { color: colors.brand },
  topProductRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  topProductRank: { color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.bold, width: 16 },
  topProductName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: fontWeights.semibold },
  topProductQty: { color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.bold },
});
