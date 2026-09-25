import { randomUUID } from 'expo-crypto';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { CashRegisterOperationController } from '../../services/cashRegister/cashRegisterOperationController';
import { cashRegisterAttemptStorage } from '../../services/cashRegister/cashRegisterAttemptStorage';
import { isOnline } from '../../services/connectivity/connectivityController';
import { buildCashRegisterMovementRequest, cashRegisterOperationMessage, submitCashRegisterMovement } from '../../services/cashRegister/mobileCashRegisterOperationService';
import type { CashRegisterMovementRequest, CashRegisterOperationResponse } from '../../services/cashRegister/mobileCashRegisterOperationService';
import { formatCurrency } from '../../utils/formatCurrency';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../theme';

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
      isOnline,
    });
    controllers.current.set(cacheKey, created);
    return created;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, kind, session?.baseUrl]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  const title = type === 'in' ? 'Entrada de efectivo' : 'Salida de efectivo';
  const icon = type === 'in' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline';
  const accent = type === 'in' ? colors.brand : colors.amber;
  const accentSoft = type === 'in' ? colors.brandSoft : colors.amberSoft;

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
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={[styles.iconBadge, { backgroundColor: accentSoft }]}>
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
              <Button label="Continuar" onPress={handleContinue} style={[styles.actionButton, { backgroundColor: accent, borderColor: accent }]} />
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
                <Button label="Reintentar" onPress={handleRetry} loading={submitting} style={[styles.actionButton, { backgroundColor: accent, borderColor: accent }]} />
              ) : businessError ? (
                <Button label="Corregir" variant="secondary" onPress={() => { controller.reset(); setStep('form'); }} style={styles.actionButton} />
              ) : (
                <View style={styles.confirmRow}>
                  <Button label="Cancelar" variant="secondary" fullWidth={false} onPress={() => setStep('form')} disabled={submitting} style={styles.confirmButton} />
                  <Button label="Confirmar" fullWidth={false} onPress={handleConfirm} loading={submitting} style={[styles.confirmButton, { backgroundColor: accent, borderColor: accent }]} />
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
  backdrop: { flex: 1, backgroundColor: 'rgba(10, 30, 54, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.xl, paddingBottom: spacing.xxl },
  handle: { alignSelf: 'center', width: 38, height: 4, marginBottom: spacing.md, borderRadius: radii.pill, backgroundColor: colors.line },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  iconBadge: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  label: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold, marginTop: spacing.md },
  input: { ...surfaces.card, marginTop: spacing.xs, padding: spacing.md, color: colors.ink, fontSize: 16 },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.red, marginTop: spacing.md },
  actionButton: { marginTop: spacing.xl },
  confirmCard: { ...surfaces.card, padding: spacing.lg, marginTop: spacing.sm },
  confirmLabel: { color: colors.inkMuted, fontSize: typography.caption, marginTop: spacing.sm },
  confirmAmount: { color: colors.ink, fontSize: typography.display, fontWeight: fontWeights.bold, marginTop: spacing.xs },
  confirmNotes: { color: colors.ink, fontSize: 14, marginTop: spacing.xs },
  warning: { color: colors.inkMuted, fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xl },
  confirmButton: { flex: 1 },
});
