import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import { getMobileClientDetail, mobileClientDetailMessage, MobileClientDetailError } from '../../src/services/clients/mobileClientDetailService';
import type { MobileClientDetail } from '../../src/services/clients/mobileClientDetailService';
import { formatCurrency, parseMinorUnits } from '../../src/utils/formatCurrency';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../src/theme';

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.inkMuted} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, signOut, hasPermission } = useAuth();
  const [client, setClient] = useState<MobileClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (!id || !session?.baseUrl || !session.accessToken) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setErrorMessage(null);
    getMobileClientDetail({ baseUrl: session.baseUrl, accessToken: session.accessToken, clientId: id, signal: controller.signal })
      .then((result) => setClient(result))
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof MobileClientDetailError && error.status === 'session_expired') {
          void signOut();
          return;
        }
        setErrorMessage(error instanceof MobileClientDetailError ? mobileClientDetailMessage(error.status) : 'No pudimos cargar el cliente.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.baseUrl, session?.accessToken]);

  useFocusEffect(useCallback(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]));

  const goBack = () => router.back();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Cliente" onBack={goBack} />
        {hasPermission?.('Customers_edit') && client ? <PressableScale accessibilityRole="button" onPress={() => router.push({ pathname: '/clients/manage', params: { clientId: String(client.id) } })}><Text>Editar cliente</Text></PressableScale> : null}
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
        ) : errorMessage ? (
          <EmptyState icon="cloud-offline-outline" title={errorMessage} actionLabel="Reintentar" onAction={load} compact />
        ) : client ? (
          <FadeInView distance={6}>
            <View style={styles.card}>
              <View style={styles.nameRow}>
                <View style={styles.avatar}><Ionicons name="person" size={22} color={colors.brand} /></View>
                <Text style={styles.name} numberOfLines={2}>{client.name}</Text>
              </View>
              {client.rtn ? <InfoRow icon="document-text-outline" label="RTN" value={client.rtn} /> : null}
              {client.phone ? <InfoRow icon="call-outline" label="Teléfono" value={client.phone} /> : null}
              {client.email ? <InfoRow icon="mail-outline" label="Correo" value={client.email} /> : null}
              {client.address ? <InfoRow icon="location-outline" label="Dirección" value={client.address} /> : null}
            </View>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo</Text>
              <Text style={styles.balanceValue}>{formatCurrency(Number(client.balance))}</Text>
            </View>

            {client.recentSales.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Últimas ventas</Text>
                <View style={styles.salesCard}>
                  {client.recentSales.map((sale, index) => (
                    <PressableScale
                      key={String(sale.sale_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir factura ${sale.reference}`}
                      onPress={() => router.push(`/sales/${sale.sale_id}`)}
                      style={[styles.saleRow, index === client.recentSales.length - 1 && styles.saleRowLast]}
                    >
                      <View style={styles.saleCopy}>
                        <Text style={styles.saleRef} numberOfLines={1}>{sale.reference}</Text>
                        <Text style={styles.saleDate}>{sale.date}</Text>
                      </View>
                      <Text style={styles.saleTotal}>{formatCurrency(parseMinorUnits(sale.grand_total) / 100)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
                    </PressableScale>
                  ))}
                </View>
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
  center: { paddingTop: spacing.xxl, alignItems: 'center' },
  card: { ...surfaces.card, padding: spacing.lg, marginTop: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  name: { flex: 1, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { color: colors.inkMuted, fontSize: 11 },
  infoValue: { marginTop: 1, color: colors.ink, fontSize: 13, fontWeight: fontWeights.semibold },
  balanceCard: { ...surfaces.card, marginTop: spacing.md, padding: spacing.lg, alignItems: 'center' },
  balanceLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.bold },
  balanceValue: { marginTop: spacing.xs, color: colors.brandDark, fontSize: 26, fontWeight: fontWeights.heavy },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  salesCard: { ...surfaces.card, paddingHorizontal: spacing.lg },
  saleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  saleRowLast: { borderBottomWidth: 0 },
  saleCopy: { flex: 1, minWidth: 0 },
  saleRef: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.semibold },
  saleDate: { marginTop: 1, color: colors.inkMuted, fontSize: 11 },
  saleTotal: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold },
});
