import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../src/components/ui/Button';
import { SaleInvoiceScreen } from '../../src/components/pos/payment/SaleInvoiceScreen';
import { useAuth } from '../../src/context/AuthContext';
import { mobileSaleReceiptMessage } from '../../src/services/sales/mobileSaleReceiptService';
import { colors, fontWeights, spacing, typography } from '../../src/theme';

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
          <Button label="Volver a ventas" onPress={goBackToSales} style={styles.actionButton} />
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
            <Button label="Reintentar" onPress={retry} style={styles.actionButton} />
            <Button label="Volver a ventas" variant="secondary" onPress={goBackToSales} style={styles.actionButton} />
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
  actionButton: { width: '100%', marginTop: spacing.md },
});
