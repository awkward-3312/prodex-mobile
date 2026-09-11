import { SaleConfirmation } from '../../src/components/pos/payment/SaleConfirmation';
import type { SalePreflightRequest } from '../../src/types/mobilePosSalePreflight';
import { saleSubmissionMessage } from '../../src/services/sales/mobileSaleSubmissionService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CashPaymentForm } from '../../src/components/pos/payment/CashPaymentForm';
import { displayPaymentMethodName, PaymentMethodCard } from '../../src/components/pos/payment/PaymentMethodCard';
import { PaymentSummary } from '../../src/components/pos/payment/PaymentSummary';
import { FadeInView, PressableScale } from '../../src/components/motion';
import { useAuth } from '../../src/context/AuthContext';
import { usePosCart } from '../../src/context/PosCartContext';
import { cartItemsToPreflightLines, checkoutContextLocationLabel, fiscalSummaryFromPreflight, getCheckoutContext, MobilePosCheckoutError, paymentIntentLine, preflightSale, searchClients } from '../../src/services/pos/mobilePosCheckoutService';
import { colors, fontWeights, motion, radii, sizing, spacing, surfaces, typography } from '../../src/theme';
import type { CheckoutAccount, CheckoutContext, CheckoutCurrency, CheckoutCustomer, CheckoutPaymentMethod, ClientSearchResult } from '../../src/types/mobilePosCheckout';
import type { FiscalSummary, PreflightError, PreflightPaymentIntentLine, SalePreflightResponse } from '../../src/types/mobilePosSalePreflight';
import { formatCheckoutMinorUnits, parseMinorUnits } from '../../src/utils/formatCurrency';

type PaymentSelection = string | number | 'mixed' | null;

const CLIENTS_PER_PAGE = 20;

function checkoutErrorMessage(error: MobilePosCheckoutError) {
  if (error.status === 'forbidden') return 'No tienes permiso para usar el checkout móvil.';
  if (error.status === 'invalid_request') return 'PRODEX no pudo validar la solicitud.';
  if (error.status === 'rate_limited') return 'PRODEX recibió muchas solicitudes. Intenta de nuevo en un momento.';
  if (error.status === 'server_error') return 'PRODEX no está disponible en este momento.';
  if (error.status === 'timeout' || error.status === 'network_error') return 'No pudimos conectar con PRODEX.';
  return 'No pudimos cargar el checkout.';
}

function centsToInput(cents: number) {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

function money(value: number, currency?: CheckoutCurrency) {
  return formatCheckoutMinorUnits(value, currency);
}

function accountForMethod(accounts: CheckoutAccount[], method: CheckoutPaymentMethod) {
  return accounts.filter((account) => account.payment_method_id === null || account.payment_method_id === undefined || account.payment_method_id === method.id);
}

function friendlyPreflightError(error: PreflightError) {
  if (error.code === 'insufficient_stock') {
    const detail = error.available_quantity && error.requested_quantity ? ` Disponible: ${error.available_quantity}. Solicitado: ${error.requested_quantity}.` : '';
    return `Stock insuficiente.${detail}`;
  }
  if (error.code === 'invalid_client') return 'Selecciona un cliente válido.';
  if (error.code === 'invalid_quantity') return 'Hay una cantidad inválida en el carrito.';
  if (error.code === 'unsupported_product_type') return 'Uno de los productos no se puede vender desde móvil.';
  if (error.code === 'serial_selection_required') return 'Este producto requiere selección de serie. Se habilitará en una fase posterior.';
  if (error.code === 'batch_selection_required') return 'Este producto requiere selección de lote. Se habilitará en una fase posterior.';
  if (error.code === 'combo_not_supported') return 'Los combos aún no están soportados en checkout móvil.';
  if (error.code === 'invalid_payment_method') return 'Selecciona un método de pago válido.';
  if (error.code === 'unsupported_payment_method') return 'Este método de pago no está soportado en móvil.';
  if (error.code === 'invalid_account') return 'Selecciona una cuenta válida para el método de pago.';
  if (error.code === 'payment_total_invalid') return 'El total pagado no coincide con el total validado.';
  if (error.code === 'invalid_operational_context') return 'El contexto operativo no permite completar esta venta.';
  return saleSubmissionMessage(error.code);
}

export default function CheckoutScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const cart = usePosCart();
  const { session, signOut } = useAuth();
  const [context, setContext] = useState<CheckoutContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CheckoutCustomer | null>(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientResults, setClientResults] = useState<ClientSearchResult[]>([]);
  const [selection, setSelection] = useState<PaymentSelection>(null);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [accountSelections, setAccountSelections] = useState<Record<string, string | number | null>>({});
  const [preflight, setPreflight] = useState<SalePreflightResponse | null>(null);
  const [preflightIntent, setPreflightIntent] = useState<SalePreflightRequest | null>(null);
  const [preflightKey, setPreflightKey] = useState('');
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflightErrorKey, setPreflightErrorKey] = useState('');
  const [preflightLoading, setPreflightLoading] = useState(false);
  const contextAbortRef = useRef<AbortController | null>(null);
  const clientAbortRef = useRef<AbortController | null>(null);
  const preflightAbortRef = useRef<AbortController | null>(null);
  const preflightSeq = useRef(0);

  const availableMethods = useMemo(() => context?.payment_methods.filter((method) => method.is_supported && method.is_available) ?? [], [context]);
  const selectedMethod = useMemo(() => availableMethods.find((method) => method.id === selection) ?? null, [availableMethods, selection]);
  const currency = context?.currency;
  const currentPreflightKey = useMemo(() => JSON.stringify({
    owner: `${session?.baseUrl ?? ''}|${session?.accessToken ?? ''}`,
    context: context?.operational_context,
    customer: selectedCustomer?.id ?? null,
    selection,
    lines: cart.items.map((item) => ({ id: item.product.id, productId: item.product.productId ?? null, variantId: item.product.productVariantId ?? null, quantity: item.quantity })),
    paymentInputs,
    accountSelections,
  }), [accountSelections, cart.items, context?.operational_context, paymentInputs, selectedCustomer?.id, selection, session?.baseUrl, session?.accessToken]);
  const activePreflight = preflightKey === currentPreflightKey ? preflight : null;
  const activePreflightError = preflightErrorKey === currentPreflightKey ? preflightError : null;
  const preflightStatus = activePreflight?.can_submit ? 'validated' : preflightLoading ? 'loading' : 'pending';
  const fiscalSummary = useMemo<FiscalSummary | null>(() => (activePreflight ? fiscalSummaryFromPreflight(activePreflight) : null), [activePreflight]);
  const displayTotalCents = fiscalSummary?.totalCents ?? cart.totalCents;
  const cashInput = selectedMethod ? paymentInputs[String(selectedMethod.id)] ?? '' : '';
  const cashCents = parseMinorUnits(cashInput);
  const backendChangeCents = activePreflight ? parseMinorUnits(activePreflight.payments.change) : null;
  const cashChangeCents = backendChangeCents ?? Math.max(0, cashCents - displayTotalCents);
  const cashShortfallCents = Math.max(0, displayTotalCents - cashCents);
  const quickAmounts = Array.from(new Set([displayTotalCents, 10000, 50000, 100000])).filter((amount) => amount >= displayTotalCents).slice(0, 3).map((amount) => ({ cents: amount, label: amount === displayTotalCents ? 'Exacto' : money(amount, currency).replace('.00', '') }));

  const loadContext = useCallback(async () => {
    if (!session?.baseUrl || !session.accessToken) return;
    contextAbortRef.current?.abort();
    const controller = new AbortController();
    contextAbortRef.current = controller;
    setContextLoading(true);
    setContextError(null);
    try {
      const response = await getCheckoutContext({ baseUrl: session.baseUrl, accessToken: session.accessToken, signal: controller.signal });
      setContext(response);
      setSelectedCustomer(response.customer.default);
      const firstMethod = response.payment_methods.find((method) => method.is_supported && method.is_available);
      setSelection((current) => current ?? firstMethod?.id ?? null);
    } catch (error) {
      if (error instanceof MobilePosCheckoutError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      setContextError(error instanceof MobilePosCheckoutError ? checkoutErrorMessage(error) : 'No pudimos cargar el checkout.');
    } finally {
      setContextLoading(false);
    }
  }, [session?.accessToken, session?.baseUrl, signOut]);

  useEffect(() => {
    void loadContext();
    return () => {
      contextAbortRef.current?.abort();
      clientAbortRef.current?.abort();
      preflightAbortRef.current?.abort();
    };
  }, [loadContext]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedClientSearch(clientSearch.trim()), 350);
    return () => clearTimeout(timeout);
  }, [clientSearch]);

  const loadClients = useCallback(async () => {
    if (!clientModalVisible || !session?.baseUrl || !session.accessToken) return;
    clientAbortRef.current?.abort();
    const controller = new AbortController();
    clientAbortRef.current = controller;
    setClientLoading(true);
    setClientError(null);
    try {
      const response = await searchClients({ baseUrl: session.baseUrl, accessToken: session.accessToken, search: debouncedClientSearch, page: 1, perPage: CLIENTS_PER_PAGE, signal: controller.signal });
      setClientResults(response.items);
    } catch (error) {
      if (error instanceof MobilePosCheckoutError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      setClientError(error instanceof MobilePosCheckoutError ? checkoutErrorMessage(error) : 'No pudimos buscar clientes.');
    } finally {
      setClientLoading(false);
    }
  }, [clientModalVisible, debouncedClientSearch, session?.accessToken, session?.baseUrl, signOut]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    preflightAbortRef.current?.abort();
    preflightSeq.current += 1;
    setPreflight(null);
    setPreflightIntent(null);
    setPreflightLoading(false);
    setPreflightKey('');
    setPreflightError(null);
    setPreflightErrorKey('');
  }, [currentPreflightKey]);

  const updatePaymentInput = (id: string | number, value: string) => setPaymentInputs((current) => ({ ...current, [String(id)]: value }));
  const updateAccount = (id: string | number, value: string | number | null) => setAccountSelections((current) => ({ ...current, [String(id)]: value }));

  const buildPaymentIntent = (): PreflightPaymentIntentLine[] => {
    if (!context || selection === null) return [];
    if (selection === 'mixed') {
      return availableMethods.flatMap((method) => {
        const amount = parseMinorUnits(paymentInputs[String(method.id)] ?? '');
        if (amount <= 0) return [];
        return [paymentIntentLine(method.id, amount, accountSelections[String(method.id)])];
      });
    }
    const method = availableMethods.find((candidate) => candidate.id === selection);
    if (!method) return [];
    const typedAmount = parseMinorUnits(paymentInputs[String(method.id)] ?? '');
    const amount = typedAmount > 0 ? typedAmount : displayTotalCents;
    return [paymentIntentLine(method.id, amount, accountSelections[String(method.id)])];
  };

  const validationMessage = useMemo(() => {
    if (!context) return 'El contexto de checkout no está listo.';
    if (!context.capabilities.can_create_sale) return context.capabilities.reason ?? 'No se puede crear una venta desde este dispositivo.';
    if (cart.items.length === 0) return 'Agrega productos desde el POS para comenzar.';
    if (!selectedCustomer) return 'Selecciona un cliente antes de revisar la venta.';
    if (selection === null) return 'Selecciona un método de pago.';
    if (selection === 'mixed' && buildPaymentIntent().length === 0) return 'Ingresa al menos un monto para pago mixto.';
    const methods = selection === 'mixed' ? availableMethods.filter((method) => parseMinorUnits(paymentInputs[String(method.id)] ?? '') > 0) : selectedMethod ? [selectedMethod] : [];
    const missingAccount = methods.find((method) => method.requires_account && !accountSelections[String(method.id)]);
    if (missingAccount) return `Selecciona una cuenta para ${displayPaymentMethodName(missingAccount)}.`;
    return null;
  }, [accountSelections, availableMethods, cart.items.length, context, paymentInputs, selectedCustomer, selectedMethod, selection]);

  const submitPreflight = async () => {
    if (!session?.baseUrl || !session.accessToken || !selectedCustomer || validationMessage || cart.saleSubmission.isLocked()) return;
    const seq = preflightSeq.current + 1;
    preflightSeq.current = seq;
    preflightAbortRef.current?.abort();
    const controller = new AbortController();
    preflightAbortRef.current = controller;
    setPreflightLoading(true);
    setPreflightError(null);
    try {
      const request: SalePreflightRequest = { client_id: selectedCustomer.id, lines: cartItemsToPreflightLines(cart.items), payment_intent: buildPaymentIntent() };
      const response = await preflightSale({
        baseUrl: session.baseUrl,
        accessToken: session.accessToken,
        signal: controller.signal,
        request,
      });
      if (preflightSeq.current !== seq) return;
      setPreflight(response);
      setPreflightIntent(request);
      setPreflightKey(currentPreflightKey);
      if (!response.can_submit) {
        setPreflightError(response.errors.map(friendlyPreflightError).join('\n') || 'PRODEX no pudo validar la venta.');
        setPreflightErrorKey(currentPreflightKey);
      }
    } catch (error) {
      if (preflightSeq.current !== seq) return;
      if (error instanceof MobilePosCheckoutError && error.status === 'session_expired') {
        await signOut();
        return;
      }
      setPreflightError(error instanceof MobilePosCheckoutError ? checkoutErrorMessage(error) : 'No pudimos revisar la venta.');
      setPreflightErrorKey(currentPreflightKey);
    } finally {
      if (preflightSeq.current === seq) setPreflightLoading(false);
    }
  };

  const renderAccountSelector = (method: CheckoutPaymentMethod) => {
    if (!method.requires_account) return null;
    const accounts = accountForMethod(context?.accounts ?? [], method);
    return <FadeInView style={styles.accountBox} distance={6}><Text style={styles.inputLabel}>Cuenta</Text>{accounts.length === 0 ? <FadeInView><Text style={styles.error}>No hay cuentas disponibles para este método.</Text></FadeInView> : <View style={styles.accountList}>{accounts.map((account) => <PressableScale key={String(account.id)} accessibilityLabel={`Cuenta ${account.name}`} accessibilityRole="radio" accessibilityState={{ selected: accountSelections[String(method.id)] === account.id }} onPress={() => updateAccount(method.id, account.id)} style={[styles.accountChip, accountSelections[String(method.id)] === account.id && styles.accountChipSelected]}><Text style={[styles.accountChipText, accountSelections[String(method.id)] === account.id && styles.accountChipTextSelected]}>{account.name}</Text></PressableScale>)}</View>}</FadeInView>;
  };

  const renderSinglePaymentForm = () => {
    if (!selectedMethod) return null;
    if (selectedMethod.is_cash) {
      return <FadeInView key={`cash-${String(selectedMethod.id)}`} distance={8}><CashPaymentForm totalCents={displayTotalCents} receivedInput={cashInput} receivedCents={cashCents} shortfallCents={cashShortfallCents} changeCents={cashChangeCents} quickAmounts={quickAmounts} currency={currency} onChange={(value) => updatePaymentInput(selectedMethod.id, value)} onQuickAmount={(amount) => updatePaymentInput(selectedMethod.id, centsToInput(amount))} />{renderAccountSelector(selectedMethod)}</FadeInView>;
    }
    const selectedMethodLabel = displayPaymentMethodName(selectedMethod);
    return <FadeInView key={`single-${String(selectedMethod.id)}`} distance={8} style={styles.paymentBox}><Text style={styles.inputLabel}>Monto a aplicar</Text><TextInput accessibilityLabel={`Monto para ${selectedMethodLabel}`} keyboardType="decimal-pad" value={paymentInputs[String(selectedMethod.id)] ?? ''} onChangeText={(value) => updatePaymentInput(selectedMethod.id, value)} placeholder={centsToInput(displayTotalCents)} placeholderTextColor={colors.inkMuted} style={styles.input} /><Text style={styles.hint}>No ingreses datos de tarjeta ni referencias sensibles. El monto será confirmado por PRODEX.</Text>{renderAccountSelector(selectedMethod)}</FadeInView>;
  };

  const renderMixedPaymentForm = () => (
    <FadeInView key="mixed-payment" distance={8} style={styles.paymentBox}>
      <Text style={styles.inputLabel}>Distribuye el pago</Text>
      {availableMethods.map((method) => <View key={String(method.id)} style={styles.mixedLine}><Text style={styles.mixedLabel}>{displayPaymentMethodName(method)}</Text><TextInput accessibilityLabel={`Monto para ${displayPaymentMethodName(method)}`} keyboardType="decimal-pad" value={paymentInputs[String(method.id)] ?? ''} onChangeText={(value) => updatePaymentInput(method.id, value)} placeholder="0.00" placeholderTextColor={colors.inkMuted} style={styles.input} />{renderAccountSelector(method)}</View>)}
    </FadeInView>
  );

  const confirmSale = async () => {
    if (!session?.accessToken || !preflightIntent || validationMessage || !currency) return;
    await cart.saleSubmission.start({ intent: preflightIntent, currentKey: currentPreflightKey, validatedKey: preflightKey, canSubmit: activePreflight?.can_submit === true, currency, token: session.accessToken });
    if (cart.saleSubmission.getSnapshot().status === 'session_expired') await signOut();
    if (cart.saleSubmission.getSnapshot().status === 'business_error') { setPreflight(null); setPreflightKey(''); }
  };
  const retrySale = async () => {
    if (!session?.accessToken) return;
    await cart.saleSubmission.retry(session.accessToken);
    if (cart.saleSubmission.getSnapshot().status === 'session_expired') await signOut();
  };
  const leaveSuccess = async (destination: '/(tabs)/pos' | '/(tabs)/sales') => {
    if (await cart.saleSubmission.finish()) router.replace(destination);
  };
  if (cart.submission.status === 'success' && cart.submission.attempt?.response) {
    return <SaleConfirmation attempt={cart.submission.attempt} error={cart.submission.error?.message} onNewSale={() => { void leaveSuccess('/(tabs)/pos'); }} onSales={() => { void leaveSuccess('/(tabs)/sales'); }} />;
  }
  if (cart.cartLocked) {
    const busy = cart.submission.status === 'submitting' || cart.submission.status === 'loading';
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.empty}>
      {busy ? <ActivityIndicator size="large" color={colors.brand} /> : <Ionicons name="cloud-offline-outline" size={38} color={colors.amber} />}
      <Text accessibilityRole="header" style={styles.emptyTitle}>{busy ? 'Confirmando venta' : 'Confirmación pendiente'}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.emptyText}>{busy ? 'Espera mientras comprobamos la confirmación.' : 'No pudimos confirmar la respuesta. Puedes reintentar de forma segura. Conservamos los datos de esta venta.'}</Text>
      {cart.submission.error && cart.submission.error.message !== saleSubmissionMessage('network_error') ? <Text accessibilityRole="alert" style={styles.error}>{cart.submission.error.message}</Text> : null}
      {!busy && <PressableScale accessibilityRole="button" onPress={retrySale} style={styles.primary}><Text style={styles.primaryText}>Reintentar confirmación</Text></PressableScale>}
      <PressableScale accessibilityRole="button" onPress={() => router.replace('/(tabs)/pos')} style={styles.close}><Text style={styles.change}>Volver</Text></PressableScale>
    </ScrollView></SafeAreaView>;
  }

  if (cart.items.length === 0) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><FadeInView style={styles.empty}><Ionicons name="cart-outline" size={42} color={colors.inkMuted} /><Text style={styles.emptyTitle}>No hay una venta activa</Text><Text style={styles.emptyText}>Agrega productos desde el POS para comenzar.</Text><PressableScale accessibilityLabel="Volver al POS" accessibilityRole="button" onPress={() => router.replace('/(tabs)/pos')} style={styles.primary}><Text style={styles.primaryText}>Volver al POS</Text></PressableScale></FadeInView></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeInView style={styles.header} distance={6}>
            <PressableScale accessibilityLabel="Volver al POS" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale>
            <View style={styles.headerCopy}><Text style={styles.title}>Cobrar</Text><Text style={styles.location}>{checkoutContextLocationLabel(context)}</Text></View>
          </FadeInView>

          {contextLoading && <FadeInView style={styles.stateBox}><ActivityIndicator color={colors.brand} /><Text style={styles.stateText}>Cargando contexto de checkout...</Text></FadeInView>}
          {contextError && <FadeInView style={styles.stateBox}><Text style={styles.error}>{contextError}</Text><PressableScale accessibilityLabel="Reintentar checkout" accessibilityRole="button" onPress={loadContext} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></PressableScale></FadeInView>}

          <FadeInView delay={30} distance={6}><PaymentSummary itemCount={cart.itemCount} subtotalCents={fiscalSummary?.subtotalCents ?? cart.subtotalCents} discountCents={fiscalSummary?.discountCents ?? cart.discountCents} taxCents={fiscalSummary?.taxCents ?? 0} totalCents={fiscalSummary?.totalCents ?? cart.totalCents} authoritative={!!fiscalSummary} currency={currency} /></FadeInView>

          <Text style={styles.sectionTitle}>Cliente</Text>
          <FadeInView delay={55} distance={6} style={styles.customer}><View style={styles.customerCopy}><Text style={styles.customerLabel}>Cliente actual</Text><Text style={styles.customerName}>{selectedCustomer?.name ?? 'Selecciona un cliente'}</Text>{selectedCustomer?.rtn ? <Text style={styles.customerMeta}>RTN {selectedCustomer.rtn}</Text> : null}</View><PressableScale accessibilityLabel="Cambiar cliente" accessibilityRole="button" onPress={() => setClientModalVisible(true)} style={styles.changeButton}><Text style={styles.change}>Cambiar</Text></PressableScale></FadeInView>

          <Text style={styles.sectionTitle}>Método de pago</Text>
          <View style={styles.methods}>{availableMethods.map((option) => <PaymentMethodCard key={String(option.id)} method={option} selected={selection === option.id} onPress={() => setSelection(option.id)} />)}{context?.capabilities.mixed_payments && <PaymentMethodCard method={{ id: 'mixed', name: 'Pago mixto', type: 'mixed', is_cash: false, is_card: false }} selected={selection === 'mixed'} onPress={() => setSelection('mixed')} />}</View>
          {selection === 'mixed' ? renderMixedPaymentForm() : renderSinglePaymentForm()}

          {cart.submission.status === 'business_error' && cart.submission.error && <Text accessibilityRole="alert" style={styles.error}>{cart.submission.error.message}</Text>}
          {validationMessage && <FadeInView><Text style={styles.error}>{validationMessage}</Text></FadeInView>}
          {activePreflightError && <FadeInView style={styles.preflightErrors}>{activePreflightError.split('\n').map((line) => <Text key={line} style={styles.error}>{line}</Text>)}</FadeInView>}
          <FadeInView style={[styles.preflightStatus, preflightStatus === 'validated' && styles.validated]} distance={4} duration={motion.duration.fast}>
            {preflightStatus === 'loading' ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name={preflightStatus === 'validated' ? 'checkmark-circle' : 'shield-checkmark-outline'} size={20} color={preflightStatus === 'validated' ? colors.brand : colors.inkMuted} />}
            <Text style={[styles.preflightStatusText, preflightStatus === 'validated' && styles.validatedText]}>{preflightStatus === 'validated' ? 'Venta validada por PRODEX. Aún no se ha confirmado el cobro.' : preflightStatus === 'loading' ? 'Validando venta con PRODEX...' : 'Pendiente de validación fiscal.'}</Text>
          </FadeInView>

          <PressableScale accessibilityLabel={activePreflight?.can_submit ? 'Confirmar venta' : 'Revisar venta'} accessibilityRole="button" accessibilityState={{ disabled: !!validationMessage || preflightLoading }} disabled={!!validationMessage || preflightLoading} onPress={activePreflight?.can_submit ? confirmSale : submitPreflight} scaleTo={motion.pressScalePrimary} style={[styles.confirm, !!validationMessage && styles.disabled]}><View style={styles.confirmContent}>{preflightLoading ? <ActivityIndicator size="small" color={colors.white} /> : null}<Text style={styles.confirmText}>{preflightLoading ? 'Revisando...' : activePreflight?.can_submit ? 'Confirmar venta' : 'Revisar venta'}</Text></View></PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={clientModalVisible} transparent animationType="fade" onRequestClose={() => setClientModalVisible(false)}>
        <View style={styles.overlay}><Pressable accessibilityLabel="Cerrar búsqueda de clientes" accessibilityRole="button" onPress={() => setClientModalVisible(false)} style={styles.backdrop} /><FadeInView distance={18} duration={motion.duration.slow} style={[styles.clientSheetWrap, { maxHeight: windowHeight * 0.82 }]}><SafeAreaView edges={[]} style={styles.clientSheet}><View style={styles.handle} /><View style={styles.modalHeader}><Text style={styles.modalTitle}>Seleccionar cliente</Text><PressableScale accessibilityLabel="Cerrar" accessibilityRole="button" onPress={() => setClientModalVisible(false)} style={styles.close}><Ionicons name="close" size={20} color={colors.ink} /></PressableScale></View><TextInput accessibilityLabel="Buscar cliente" value={clientSearch} onChangeText={setClientSearch} placeholder="Nombre, teléfono o RTN" placeholderTextColor={colors.inkMuted} style={styles.input} />{clientLoading && <FadeInView><ActivityIndicator color={colors.brand} style={styles.modalSpinner} /></FadeInView>}{clientError && <FadeInView><Text style={styles.error}>{clientError}</Text></FadeInView>}<FlatList data={clientResults} keyExtractor={(item) => String(item.id)} keyboardShouldPersistTaps="handled" ListEmptyComponent={!clientLoading ? <FadeInView><Text style={styles.emptyText}>No encontramos clientes.</Text></FadeInView> : null} renderItem={({ item }) => <PressableScale accessibilityLabel={`Seleccionar ${item.name}`} accessibilityRole="button" onPress={() => { setSelectedCustomer(item); setClientModalVisible(false); }} style={styles.clientRow}><View><Text style={styles.clientName}>{item.name}</Text><Text style={styles.clientMeta}>{[item.phone, item.rtn ? `RTN ${item.rtn}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.inkMuted} /></PressableScale>} /></SafeAreaView></FadeInView></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  back: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headerCopy: { flex: 1, marginLeft: spacing.md },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  location: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.medium },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  stateBox: { ...surfaces.card, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  stateText: { color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.bold },
  customer: { ...surfaces.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  customerCopy: { flex: 1 },
  customerLabel: { color: colors.inkMuted, fontSize: 12 },
  customerName: { marginTop: spacing.xs, color: colors.ink, fontSize: 14, fontWeight: fontWeights.bold },
  customerMeta: { marginTop: 2, color: colors.inkMuted, fontSize: 12 },
  changeButton: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  change: { color: colors.brand, fontSize: 12, fontWeight: fontWeights.semibold },
  methods: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  paymentBox: { ...surfaces.card, marginTop: spacing.md, padding: spacing.md },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  input: { ...surfaces.input, marginTop: spacing.sm, paddingHorizontal: spacing.md, color: colors.ink },
  hint: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  mixedLine: { marginTop: spacing.md },
  mixedLabel: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  accountBox: { marginTop: spacing.md },
  accountList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  accountChip: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  accountChipSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  accountChipText: { color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.semibold },
  accountChipTextSelected: { color: colors.brandDark },
  confirm: { minHeight: 50, marginTop: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  confirmContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: fontWeights.semibold },
  disabled: { opacity: 0.45 },
  error: { marginTop: spacing.sm, color: colors.red, fontSize: 12, fontWeight: fontWeights.bold, lineHeight: 17 },
  preflightErrors: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.redSoft },
  preflightStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  preflightStatusText: { flex: 1, color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.bold, lineHeight: 17 },
  validated: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  validatedText: { color: colors.ink },
  retry: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  retryText: { color: colors.white, fontSize: 12, fontWeight: fontWeights.semibold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: { marginTop: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  emptyText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
  primary: { minHeight: sizing.button, width: '100%', marginTop: spacing.xl, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: fontWeights.bold },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(23, 50, 77, 0.38)' },
  clientSheetWrap: { width: '100%' },
  clientSheet: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.surface },
  handle: { alignSelf: 'center', width: 38, height: 4, marginBottom: spacing.md, borderRadius: radii.pill, backgroundColor: colors.line },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  close: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  modalSpinner: { marginTop: spacing.md },
  clientRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  clientName: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold },
  clientMeta: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 12 },
});
