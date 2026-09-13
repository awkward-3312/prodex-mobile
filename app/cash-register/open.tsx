import { useCashRegister } from '../../src/context/CashRegisterContext';
import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { CashRegisterOperationController } from '../../src/services/cashRegister/cashRegisterOperationController';
import { cashRegisterAttemptStorage } from '../../src/services/cashRegister/cashRegisterAttemptStorage';
import { buildCashRegisterOpenRequest, cashRegisterOperationMessage, openCashRegister } from '../../src/services/cashRegister/mobileCashRegisterOperationService';
import type { CashRegisterOpenRequest } from '../../src/services/cashRegister/mobileCashRegisterOperationService';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { colors, fontWeights, radii, sizing, spacing, surfaces, typography } from '../../src/theme';

type Step = 'form' | 'confirm';

export default function OpenCashRegisterScreen() {
  const { refresh, invalidate } = useCashRegister();
  const { session, signOut, user } = useAuth();
  const owner = session && user ? `${session.baseUrl.replace(/\/$/, '')}|${String(user.id ?? user.email)}` : '';
  const [step, setStep] = useState<Step>('form');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const uuidRef = useRef<string | null>(null);

  const controllerRef = useRef<CashRegisterOperationController<CashRegisterOpenRequest> | null>(null);
  const controller = useMemo(() => {
    if (controllerRef.current) return controllerRef.current;
    const created = new CashRegisterOperationController<CashRegisterOpenRequest>({
      owner,
      kind: 'open',
      storage: owner ? cashRegisterAttemptStorage(owner, 'open') : { read: async () => null, write: async () => {}, remove: async () => {} },
      send: (request, accessToken) => openCashRegister({ baseUrl: session?.baseUrl ?? '', accessToken, request }),
    });
    controllerRef.current = created;
    return created;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, session?.baseUrl]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => { void controller.restore(); }, [controller]);

  useEffect(() => {
    if (state.status === 'session_expired') void signOut();
  }, [state.status, signOut]);

  useEffect(() => {
    if (state.status === 'success') {
      invalidate();
      void refresh();
      void controller.finish().then(() => router.replace('/cash-register'));
    }
  }, [state.status, controller, refresh, invalidate]);

  const handleContinue = () => {
    setFormError(null);
    const numeric = Number(openingBalance.replace(',', '.'));
    if (!openingBalance.trim() || Number.isNaN(numeric) || numeric < 0) {
      setFormError('Ingresa un saldo inicial válido (0 o mayor).');
      return;
    }
    setStep('confirm');
  };

  const handleOpen = async () => {
    if (!session?.accessToken) return;
    uuidRef.current ??= randomUUID();
    const uuid = uuidRef.current;
    const normalized = Number(openingBalance.replace(',', '.')).toFixed(2);
    await controller.start(() => buildCashRegisterOpenRequest(uuid, normalized, notes), session.accessToken);
  };

  const handleRetry = async () => {
    if (!session?.accessToken) return;
    await controller.retry(session.accessToken);
  };

  const submitting = state.status === 'submitting';
  const uncertain = state.status === 'uncertain';
  const businessError = state.status === 'business_error';
  const alreadyOpen = businessError && state.error?.code === 'register_already_open';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppHeader title="Abrir caja" onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.contextNote}>
          Se usará tu sucursal, ubicación y caja física asignadas{user?.name ? ` para ${user.name}` : ''}. PRODEX valida el contexto operativo automáticamente.
        </Text>

        {step === 'form' ? (
          <View>
            <Text style={styles.label}>Saldo inicial</Text>
            <TextInput
              accessibilityLabel="Saldo inicial"
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.inkMuted}
              value={openingBalance}
              onChangeText={setOpeningBalance}
            />
            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              accessibilityLabel="Notas"
              style={[styles.input, styles.notesInput]}
              placeholder="Observaciones de apertura"
              placeholderTextColor={colors.inkMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
            <PressableScale accessibilityRole="button" style={styles.primary} onPress={handleContinue}>
              <Text style={styles.primaryText}>Continuar</Text>
            </PressableScale>
          </View>
        ) : (
          <View>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}><Ionicons name="cash-outline" size={22} color={colors.brand} /></View>
              <Text style={styles.confirmLabel}>Saldo inicial</Text>
              <Text style={styles.confirmAmount}>{formatCurrency(Number(openingBalance.replace(',', '.')))}</Text>
              {notes.trim() ? (<><Text style={styles.confirmLabel}>Notas</Text><Text style={styles.confirmNotes}>{notes.trim()}</Text></>) : null}
            </View>

            {uncertain ? (
              <Text accessibilityRole="alert" style={styles.error}>{state.error ? cashRegisterOperationMessage(state.error.code) : 'No pudimos confirmar la apertura.'}</Text>
            ) : null}
            {businessError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {alreadyOpen ? 'Ya tienes una caja abierta. Revisa Caja Actual.' : (state.error ? cashRegisterOperationMessage(state.error.code) : 'No se pudo abrir la caja.')}
              </Text>
            ) : null}

            {uncertain ? (
              <PressableScale accessibilityRole="button" style={styles.primary} onPress={handleRetry} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Reintentar</Text>}
              </PressableScale>
            ) : businessError ? (
              <PressableScale
                accessibilityRole="button"
                style={styles.primary}
                onPress={() => {
                  if (alreadyOpen) { router.replace('/cash-register'); return; }
                  controller.reset();
                  setStep('form');
                }}
              >
                <Text style={styles.primaryText}>{alreadyOpen ? 'Ver Caja Actual' : 'Corregir'}</Text>
              </PressableScale>
            ) : (
              <View style={styles.confirmRow}>
                <PressableScale accessibilityRole="button" style={styles.secondary} onPress={() => setStep('form')} disabled={submitting}>
                  <Text style={styles.secondaryText}>Cancelar</Text>
                </PressableScale>
                <PressableScale accessibilityRole="button" style={[styles.primary, styles.confirmPrimary]} onPress={handleOpen} disabled={submitting}>
                  {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Abrir caja</Text>}
                </PressableScale>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: spacing.lg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  contextNote: { color: colors.inkMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold, marginTop: spacing.md },
  input: { ...surfaces.card, marginTop: spacing.xs, padding: spacing.md, color: colors.ink, fontSize: 16 },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.red, marginTop: spacing.md },
  primary: { minHeight: sizing.button, backgroundColor: colors.brand, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  primaryText: { color: colors.white, fontWeight: fontWeights.bold },
  secondary: { minHeight: sizing.button, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  secondaryText: { color: colors.brandDark, fontWeight: fontWeights.bold },
  confirmCard: { ...surfaces.card, padding: spacing.lg, marginTop: spacing.sm, alignItems: 'flex-start' },
  confirmIcon: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  confirmLabel: { color: colors.inkMuted, fontSize: typography.caption, marginTop: spacing.sm },
  confirmAmount: { color: colors.ink, fontSize: typography.display, fontWeight: fontWeights.bold, marginTop: spacing.xs },
  confirmNotes: { color: colors.ink, fontSize: 14, marginTop: spacing.xs },
  confirmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  confirmPrimary: { flex: 1 },
});
