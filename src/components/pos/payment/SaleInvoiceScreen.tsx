import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../motion';
import { SaleConfirmation } from './SaleConfirmation';
import { getMobileSaleReceipt } from '../../../services/sales/mobileSaleReceiptService';
import type { SaleAttempt } from '../../../types/mobileSaleSubmission';
import { colors, fontWeights, radii, spacing, sizing, typography } from '../../../theme';

type Props = {
  attempt: SaleAttempt;
  baseUrl: string;
  accessToken: string;
  error?: string;
  onNewSale: () => void;
  onSales: () => void;
};

/**
 * Shows the SAME official invoice PRODEX renders for web/print, fetched read-only
 * via GET /api/mobile/sales/{id}/receipt using the Mobile bearer session. The sale
 * is already confirmed by the time this mounts - a failed/slow invoice load never
 * implies the sale failed, so it falls back to SaleConfirmation with a retry, not
 * an error screen.
 */
export function SaleInvoiceScreen({ attempt, baseUrl, accessToken, error, onNewSale, onSales }: Props) {
  const sale = attempt.response!.sale;
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setLoadFailed(false);
    getMobileSaleReceipt({ baseUrl, accessToken, saleId: sale.id, signal: controller.signal })
      .then((receipt) => setHtml(receipt.html))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [baseUrl, accessToken, sale.id]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /><Text style={styles.loadingText}>Cargando factura...</Text></View></SafeAreaView>;
  }

  if (loadFailed || !html) {
    return <SaleConfirmation attempt={attempt} error={error} onNewSale={onNewSale} onSales={onSales} onRetryInvoice={load} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={18} color={colors.brand} />
        <Text accessibilityRole="header" style={styles.title}>Factura</Text>
        <Text style={styles.reference}>{sale.ref}</Text>
      </View>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />
      <View style={styles.actions}>
        <PressableScale accessibilityRole="button" onPress={onNewSale} style={styles.primary}><Text style={styles.primaryText}>Nueva venta</Text></PressableScale>
        <PressableScale accessibilityRole="button" onPress={onSales} style={styles.secondary}><Text style={styles.secondaryText}>Ver ventas</Text></PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.inkMuted, fontSize: 13, fontWeight: fontWeights.bold },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  title: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  reference: { marginLeft: 'auto', color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.semibold },
  webview: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  primary: { flex: 1, minHeight: sizing.button, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontWeight: fontWeights.bold },
  secondary: { flex: 1, minHeight: sizing.button, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.brandDark, fontWeight: fontWeights.bold },
});
