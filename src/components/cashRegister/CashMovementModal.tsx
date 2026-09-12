import { randomUUID } from 'expo-crypto';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from '../motion';
import { useAuth } from '../../context/AuthContext';
import { CashRegisterOperationController } from '../../services/cashRegister/cashRegisterOperationController';
import { cashRegisterAttemptStorage } from '../../services/cashRegister/cashRegisterAttemptStorage';
import { buildCashRegisterMovementRequest, cashRegisterOperationMessage, submitCashRegisterMovement } from '../../services/cashRegister/mobileCashRegisterOperationService';
import type { CashRegisterMovementRequest, CashRegisterOperationResponse } from '../../services/cashRegister/mobileCashRegisterOperationService';
import { formatCurrency } from '../../utils/formatCurrency';
import { colors, fontWeights, radii, sizing, spacing, surfaces, typography } from '../../theme';

type Step = 'form' | 'confirm';

export function CashMovementModal({
  visible,
  type,
  registerId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  type: 'in' | 'out';
  registerId: string | number;
  onClose: () => void;
  onSuccess: (response: CashRegisterOperationResponse) => void;
}) {
  const { session, signOut, user } = useAuth();
  const owner = session && user ? `${session.baseUrl.replace(/\/$/, '')}|${String(user.id ?? user.email)}` : '';
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const uuidRef = useRef<string | null>(null);

  const controllers = useRef(new Map<string, CashRegisterOperationController<CashRegisterMovementRequest>>());
  const kind = `movement-${type}`;
  const controller = useMemo(() => {
    const cacheKey = `${owner}|${kind}`;
    const existing = controllers.current.get(cacheKey);
    if (existing) return existing;
    const created = new CashRegisterOperationController<CashRegisterMovementRequest>({
      owner,
      kind,
      storage: owner ? cashRegisterAttemptStorage(owner, kind) : { read: async () => null, write: async () => {}, remove: async () => {} },
      send: (request, accessToken) => submitCashRegisterMovement({ baseUrl: session?.baseUrl ?? '', accessToken, request }),
      onSuccess: (response) => onSuccess(response),
    });
    controllers.current.set(cacheKey, created);
    return created;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, kind, session?.baseUrl]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  const title = type === 'in' ? 'Entrada de efectivo' : 'Salida de efectivo';
  const icon = type === 'in' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline';
  const accent = type === 'in' ? colors.brand : colors.amber;

  const reset = () => {
    setStep('form');
    setAmount('');
    setNotes('');
    setFormError(null);
    uuidRef.current = null;
  };

  const handleClose = () => {
    if (state.status === 'submitting') return;
    reset();
    onClose();
  };

  const handleContinue = () => {
    setFormError(null);
    const numeric = Number(amount.replace(',', '.'));
    if (!amount.trim() || Number.isNaN(numeric) || numeric <= 0) {
      setFormError('Ingresa un monto mayor a cero.');
      return;
    }
    if (notes.trim().length < 3) {
      setFormError('Indica un motivo (mínimo 3 caracteres).');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!session?.accessToken) return;
    uuidRef.current ??= randomUUID();
    const uuid = uuidRef.current;
    const normalizedAmount = Number(amount.replace(',', '.')).toFixed(2);
    await controller.start(
      () => buildCashRegisterMovementRequest(uuid, registerId, type, normalizedAmount, notes),
      session.accessToken
    );
    if (controller.getSnapshot().status === 'success') {
      await controller.finish();
      reset();
      onClose();
    }
  };

  const handleRetry = async () => {
    if (!session?.accessToken) return;
    await controller.retry(session.accessToken);
    if (controller.getSnapshot().status === 'success') {
      await controller.finish();
      reset();
      onClose();
    }
  };

  const submitting = state.status === 'submitting';
  const uncertain = state.status === 'uncertain';
  const businessError = state.status === 'business_error';

  if (state.status === 'session_expired') {
    void signOut();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${accent}1A` }]}>
              <Ionicons name={icon} size={22} color={accent} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={handleClose} hitSlop={12} disabled={submitting}>
              <Ionicons name="close" size={22} color={colors.inkMuted} />
            </Pressable>
          </View>

          {step === 'form' ? (
            <View>
              <Text style={styles.label}>Monto</Text>
              <TextInput
                accessibilityLabel="Monto"
                accessibilityRole="none"
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.inkMuted}
                value={amount}
                onChangeText={setAmount}
              />
              <Text style={styles.label}>Motivo</Text>
              <TextInput
                accessibilityLabel="Motivo"
                accessibilityRole="none"
                style={[styles.input, styles.notesInput]}
                placeholder="Ej. Cambio inicial, retiro de gastos"
                placeholderTextColor={colors.inkMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
              {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
              <PressableScale accessibilityRole="button" style={[styles.primary, { backgroundColor: accent }]} onPress={handleContinue}>
                <Text style={styles.primaryText}>Continuar</Text>
              </PressableScale>
            </View>
          ) : (
            <View>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>Monto</Text>
                <Text style={styles.confirmAmount}>{formatCurrency(Number(amount.replace(',', '.')))}</Text>
                <Text style={styles.confirmLabel}>Motivo</Text>
                <Text style={styles.confirmNotes}>{notes.trim()}</Text>
              </View>
              <Text style={styles.warning}>
                {type === 'in' ? 'Esta entrada aumentará el efectivo esperado en caja.' : 'Esta salida reducirá el efectivo esperado en caja.'}
              </Text>

              {uncertain ? (
                <Text accessibilityRole="alert" style={styles.error}>{state.error ? cashRegisterOperationMessage(state.error.code) : 'No pudimos confirmar la operación.'}</Text>
              ) : null}
              {businessError ? (
                <Text accessibilityRole="alert" style={styles.error}>{state.error ? cashRegisterOperationMessage(state.error.code) : 'No se pudo completar la operación.'}</Text>
              ) : null}

              {uncertain ? (
                <PressableScale accessibilityRole="button" style={[styles.primary, { backgroundColor: accent }]} onPress={handleRetry} disabled={submitting}>
                  {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Reintentar</Text>}
                </PressableScale>
              ) : businessError ? (
                <PressableScale accessibilityRole="button" style={styles.secondary} onPress={() => { controller.reset(); setStep('form'); }}>
                  <Text style={styles.secondaryText}>Corregir</Text>
                </PressableScale>
              ) : (
                <View style={styles.confirmRow}>
                  <PressableScale accessibilityRole="button" style={styles.secondary} onPress={() => setStep('form')} disabled={submitting}>
                    <Text style={styles.secondaryText}>Cancelar</Text>
                  </PressableScale>
                  <PressableScale accessibilityRole="button" style={[styles.primary, styles.confirmPrimary, { backgroundColor: accent }]} onPress={handleConfirm} disabled={submitting}>
                    {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Confirmar</Text>}
                  </PressableScale>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,26,23,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.xl, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  iconBadge: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  label: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold, marginTop: spacing.md },
  input: { ...surfaces.card, marginTop: spacing.xs, padding: spacing.md, color: colors.ink, fontSize: 16 },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.red, marginTop: spacing.md },
  primary: { minHeight: sizing.button, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  primaryText: { color: colors.white, fontWeight: fontWeights.bold },
  secondary: { minHeight: sizing.button, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  secondaryText: { color: colors.brandDark, fontWeight: fontWeights.bold },
  confirmCard: { ...surfaces.card, padding: spacing.lg, marginTop: spacing.sm },
  confirmLabel: { color: colors.inkMuted, fontSize: typography.caption, marginTop: spacing.sm },
  confirmAmount: { color: colors.ink, fontSize: typography.display, fontWeight: fontWeights.bold, marginTop: spacing.xs },
  confirmNotes: { color: colors.ink, fontSize: 14, marginTop: spacing.xs },
  warning: { color: colors.inkMuted, fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  confirmPrimary: { flex: 1, marginTop: spacing.xl },
});
