import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../src/components/motion';
import { useAuth } from '../src/context/AuthContext';
import { colors, fontWeights, motion, radii, sizing, spacing, typography } from '../src/theme';

export default function LoginScreen() {
  const { status, error, session, retryBootstrap, signIn } = useAuth();
  const [workspace, setWorkspace] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loginError, setLoginError] = useState('');
  const processing = status === 'resolving_tenant' || status === 'authenticating' || status === 'bootstrapping';

  const submit = async () => {
    if (!workspace.trim() || !email.trim() || !password) {
      setFormError('Completa workspace, correo y contraseña.');
      return;
    }
    setFormError('');
    setLoginError('');
    const result = await signIn(workspace, email, password);
    if (!result.ok) setLoginError(result.message);
  };

  const retry = async () => {
    await retryBootstrap();
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><FadeInView style={styles.content}><View style={styles.brandMark}><Ionicons name="business-outline" size={25} color={colors.brand} /></View><Text style={styles.title}>Bienvenido a PRODEX</Text><Text style={styles.subtitle}>Ingresa a tu espacio de trabajo para continuar.</Text><View style={styles.form}><Text style={styles.label}>Workspace</Text><TextInput accessibilityLabel="Workspace" autoCapitalize="none" autoCorrect={false} value={workspace} onChangeText={(value) => { setWorkspace(value); setLoginError(''); }} placeholder="prueba02" placeholderTextColor={colors.inkMuted} style={styles.input} /><Text style={styles.hint}>Solo escribe el identificador de tu workspace.</Text><Text style={styles.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={(value) => { setEmail(value); setLoginError(''); }} placeholder="nombre@empresa.com" placeholderTextColor={colors.inkMuted} style={styles.input} /><Text style={styles.label}>Contraseña</Text><View style={styles.passwordRow}><TextInput accessibilityLabel="Contraseña" autoCapitalize="none" secureTextEntry={!showPassword} value={password} onChangeText={(value) => { setPassword(value); setLoginError(''); }} placeholder="Tu contraseña" placeholderTextColor={colors.inkMuted} style={styles.passwordInput} /><PressableScale accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} accessibilityRole="button" onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.inkMuted} /></PressableScale></View>{(formError || loginError) && <FadeInView><Text accessibilityRole="alert" style={styles.error}>{formError || loginError}</Text></FadeInView>}{session && error && <PressableScale accessibilityLabel="Reintentar restauración de sesión" accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></PressableScale>}<PressableScale accessibilityLabel="Iniciar sesión" accessibilityRole="button" accessibilityState={{ disabled: processing }} disabled={processing} onPress={submit} scaleTo={motion.pressScalePrimary} style={[styles.primary, processing && styles.disabled]}><Text style={styles.primaryText}>{processing ? 'Conectando...' : 'Iniciar sesión'}</Text></PressableScale></View></FadeInView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  brandMark: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  title: { marginTop: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  subtitle: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
  form: { marginTop: spacing.xl },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: 14 },
  hint: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 11 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  passwordInput: { flex: 1, minHeight: 46, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 14 },
  passwordToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { marginTop: spacing.md, color: colors.red, fontSize: 12, lineHeight: 18 },
  retry: { minHeight: 44, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.brand, fontSize: 13, fontWeight: fontWeights.bold },
  primary: { minHeight: sizing.button, marginTop: spacing.xl, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: fontWeights.bold },
  disabled: { opacity: 0.5 },
});
