import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../../motion';
import type { SaleAttempt } from '../../../types/mobileSaleSubmission';
import { colors, fontWeights, radii, sizing, spacing, surfaces, typography } from '../../../theme';

const paymentLabels = { paid: 'Pagada', partial: 'Pago parcial', unpaid: 'Pendiente de pago' };
export function SaleConfirmation({ attempt, error, onNewSale, onSales, onRetryInvoice }: { attempt: SaleAttempt; error?: string; onNewSale: () => void; onSales: () => void; onRetryInvoice?: () => void }) {
  const sale = attempt.response!.sale;
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.mark}><Ionicons name="checkmark" size={30} color={colors.brand} /></View>
    <Text accessibilityRole="header" style={styles.title}>Venta registrada</Text>
    <Text style={styles.subtitle}>{onRetryInvoice ? 'Venta registrada correctamente. No pudimos cargar la factura oficial.' : 'La venta quedó confirmada en PRODEX.'}</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Referencia</Text><Text selectable style={styles.reference}>{sale.ref}</Text>
      <Text style={styles.label}>Total registrado</Text><Text selectable style={styles.total}>{attempt.currency.symbol} {sale.grand_total}</Text>
      <Text style={styles.status}>{paymentLabels[sale.payment_status]}</Text>
      {sale.fiscal_number ? <><Text style={styles.label}>Número fiscal</Text><Text selectable style={styles.reference}>{sale.fiscal_number}</Text></> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {onRetryInvoice ? <PressableScale accessibilityRole="button" onPress={onRetryInvoice} style={styles.primary}><Text style={styles.primaryText}>Reintentar factura</Text></PressableScale> : null}
    <PressableScale accessibilityRole="button" onPress={onNewSale} style={onRetryInvoice ? styles.secondary : styles.primary}><Text style={onRetryInvoice ? styles.secondaryText : styles.primaryText}>Nueva venta</Text></PressableScale>
    <PressableScale accessibilityRole="button" onPress={onSales} style={styles.secondary}><Text style={styles.secondaryText}>Ver ventas</Text></PressableScale>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  mark: { alignSelf: 'center', backgroundColor: colors.brandSoft, padding: spacing.lg, borderRadius: radii.pill },
  title: { textAlign: 'center', marginTop: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  subtitle: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.sm, lineHeight: 20 },
  card: { ...surfaces.card, marginTop: spacing.xl, padding: spacing.lg },
  label: { color: colors.inkMuted, fontSize: typography.caption, marginTop: spacing.md },
  reference: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.semibold, marginTop: spacing.xs },
  total: { color: colors.brandDark, fontSize: typography.display, fontWeight: fontWeights.bold, marginTop: spacing.xs },
  status: { color: colors.ink, marginTop: spacing.md },
  primary: { minHeight: sizing.button, backgroundColor: colors.brand, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  primaryText: { color: colors.white, fontWeight: fontWeights.bold },
  secondary: { minHeight: sizing.button, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  secondaryText: { color: colors.brandDark, fontWeight: fontWeights.bold },
  error: { color: colors.red, marginTop: spacing.md },
});
