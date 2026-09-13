import { randomUUID } from 'expo-crypto';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import { useCashRegister } from '../../src/context/CashRegisterContext';
import { CashRegisterOperationController } from '../../src/services/cashRegister/cashRegisterOperationController';
import { cashRegisterAttemptStorage } from '../../src/services/cashRegister/cashRegisterAttemptStorage';
import { cashRegisterOperationMessage } from '../../src/services/cashRegister/mobileCashRegisterOperationService';
import { centsMoney, closeCashRegister, CLOSE_MONEY, closeMoneyFields, denominationTotal, reconcileDenominations, moneyCents, validCloseRequest, validCloseResponse, type CashRegisterCloseRequest, type CashRegisterCloseResponse } from '../../src/services/cashRegister/mobileCashRegisterCloseService';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { colors, fontWeights, radii, sizing, spacing, surfaces } from '../../src/theme';

type Draft = Partial<Omit<CashRegisterCloseRequest, 'operation_uuid' | 'register_id'>>;
const money = (value: string) => formatCurrency(Number(value));
function Line({ label, value }: { label: string; value: string }) {
  return <View style={styles.line}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}
function Field({ label, value, onChange, decimal = false }: { label: string; value?: string; onChange: (value: string) => void; decimal?: boolean }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value ?? ''} onChangeText={onChange} keyboardType={decimal ? 'decimal-pad' : 'default'} placeholder={decimal ? '0.00' : undefined} placeholderTextColor={colors.inkMuted} /></View>;
}

export default function CloseCashRegisterScreen() {
  const { session, user, signOut, hasPermission } = useAuth();
  const { data, status, refresh, invalidate } = useCashRegister();
  const owner = session && user ? `${session.baseUrl.replace(/\/$/, '')}|${String(user.id ?? user.email)}` : '';
  const [draft, setDraft] = useState<Draft>({ counted_cash: '' });
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [breakdownConfirmed, setBreakdownConfirmed] = useState(false);
  const [confirm, setConfirm] = useState<CashRegisterCloseRequest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const completed = useRef<CashRegisterOperationController<CashRegisterCloseRequest, CashRegisterCloseResponse> | null>(null);
  const controller = useMemo(() => new CashRegisterOperationController<CashRegisterCloseRequest, CashRegisterCloseResponse>({
    owner, kind: 'close', storage: cashRegisterAttemptStorage(owner, 'close'),
    validateRequest: validCloseRequest, validateResponse: validCloseResponse,
    send: (request, accessToken) => closeCashRegister({ baseUrl: session?.baseUrl ?? '', accessToken, request }),
  }), [owner, session?.baseUrl]);
  const attempt = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { if (owner) void controller.restore(); }, [controller, owner]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => { if (attempt.status === 'session_expired') void signOut(); }, [attempt.status, signOut]);
  useEffect(() => {
    if (attempt.status !== 'success' || completed.current === controller) return;
    completed.current = controller;
    invalidate();
    void refresh();
    // Even if cleanup fails, the stored confirmed attempt remains locked/recoverable.
    void controller.finish().then(() => router.replace('/cash-register'));
  }, [attempt.status, controller, invalidate, refresh]);

  const register = data?.status === 'open' ? data.register : null;
  const summary = data?.status === 'open' ? data.summary : null;
  const frozen = attempt.attempt?.request ?? confirm;
  const counted = (draft.counted_cash ?? '').replace(',', '.');
  const denominationKeys = summary?.denominations ? [...summary.denominations.bills, ...summary.denominations.coins] : [];
  const quantities = Object.fromEntries(denominationKeys.map(key => [key, quantityInputs[key] === '' ? NaN : Number(quantityInputs[key] ?? '0')]));
  const reconciliation = reconcileDenominations(counted, quantities, summary?.denominations);
  const canReview = reconciliation.matches && breakdownConfirmed && status === 'open';
  const displayedCount = frozen?.counted_cash ?? counted;
  const difference = summary && CLOSE_MONEY.test(displayedCount) ? centsMoney(moneyCents(displayedCount) - (summary.expectedCash.startsWith('-') ? -moneyCents(summary.expectedCash.slice(1)) : moneyCents(summary.expectedCash))) : null;
  const differenceLabel = difference === null ? 'Pendiente de conteo' : difference === '0.00' ? 'Exacto' : difference.startsWith('-') ? 'Faltante' : 'Sobrante';
  const set = (field: keyof Draft, value: string | boolean) => setDraft(current => ({ ...current, [field]: value }));
  const review = () => {
    if (!register || !summary || !canReview) return;
    const payload: CashRegisterCloseRequest = { operation_uuid: randomUUID(), register_id: register.id, counted_cash: counted, counted_denominations: quantities };
    for (const [field, value] of Object.entries(draft)) {
      if (typeof value === 'string' && value.trim()) Object.assign(payload, { [field]: value.trim() });
      if (typeof value === 'boolean') Object.assign(payload, { [field]: value });
    }
    payload.counted_cash = counted;
    for (const field of closeMoneyFields) if (payload[field]) payload[field] = payload[field]!.replace(',', '.');
    if (!validCloseRequest(payload)) { setFormError('Revisa el conteo y los importes. Usa hasta dos decimales y valores de cero o mayores.'); return; }
    setFormError(null);
    setConfirm(JSON.parse(JSON.stringify(payload)));
  };
  const submit = () => {
    if (!session?.accessToken || !confirm) return;
    void controller.start(() => confirm, session.accessToken);
  };
  const retry = () => { if (session?.accessToken) void controller.retry(session.accessToken); };
  const uncertain = attempt.status === 'uncertain';
  const busy = ['loading', 'submitting', 'session_expired', 'success'].includes(attempt.status);
  const recovery = uncertain || attempt.status === 'submitting' || attempt.status === 'business_error' || !!attempt.attempt;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><AppHeader title="Cerrar caja" onBack={() => router.back()} /></View>
    {!hasPermission('Pos_view') ? <EmptyState icon="lock-closed-outline" title="No puedes operar esta caja." /> :
      attempt.status === 'loading' || (status === 'loading' && !recovery) ? <ActivityIndicator accessibilityLabel="Cargando cierre" color={colors.brand} /> :
      !register && !recovery ? <EmptyState icon="lock-closed-outline" title={status === 'error' ? 'No pudimos cargar la caja.' : 'No tienes una caja abierta.'} actionLabel="Ver Caja Actual" onAction={() => router.replace('/cash-register')} /> :
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{confirm || recovery ? 'Confirmar cierre' : 'Revisión de caja'}</Text>
        {register ? <Text style={styles.muted}>{[register.branch?.name, register.inventoryLocation?.name, register.cashDrawer?.name].filter(Boolean).join(' · ')}</Text> : null}
        {summary && register ? <View style={styles.card}>
          <Line label="Saldo inicial" value={money(register.openingBalance)} />
          {!confirm && !recovery ? <>
            <Line label="Ventas en efectivo" value={money(summary.cashSales)} />
            <Line label="Entradas" value={money(summary.cashIn)} />
            <Line label="Salidas" value={money(summary.cashOut)} />
            <Line label="Devoluciones" value={money(summary.cashRefunds)} />
            <Line label="Total de tarjetas" value={money(summary.cardSystemTotal)} />
            <Line label="Transferencias" value={money(summary.transferTotal)} />
          </> : null}
          <Line label="Efectivo esperado" value={money(summary.expectedCash)} />
          <Line label="Ventas totales" value={money(summary.totalSales)} />
          <Line label="Cantidad de transacciones" value={String(summary.transactionCount)} />
        </View> : null}
        {confirm || recovery ? <>
          {frozen ? <View style={styles.card}><Line label="Efectivo contado" value={money(frozen.counted_cash)} /><Line label="Total por denominaciones" value={money(denominationTotal(frozen.counted_denominations))} /><Text style={styles.muted}>El cierre finalizará esta sesión de caja. Verifica el conteo antes de confirmar.</Text></View> : null}
        </> : <>
          <View style={styles.card}>
            <Text style={styles.section}>Conteo de efectivo</Text>
            <Field label="Monto contado" decimal value={draft.counted_cash} onChange={value => { set('counted_cash', value); setBreakdownConfirmed(false); }} />
            <Text style={styles.section}>Desglose por denominaciones</Text>
            {(['bills', 'coins'] as const).map(group => <View key={group}>
              <Text style={styles.label}>{group === 'bills' ? 'Billetes' : 'Monedas'}</Text>
              {summary?.denominations?.[group].map(value => <View key={value} style={styles.line}>
                <Text style={styles.value}>{money(value)}</Text>
                <TextInput style={[styles.input, styles.quantity]} accessibilityLabel={`Cantidad de ${value}`} keyboardType="number-pad" value={quantityInputs[value] ?? '0'} onChangeText={text => {
                  if (/^\d{0,7}$/.test(text) && Number(text) <= 1000000) {
                    setQuantityInputs(current => ({ ...current, [value]: text })); setBreakdownConfirmed(false);
                  }
                }} />
              </View>)}
            </View>)}
            {!summary?.denominations ? <Text accessibilityRole="alert" style={styles.error}>No pudimos obtener las denominaciones. Actualiza Caja antes de continuar.</Text> : null}
            <Line label="Total por denominaciones" value={reconciliation.total === null ? 'Completa las cantidades' : money(reconciliation.total)} />
            <Line label="Monto declarado" value={CLOSE_MONEY.test(counted) ? money(counted) : 'Pendiente'} />
            <Line label="Diferencia de conteo" value={reconciliation.delta === null ? 'Pendiente' : money(centsMoney(reconciliation.delta))} />
            {reconciliation.delta !== null && reconciliation.delta !== 0 ? <View accessibilityLiveRegion="polite">
              <Text style={styles.error}>El desglose por denominaciones debe coincidir con el efectivo contado.</Text>
              <Text style={styles.error}>{reconciliation.delta < 0 ? 'Faltan' : 'Sobran'} {money(centsMoney(Math.abs(reconciliation.delta)))} en el desglose</Text>
            </View> : null}
            <View style={styles.line}><Text style={styles.muted}>Confirmo el desglose por denominaciones</Text><Switch accessibilityLabel="Confirmo el desglose por denominaciones" value={breakdownConfirmed} disabled={!reconciliation.matches} onValueChange={setBreakdownConfirmed} /></View>
          </View>
          {summary && Number(summary.cardSystemTotal) > 0 ? <View style={styles.card}>
            <Text style={styles.section}>Conciliación de tarjetas</Text><Text style={styles.muted}>Datos opcionales del terminal</Text>
            <Field label="Total del terminal" decimal value={draft.card_terminal_total} onChange={v => set('card_terminal_total', v)} />
            <Field label="Número de lote" value={draft.card_batch_number} onChange={v => set('card_batch_number', v)} />
            <Field label="Referencia" value={draft.card_reference} onChange={v => set('card_reference', v)} />
            <Field label="Notas de tarjetas" value={draft.card_notes} onChange={v => set('card_notes', v)} />
          </View> : null}
          {summary && Number(summary.transferTotal) > 0 ? <View style={styles.card}>
            <View style={styles.line}><Text style={styles.value}>Transferencias verificadas</Text><Switch accessibilityLabel="Transferencias verificadas" value={draft.transfers_verified ?? false} onValueChange={v => set('transfers_verified', v)} /></View>
            <Field label="Notas de transferencias" value={draft.transfer_notes} onChange={v => set('transfer_notes', v)} />
          </View> : null}
          <View style={styles.card}><Text style={styles.section}>Efectivo al cierre</Text><Text style={styles.muted}>Opcional</Text>
            <Field label="Efectivo retirado al cierre" decimal value={draft.cash_withdrawn_at_close} onChange={v => set('cash_withdrawn_at_close', v)} />
            <Field label="Fondo para próxima apertura" decimal value={draft.next_opening_float} onChange={v => set('next_opening_float', v)} />
            <Field label="Notas" value={draft.notes} onChange={v => set('notes', v)} />
          </View>
        </>}
        {difference !== null ? <View style={[styles.card, { backgroundColor: difference === '0.00' ? colors.brandSoft : colors.amber + '12' }]}><Line label={`Diferencia de caja · ${differenceLabel}`} value={money(difference)} /><Text style={styles.muted}>Estimación del conteo; PRODEX confirmará el resultado final.</Text></View> : null}
        {formError || attempt.error ? <Text accessibilityRole="alert" style={styles.error}>{formError ?? cashRegisterOperationMessage(attempt.error!.code)}</Text> : null}
        {uncertain ? <><Text style={styles.muted}>Hay un cierre pendiente de confirmar. Reintentar consultará la misma operación guardada.</Text><PressableScale accessibilityRole="button" style={styles.primary} onPress={retry}><Text style={styles.primaryText}>Reintentar cierre</Text></PressableScale></> :
          attempt.status === 'business_error' ? <PressableScale accessibilityRole="button" style={styles.primary} onPress={() => { controller.reset(); setConfirm(null); setBreakdownConfirmed(false); void refresh(); }}><Text style={styles.primaryText}>Corregir</Text></PressableScale> :
          <><PressableScale accessibilityRole="button" accessibilityState={{ disabled: busy || (!confirm && !canReview) }} disabled={busy || (!confirm && !canReview)} style={[styles.primary, (busy || (!confirm && !canReview)) && { opacity: 0.6 }]} onPress={confirm ? submit : review}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{confirm ? 'Cerrar caja' : 'Revisar cierre'}</Text>}</PressableScale>
          {confirm && !busy ? <PressableScale accessibilityRole="button" style={styles.option} onPress={() => setConfirm(null)}><Text style={styles.value}>Volver al conteo</Text></PressableScale> : null}</>}
      </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, header: { paddingHorizontal: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 24, fontWeight: fontWeights.bold, color: colors.ink }, section: { fontSize: 16, fontWeight: fontWeights.bold, color: colors.ink },
  muted: { color: colors.inkMuted, fontSize: 13, flexShrink: 1 }, value: { color: colors.ink, fontWeight: fontWeights.semibold },
  card: { ...surfaces.card, padding: spacing.lg, gap: spacing.sm }, line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.inkMuted, marginTop: spacing.md, marginBottom: spacing.xs }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, minHeight: sizing.touch, padding: spacing.md, color: colors.ink, fontSize: 16 }, quantity: { width: 96 },
  option: { padding: spacing.md, borderRadius: radii.md, alignItems: 'center', minHeight: sizing.touch }, selected: { backgroundColor: colors.brandSoft },
  primary: { minHeight: sizing.button, borderRadius: radii.md, backgroundColor: colors.brandDark, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontWeight: fontWeights.bold }, error: { color: colors.red },
});
