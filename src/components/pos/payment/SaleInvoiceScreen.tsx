import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../motion';
import { Button } from '../../ui/Button';
import { getMobileSaleReceipt, MobileSaleReceiptError } from '../../../services/sales/mobileSaleReceiptService';
import type { MobileSaleReceipt, MobileSaleReceiptErrorStatus } from '../../../services/sales/mobileSaleReceiptService';
import { isOnline, useConnectivity } from '../../../services/connectivity/connectivityController';
import { colors, fontWeights, radii, spacing, sizing, typography } from '../../../theme';

type Action = { label: string; onPress: () => void };

type Props = {
  saleId: string | number;
  baseUrl: string;
  accessToken: string;
  primaryAction: Action;
  secondaryAction?: Action;
  onBack?: () => void;
  /** Session expired (401) is a global concern, not a local retry state - the caller owns signOut. */
  onSessionExpired?: () => void;
  /** Rendered instead of the WebView when the receipt fails to load. The sale itself is
   * already confirmed/exists; this must never look like the sale failed. */
  renderFallback: (retry: () => void, status: MobileSaleReceiptErrorStatus) => ReactNode;
};

/**
 * Shows the SAME official invoice PRODEX renders for web/print, fetched read-only via
 * GET /api/mobile/sales/{id}/receipt using the Mobile bearer session. One implementation
 * shared by checkout-success and sales-history: only the actions, header and fallback UI
 * differ per caller.
 */
export function SaleInvoiceScreen({ saleId, baseUrl, accessToken, primaryAction, secondaryAction, onBack, onSessionExpired, renderFallback }: Props) {
  const [receipt, setReceipt] = useState<MobileSaleReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<MobileSaleReceiptErrorStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Callers routinely pass inline callbacks that get a new identity every render; keeping
  // them out of `load`'s dependency array is what keeps this to exactly one fetch per
  // saleId instead of refetching on every parent re-render.
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const connectivity = useConnectivity();
  const offlineAtLoadRef = useRef(false);

  const load = useCallback(() => {
    abortRef.current?.abort();
    if (!isOnline()) {
      // Skip a fetch we already know cannot succeed; the sale itself is unaffected.
      offlineAtLoadRef.current = true;
      setLoading(false);
      setErrorStatus('offline');
      return;
    }
    offlineAtLoadRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setErrorStatus(null);
    getMobileSaleReceipt({ baseUrl, accessToken, saleId, signal: controller.signal })
      .then((result) => setReceipt(result))
      .catch((error) => {
        if (controller.signal.aborted) return;
        const status = error instanceof MobileSaleReceiptError ? error.status : 'network_error';
        if (status === 'session_expired' && onSessionExpiredRef.current) {
          onSessionExpiredRef.current();
          return;
        }
        setErrorStatus(status);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, accessToken, saleId]);

  // Safe to auto-retry: read-only GET, nothing was sent while offline.
  useEffect(() => {
    if (connectivity.status === 'online' && offlineAtLoadRef.current) load();
  }, [connectivity.status, load]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /><Text style={styles.loadingText}>Cargando factura...</Text></View></SafeAreaView>;
  }

  if (errorStatus || !receipt) {
    return <>{renderFallback(load, errorStatus ?? 'invalid_response')}</>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {onBack ? <PressableScale accessibilityLabel="Volver" accessibilityRole="button" onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale> : <Ionicons name="receipt-outline" size={18} color={colors.brand} />}
        <Text accessibilityRole="header" style={styles.title}>Factura</Text>
        <Text style={styles.reference}>{receipt.reference}</Text>
      </View>
      <WebView originWhitelist={['*']} source={{ html: receipt.html }} style={styles.webview} />
      <View style={styles.actions}>
        <Button label={primaryAction.label} onPress={primaryAction.onPress} fullWidth={false} style={styles.actionButton} />
        {secondaryAction ? <Button label={secondaryAction.label} variant="secondary" onPress={secondaryAction.onPress} fullWidth={false} style={styles.actionButton} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.inkMuted, fontSize: 13, fontWeight: fontWeights.bold },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  back: { width: sizing.iconButton, height: sizing.iconButton, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  reference: { marginLeft: 'auto', color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.semibold },
  webview: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  actionButton: { flex: 1 },
});
