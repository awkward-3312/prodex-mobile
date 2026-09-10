import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CashPaymentForm } from '../../src/components/pos/payment/CashPaymentForm';
import { CardPaymentForm } from '../../src/components/pos/payment/CardPaymentForm';
import { MixedPaymentForm } from '../../src/components/pos/payment/MixedPaymentForm';
import { PaymentMethodCard, paymentMethodLabel } from '../../src/components/pos/payment/PaymentMethodCard';
import { PaymentSummary } from '../../src/components/pos/payment/PaymentSummary';
import { SaleSuccess } from '../../src/components/pos/payment/SaleSuccess';
import { TransferPaymentForm } from '../../src/components/pos/payment/TransferPaymentForm';
import { appConfig } from '../../src/config/app';
import { usePosCart } from '../../src/context/PosCartContext';
import { colors, radii, spacing, typography } from '../../src/theme';
import type { PaymentMethod } from '../../src/types/pos';
import { formatMinorUnits, parseMinorUnits } from '../../src/utils/formatCurrency';

const paymentMethods: PaymentMethod[] = ['cash', 'card', 'transfer', 'mixed'];

export default function CheckoutScreen() {
  const cart = usePosCart();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashInput, setCashInput] = useState('');
  const [cardReference, setCardReference] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [mixedInputs, setMixedInputs] = useState({ cash: '', card: '', transfer: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState<{ number: string; completedAt: string; changeCents: number } | null>(null);
  const [receiptMessage, setReceiptMessage] = useState('');
  const processingRef = useRef(false);

  const cashCents = parseMinorUnits(cashInput);
  const cashChangeCents = Math.max(0, cashCents - cart.totalCents);
  const cashShortfallCents = Math.max(0, cart.totalCents - cashCents);
  const mixedPaidCents = parseMinorUnits(mixedInputs.cash) + parseMinorUnits(mixedInputs.card) + parseMinorUnits(mixedInputs.transfer);
  const mixedPendingCents = Math.max(0, cart.totalCents - mixedPaidCents);
  const mixedExcessCents = Math.max(0, mixedPaidCents - cart.totalCents);
  const canConfirm = cart.items.length > 0 && !isProcessing && (method === 'cash' ? cashCents >= cart.totalCents : method === 'mixed' ? mixedPaidCents === cart.totalCents : true);
  const quickAmounts = Array.from(new Set([cart.totalCents, 10000, 50000, 100000])).filter((amount) => amount >= cart.totalCents).slice(0, 3).map((amount) => ({ cents: amount, label: amount === cart.totalCents ? 'Exacto' : formatMinorUnits(amount).replace('.00', '') }));

  const updateMixed = (key: keyof typeof mixedInputs, value: string) => setMixedInputs((current) => ({ ...current, [key]: value }));

  const confirmSale = () => {
    if (!canConfirm || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setTimeout(() => {
      setCompleted({ number: `V-${10483 + cart.itemCount}`, completedAt: new Date().toLocaleString('es-HN'), changeCents: method === 'cash' ? cashChangeCents : 0 });
      setIsProcessing(false);
      processingRef.current = false;
    }, 500);
  };

  if (cart.items.length === 0 && !completed) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><View style={styles.empty}><Ionicons name="cart-outline" size={42} color={colors.inkMuted} /><Text style={styles.emptyTitle}>No hay una venta activa</Text><Text style={styles.emptyText}>Agrega productos desde el POS para comenzar.</Text><Pressable accessibilityLabel="Volver al POS" accessibilityRole="button" onPress={() => router.replace('/(tabs)/pos')} style={styles.primary}><Text style={styles.primaryText}>Volver al POS</Text></Pressable></View></SafeAreaView>;
  }

  if (completed) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><SaleSuccess saleNumber={completed.number} totalCents={cart.totalCents} method={paymentMethodLabel(method)} customer="Consumidor final" completedAt={completed.completedAt} changeCents={completed.changeCents} onNewSale={() => { cart.clearCart(); router.replace('/(tabs)/pos'); }} onReceipt={() => setReceiptMessage('El comprobante estará disponible próximamente.')} />{receiptMessage.length > 0 && <Text style={styles.receiptMessage}>{receiptMessage}</Text>}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="Volver al POS" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink} /></Pressable>
            <View style={styles.headerCopy}><Text style={styles.title}>Cobrar</Text><Text style={styles.location}>{appConfig.activeLocation}</Text></View>
          </View>
          <PaymentSummary itemCount={cart.itemCount} subtotalCents={cart.subtotalCents} discountCents={cart.discountCents} taxCents={cart.taxCents} totalCents={cart.totalCents} />
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.customer}><View><Text style={styles.customerLabel}>Cliente actual</Text><Text style={styles.customerName}>Consumidor final</Text></View><Pressable accessibilityLabel="Cambiar cliente" accessibilityRole="button" onPress={() => undefined}><Text style={styles.change}>Cambiar</Text></Pressable></View>
          <Text style={styles.sectionTitle}>Método de pago</Text>
          <View style={styles.methods}>{paymentMethods.map((option) => <PaymentMethodCard key={option} method={option} selected={method === option} onPress={() => setMethod(option)} />)}</View>
          {method === 'cash' && <CashPaymentForm totalCents={cart.totalCents} receivedInput={cashInput} receivedCents={cashCents} shortfallCents={cashShortfallCents} changeCents={cashChangeCents} quickAmounts={quickAmounts} onChange={setCashInput} onQuickAmount={(amount) => setCashInput(String(amount / 100))} />}
          {method === 'card' && <CardPaymentForm reference={cardReference} onChange={setCardReference} />}
          {method === 'transfer' && <TransferPaymentForm reference={transferReference} onChange={setTransferReference} />}
          {method === 'mixed' && <MixedPaymentForm totalCents={cart.totalCents} cashInput={mixedInputs.cash} cardInput={mixedInputs.card} transferInput={mixedInputs.transfer} paidCents={mixedPaidCents} pendingCents={mixedPendingCents} excessCents={mixedExcessCents} onChange={updateMixed} />}
          {method === 'cash' && cashCents < cart.totalCents && cashInput.length > 0 && <Text style={styles.error}>Faltan {formatMinorUnits(cashShortfallCents)}</Text>}
          {method === 'mixed' && mixedExcessCents > 0 && <Text style={styles.error}>El pago excede el total por {formatMinorUnits(mixedExcessCents)}.</Text>}
          <Pressable accessibilityLabel="Confirmar venta" accessibilityRole="button" accessibilityState={{ disabled: !canConfirm }} disabled={!canConfirm} onPress={confirmSale} style={({ pressed }) => [styles.confirm, !canConfirm && styles.disabled, pressed && styles.pressed]}><Text style={styles.confirmText}>{isProcessing ? 'Procesando...' : 'Confirmar venta'}</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  back: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headerCopy: { marginLeft: spacing.md },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  location: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 11, fontWeight: '600' },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  customer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  customerLabel: { color: colors.inkMuted, fontSize: 11 },
  customerName: { marginTop: spacing.xs, color: colors.ink, fontSize: 14, fontWeight: '800' },
  change: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  methods: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  confirm: { minHeight: 52, marginTop: spacing.xl, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  error: { marginTop: spacing.sm, color: colors.red, fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: { marginTop: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  emptyText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
  primary: { minHeight: 48, width: '100%', marginTop: spacing.xl, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  receiptMessage: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});