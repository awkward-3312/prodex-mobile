import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../../src/components/motion';
import { SaleInvoiceScreen } from '../../src/components/pos/payment/SaleInvoiceScreen';
import { useAuth } from '../../src/context/AuthContext';
import { mobileSaleReceiptMessage } from '../../src/services/sales/mobileSaleReceiptService';
import { colors, fontWeights, radii, sizing, spacing, typography } from '../../src/theme';

/** Opens the same official invoice as checkout success, for an existing sale from Ventas history. */
export default function SaleReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, signOut } = useAuth();

  const goBackToSales = () => router.back();

  if (!id || !session?.baseUrl || !session.accessToken) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.inkMuted} />
          <Text style={styles.title}>No pudimos abrir esta venta.</Text>
          <PressableScale accessibilityLabel="Volver a ventas" accessibilityRole="button" onPress={goBackToSales} style={styles.primary}><Text style={styles.primaryText}>Volver a ventas</Text></PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SaleInvoiceScreen
      saleId={id}
      baseUrl={session.baseUrl}
      accessToken={session.accessToken}
      onBack={goBackToSales}
      primaryAction={{ label: 'Volver a ventas', onPress: goBackToSales }}
      onSessionExpired={() => { void signOut(); }}
      renderFallback={(retry, status) => (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.amber} />
            <Text accessibilityRole="header" style={styles.title}>No pudimos cargar la factura.</Text>
            <Text style={styles.message}>{mobileSaleReceiptMessage(status)}</Text>
            <PressableScale accessibilityLabel="Reintentar" accessibilityRole="button" onPress={retry} style={styles.primary}><Text style={styles.primaryText}>Reintentar</Text></PressableScale>
            <PressableScale accessibilityLabel="Volver a ventas" accessibilityRole="button" onPress={goBackToSales} style={styles.secondary}><Text style={styles.secondaryText}>Volver a ventas</Text></PressableScale>
          </View>
        </SafeAreaView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  title: { marginTop: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold, textAlign: 'center' },
  message: { color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
  primary: { minHeight: sizing.button, width: '100%', marginTop: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontWeight: fontWeights.bold },
  secondary: { minHeight: sizing.button, width: '100%', marginTop: spacing.sm, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.brandDark, fontWeight: fontWeights.bold },
});
