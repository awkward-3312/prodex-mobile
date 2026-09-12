import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '../../src/components/pos/CategoryChip';
import { FadeInView } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import { computeReportRange, getMobileReportsSummary, mobileReportsMessage, MobileReportsError } from '../../src/services/reports/mobileReportsService';
import type { MobileReportRow, MobileReportsSummary, ReportRangePreset } from '../../src/services/reports/mobileReportsService';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../src/theme';

const RANGE_OPTIONS: { id: ReportRangePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
];

function RankedList({ title, rows, valueField, valueSuffix }: { title: string; rows: MobileReportRow[]; valueField: 'quantity' | 'total'; valueSuffix?: string }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => Number(row[valueField] ?? 0)));

  return (
    <View style={styles.listCard}>
      <Text style={styles.listTitle}>{title}</Text>
      {rows.map((row, index) => {
        const raw = Number(row[valueField] ?? 0);
        const ratio = max > 0 ? raw / max : 0;
        const display = valueField === 'total' ? formatCurrency(raw) : `${raw}${valueSuffix ?? ''}`;
        return (
          <View key={`${row.name}-${index}`} style={styles.listRow}>
            <Text style={styles.listRank}>{index + 1}</Text>
            <View style={styles.listBarTrack}>
              <Text style={styles.listName} numberOfLines={1}>{row.name}</Text>
              <View style={styles.barBackground}><View style={[styles.barFill, { width: `${Math.max(6, ratio * 100)}%` }]} /></View>
            </View>
            <Text style={styles.listValue}>{display}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ReportsScreen() {
  const { session, signOut } = useAuth();
  const [preset, setPreset] = useState<ReportRangePreset>('today');
  const [summary, setSummary] = useState<MobileReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const range = useMemo(() => computeReportRange(preset), [preset]);

  const load = useCallback(() => {
    if (!session?.baseUrl || !session.accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setErrorMessage(null);
    getMobileReportsSummary({ baseUrl: session.baseUrl, accessToken: session.accessToken, from: range.from, to: range.to, signal: controller.signal })
      .then((result) => setSummary(result))
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof MobileReportsError && error.status === 'session_expired') {
          void signOut();
          return;
        }
        setErrorMessage(error instanceof MobileReportsError ? mobileReportsMessage(error.status) : 'No pudimos cargar el reporte.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.baseUrl, session?.accessToken, range.from, range.to]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Reportes" subtitle="Resumen del negocio" onBack={() => router.back()} />

        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => (
            <CategoryChip key={option.id} label={option.label} selected={preset === option.id} onPress={() => setPreset(option.id)} />
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
        ) : errorMessage ? (
          <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={load} compact />
        ) : summary ? (
          <FadeInView distance={6}>
            <View style={styles.heroCard}>
              <Text style={styles.heroValue}>{formatCurrency(Number(summary.salesTotal))}</Text>
              <Text style={styles.heroLabel}>Ventas totales</Text>
              <View style={styles.heroChipsRow}>
                <View style={styles.heroChip}><Text style={styles.heroChipText}>{summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'}</Text></View>
                <View style={styles.heroChip}><Text style={styles.heroChipText}>{formatCurrency(Number(summary.averageSale))} promedio</Text></View>
              </View>
            </View>

            <View style={styles.metricsCard}>
              <View style={styles.metricRow}><Text style={styles.metricLabel}>ISV</Text><Text style={styles.metricValue}>{formatCurrency(Number(summary.taxTotal))}</Text></View>
              <View style={styles.metricRow}><Text style={styles.metricLabel}>Pagado</Text><Text style={styles.metricValue}>{formatCurrency(Number(summary.paidTotal))}</Text></View>
              <View style={[styles.metricRow, styles.metricRowLast]}><Text style={styles.metricLabel}>Pendiente</Text><Text style={styles.metricValue}>{formatCurrency(Number(summary.pendingTotal))}</Text></View>
            </View>

            {summary.salesCount === 0 ? (
              <EmptyState icon="bar-chart-outline" title="Sin ventas en este período." compact />
            ) : (
              <>
                <RankedList title="Productos más vendidos" rows={summary.topProducts} valueField="quantity" />
                <RankedList title="Clientes principales" rows={summary.topCustomers} valueField="total" />
                <RankedList title="Métodos de pago" rows={summary.paymentMethods} valueField="total" />
              </>
            )}
          </FadeInView>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  center: { paddingTop: spacing.xxl, alignItems: 'center' },
  heroCard: { ...surfaces.card, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.brandSoft },
  heroValue: { color: colors.brandDark, fontSize: 32, fontWeight: fontWeights.heavy },
  heroLabel: { marginTop: 2, color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.bold },
  heroChipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.surface },
  heroChipText: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.semibold },
  metricsCard: { ...surfaces.card, marginTop: spacing.md, paddingHorizontal: spacing.lg },
  metricRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  metricRowLast: { borderBottomWidth: 0 },
  metricLabel: { color: colors.inkMuted, fontSize: 13, fontWeight: fontWeights.semibold },
  metricValue: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold },
  listCard: { ...surfaces.card, marginTop: spacing.md, padding: spacing.lg },
  listTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold, marginBottom: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  listRank: { width: 16, color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.bold },
  listBarTrack: { flex: 1, minWidth: 0 },
  listName: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.semibold },
  barBackground: { marginTop: 3, height: 5, borderRadius: radii.pill, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.brand },
  listValue: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
});
