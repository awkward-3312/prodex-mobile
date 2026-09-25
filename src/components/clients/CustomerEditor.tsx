import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { PressableScale } from '../motion';
import { Button } from '../ui/Button';
import { customerAttemptStorage, CustomerCreateController } from '../../services/clients/customerCreateController';
import { canonicalCustomer, createCustomer, customerFields, CustomerWriteError, emptyCustomer, loadCustomerConfiguration, loadEditableCustomer, updateCustomer, validCustomer, type CustomerField, type ManagedCustomer } from '../../services/clients/customerManagementService';
import { colors, fontWeights, spacing, surfaces, typography } from '../../theme';

const labels: Record<CustomerField, string> = { name: 'Nombre o razón social *', firstname: 'Nombres', lastname: 'Apellidos', phone: 'Teléfono', email: 'Correo electrónico', tax_number: 'Identificación fiscal', country: 'País', state: 'Departamento / estado', city: 'Ciudad', zip: 'Código postal', adresse: 'Dirección' };
export function CustomerEditor({ clientId, origin, onSuccess, onCancel }: { clientId?: string; origin: 'clients' | 'pos'; onSuccess: (client: ManagedCustomer) => void; onCancel: () => void }) {
  const { user, session, hasPermission, signOut } = useAuth();
  const permitted = hasPermission(clientId ? 'Customers_edit' : 'Customers_add');
  const owner = `${session?.baseUrl ?? ''}|${user?.id ?? user?.email ?? ''}`;
  const controller = useMemo(() => new CustomerCreateController(owner, customerAttemptStorage(owner), (request, token) => createCustomer(session?.baseUrl ?? '', token, request)), [owner, session?.baseUrl]);
  const attempt = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [draft, setDraft] = useState(emptyCustomer);
  const [taxLabel, setTaxLabel] = useState(labels.tax_number);
  const [loading, setLoading] = useState(!!clientId);
  const [editLoaded, setEditLoaded] = useState(!clientId);
  const [loadRevision, setLoadRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<CustomerWriteError | null>(null);
  const busy = useRef(false);
  const delivered = useRef(false);
  const successRef = useRef(onSuccess); successRef.current = onSuccess;
  useEffect(() => {
    if (!permitted || !session) return;
    let live = true;
    loadCustomerConfiguration(session.baseUrl, session.accessToken).then(value => { if (live) setTaxLabel(value); }).catch(failure => { if (live) setError(failure); if (failure.kind === 'session_expired') void signOut(); });
    if (clientId) loadEditableCustomer(session.baseUrl, session.accessToken, clientId).then(client => { if (live) { setDraft(canonicalCustomer(client)); setEditLoaded(true); } }).catch(failure => { if (live) setError(failure); if (failure.kind === 'session_expired') void signOut(); }).finally(() => { if (live) setLoading(false); });
    else void controller.restore();
    return () => { live = false; };
  }, [clientId, controller, permitted, session?.accessToken, loadRevision]);
  useEffect(() => { if (attempt.attempt) setDraft(attempt.attempt.request.customer); }, [attempt.attempt?.request]);
  const complete = async () => {
    if (delivered.current || !attempt.attempt?.result) return;
    if (await controller.finish()) { delivered.current = true; successRef.current(attempt.attempt.result); }
  };
  useEffect(() => { if (!clientId && attempt.status === 'success') void complete(); }, [attempt.status, clientId]);
  useEffect(() => { if (attempt.status === 'session_expired') void signOut(); }, [attempt.status]);
  const submit = async () => {
    if (!session || !permitted || !editLoaded || busy.current) return;
    setError(null);
    const customer = canonicalCustomer(draft);
    const { name, email } = customer;
    const valid = validCustomer(customer);
    if (!valid) { setError(new CustomerWriteError('definitive', 'validation_error', { name: name ? undefined : 'Ingresa un nombre.', email: email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Ingresa un correo válido.' : undefined })); return; }
    busy.current = true; setSaving(true);
    try {
      if (clientId) { const result = await updateCustomer(session.baseUrl, session.accessToken, clientId, customer); successRef.current(result); }
      else await controller.start({ operation_uuid: randomUUID(), customer }, session.accessToken);
    } catch (failure) {
      const problem = failure instanceof CustomerWriteError ? failure : new CustomerWriteError('uncertain', 'network_error');
      setError(problem); if (problem.kind === 'session_expired') void signOut();
    } finally { busy.current = false; setSaving(false); }
  };
  if (!permitted) return <View style={styles.deniedWrap}><Text style={styles.deniedText}>No tienes permiso para {clientId ? 'editar' : 'crear'} clientes.</Text><PressableScale onPress={onCancel} accessibilityRole="button" style={styles.cancel}><Text style={styles.cancelText}>Volver</Text></PressableScale></View>;
  const locked = !clientId && !['idle', 'error'].includes(attempt.status);
  const shownError = error ?? attempt.error;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>{clientId ? 'Editar cliente' : 'Nuevo cliente'}</Text>
    {origin === 'pos' ? <Text style={styles.hint}>Al guardar, este cliente quedará seleccionado en el cobro.</Text> : null}
    {loading || (!clientId && attempt.status === 'loading') ? <ActivityIndicator color={colors.brand} /> : <View style={styles.card}>
      {customerFields.map(field => <View key={field}><Text style={styles.fieldLabel}>{field === 'tax_number' ? taxLabel : labels[field]}</Text><TextInput accessibilityLabel={labels[field]} editable={!locked && !saving} value={locked && attempt.attempt ? attempt.attempt.request.customer[field] : draft[field]} onChangeText={value => setDraft(current => ({ ...current, [field]: value }))} keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'} autoCapitalize={field === 'email' ? 'none' : 'sentences'} maxLength={255} style={styles.input} placeholderTextColor={colors.inkMuted} />{shownError?.fields[field] ? <Text style={styles.error}>{shownError.fields[field]}</Text> : null}</View>)}
    </View>}
    {clientId && !editLoaded && !loading ? <PressableScale accessibilityRole="button" style={styles.retryLoad} onPress={() => { setLoading(true); setLoadRevision(value => value + 1); }}><Text style={styles.retryLoadText}>Reintentar carga</Text></PressableScale> : null}
    {shownError ? <Text accessibilityRole="alert" style={styles.error}>{shownError.message}</Text> : null}
    {!clientId && ['uncertain', 'session_expired'].includes(attempt.status) ? <><Text style={styles.hint}>Hay una creación pendiente. Conservamos sus datos para reintentar sin duplicarla.</Text><Button label="Reintentar creación" onPress={() => { if (session) void controller.retry(session.accessToken); }} /></> : attempt.status === 'success' && !clientId ? <Button label="Continuar" onPress={complete} /> : <Button label="Guardar cliente" loading={saving} disabled={locked || loading || !editLoaded} onPress={submit} />}
    <PressableScale accessibilityRole="button" disabled={saving || attempt.status === 'busy'} onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Volver</Text></PressableScale>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: typography.title, fontWeight: fontWeights.bold, color: colors.ink },
  hint: { color: colors.inkMuted, fontSize: typography.caption },
  card: { ...surfaces.card, padding: spacing.md, gap: spacing.md },
  fieldLabel: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold },
  input: { ...surfaces.input, padding: spacing.sm, color: colors.ink, marginTop: spacing.xs },
  error: { color: colors.red },
  retryLoad: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  retryLoadText: { color: colors.brandDark, fontWeight: fontWeights.bold },
  cancel: { padding: spacing.md, alignItems: 'center' },
  cancelText: { color: colors.inkMuted, fontWeight: fontWeights.semibold },
  deniedWrap: { padding: spacing.lg, gap: spacing.md },
  deniedText: { color: colors.ink, fontSize: typography.body },
});
