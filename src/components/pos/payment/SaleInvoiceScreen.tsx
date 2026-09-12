import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../motion';
import { getMobileSaleReceipt, MobileSaleReceiptError } from '../../../services/sales/mobileSaleReceiptService';
import type { MobileSaleReceipt, MobileSaleReceiptErrorStatus } from '../../../services/sales/mobileSaleReceiptService';
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

  const load = useCallback(() => {
    abortRef.current?.abort();
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
        {onBack ? <PressableScale accessibilityLabel="Volver" accessibilityRole="button" onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.ink} /></PressableScale> : <Ionicons name="receipt-outline" size={18} color={colors.brand} />}
        <Text accessibilityRole="header" style={styles.title}>Factura</Text>
        <Text style={styles.reference}>{receipt.reference}</Text>
      </View>
      <WebView originWhitelist={['*']} source={{ html: receipt.html }} style={styles.webview} />
      <View style={styles.actions}>
        <PressableScale accessibilityRole="button" onPress={primaryAction.onPress} style={styles.primary}><Text style={styles.primaryText}>{primaryAction.label}</Text></PressableScale>
        {secondaryAction ? <PressableScale accessibilityRole="button" onPress={secondaryAction.onPress} style={styles.secondary}><Text style={styles.secondaryText}>{secondaryAction.label}</Text></PressableScale> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.inkMuted, fontSize: 13, fontWeight: fontWeights.bold },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  back: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  title: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  reference: { marginLeft: 'auto', color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.semibold },
  webview: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  primary: { flex: 1, minHeight: sizing.button, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontWeight: fontWeights.bold },
  secondary: { flex: 1, minHeight: sizing.button, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.brandDark, fontWeight: fontWeights.bold },
});
