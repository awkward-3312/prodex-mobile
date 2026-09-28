import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../ui/Button';
import type { SaleAttempt } from '../../../types/mobileSaleSubmission';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../../theme';

const paymentLabels = { paid: 'Pagada', partial: 'Pago parcial', unpaid: 'Pendiente de pago' };
export function SaleConfirmation({ attempt, error, onNewSale, onSales, onRetryInvoice }: { attempt: SaleAttempt; error?: string; onNewSale: () => void; onSales: () => void; onRetryInvoice?: () => void }) {
  const sale = attempt.response!.sale;
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.mark}><Ionicons name="checkmark" size={30} color={colors.success} /></View>
    <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.title}>Venta registrada</Text>
    <Text style={styles.subtitle}>{onRetryInvoice ? 'Venta registrada correctamente. No pudimos cargar la factura oficial.' : 'La venta quedó confirmada en PRODEX.'}</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Referencia</Text><Text selectable style={styles.reference}>{sale.ref}</Text>
      <Text style={styles.label}>Total registrado</Text><Text selectable style={styles.total}>{attempt.currency.symbol} {sale.grand_total}</Text>
      <Text style={styles.status}>{paymentLabels[sale.payment_status]}</Text>
      {sale.fiscal_number ? <><Text style={styles.label}>Número fiscal</Text><Text selectable style={styles.reference}>{sale.fiscal_number}</Text></> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {onRetryInvoice ? <Button label="Reintentar factura" onPress={onRetryInvoice} style={styles.actionButton} /> : null}
    <Button label="Nueva venta" variant={onRetryInvoice ? 'secondary' : 'primary'} onPress={onNewSale} style={styles.actionButton} />
    <Button label="Ver ventas" variant="secondary" onPress={onSales} style={styles.actionButton} />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  mark: { alignSelf: 'center', backgroundColor: colors.successSoft, padding: spacing.lg, borderRadius: radii.pill },
  title: { textAlign: 'center', marginTop: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  subtitle: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.sm, lineHeight: 20 },
  card: { ...surfaces.card, marginTop: spacing.xl, padding: spacing.lg },
  label: { color: colors.inkMuted, fontSize: typography.caption, marginTop: spacing.md },
  reference: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.semibold, marginTop: spacing.xs },
  total: { color: colors.brandDark, fontSize: typography.display, fontWeight: fontWeights.bold, marginTop: spacing.xs },
  status: { color: colors.ink, marginTop: spacing.md },
  actionButton: { marginTop: spacing.md },
  error: { color: colors.red, marginTop: spacing.md },
});
