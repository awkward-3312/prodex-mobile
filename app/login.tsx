import { BrandSignature } from '../src/components/ui/BrandSignature';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [loginError, setLoginError] = useState('');
  const processing = status === 'resolving_tenant' || status === 'authenticating' || status === 'bootstrapping';

  const submit = async () => {
    if (!workspace.trim() || !email.trim() || !password) {
      setFormError('Completa espacio de trabajo, correo y contraseña.');
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeInView>
            <BrandSignature />
            <View style={styles.welcomeBadge}><Text style={styles.welcomeBadgeText}>TU NEGOCIO, CONTIGO</Text></View>
            <Text style={styles.title}>Bienvenido de nuevo</Text>
            <Text style={styles.subtitle}>Todo listo para un nuevo día.
Accede a tu espacio de trabajo.</Text>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Inicia sesión</Text>
              <Text style={styles.label}>Espacio de trabajo</Text>
              <TextInput accessibilityLabel="Espacio de trabajo" autoCapitalize="none" autoCorrect={false} value={workspace} onChangeText={(value) => { setWorkspace(value); setLoginError(''); }} placeholder="Identificador de tu empresa" placeholderTextColor={colors.inkMuted} onFocus={() => setFocusedField("workspace")} onBlur={() => setFocusedField(null)} style={[styles.input, focusedField === "workspace" && styles.focusedInput]} returnKeyType="next" />
              <Text style={styles.hint}>Ingresa el identificador de tu empresa.</Text>

              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={(value) => { setEmail(value); setLoginError(''); }} placeholder="nombre@empresa.com" placeholderTextColor={colors.inkMuted} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} style={[styles.input, focusedField === "email" && styles.focusedInput]} returnKeyType="next" />

              <Text style={styles.label}>Contraseña</Text>
              <View style={[styles.passwordRow, focusedField === "password" && styles.focusedInput]}>
                <TextInput accessibilityLabel="Contraseña" autoCapitalize="none" secureTextEntry={!showPassword} value={password} onChangeText={(value) => { setPassword(value); setLoginError(''); }} placeholder="Tu contraseña" placeholderTextColor={colors.inkMuted} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} style={styles.passwordInput} returnKeyType="done" onSubmitEditing={submit} />
                <PressableScale accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} accessibilityRole="button" onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.inkMuted} />
                </PressableScale>
              </View>

              {(formError || loginError) && <FadeInView><Text accessibilityRole="alert" style={styles.error}>{formError || loginError}</Text></FadeInView>}
              {session && error && <PressableScale accessibilityLabel="Reintentar restauración de sesión" accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></PressableScale>}

              <PressableScale accessibilityLabel="Iniciar sesión" accessibilityRole="button" accessibilityState={{ disabled: processing }} disabled={processing} onPress={submit} scaleTo={motion.pressScalePrimary} style={[styles.primary, processing && styles.disabled]}>
                <Text style={styles.primaryText}>{processing ? 'Conectando...' : 'Iniciar sesión'}</Text>
              </PressableScale>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  welcomeBadge: { alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.brandSoft, borderRadius: radii.pill },
  welcomeBadgeText: { fontSize: 10, letterSpacing: 1.2, fontWeight: fontWeights.bold, color: colors.brandDark },
  formTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold, marginBottom: spacing.sm },
  title: { marginTop: spacing.md, color: colors.ink, fontSize: 28, letterSpacing: -0.8, textAlign: 'center', fontWeight: fontWeights.bold },
  subtitle: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  form: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  input: { minHeight: sizing.input, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: 14 },
  hint: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 11 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', minHeight: sizing.input, borderRadius: radii.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line },
  focusedInput: { borderColor: colors.brand, backgroundColor: colors.surface },
  passwordInput: { flex: 1, minHeight: 50, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 14 },
  passwordToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { backgroundColor: colors.redSoft, padding: spacing.md, borderRadius: radii.sm, marginTop: spacing.md, color: colors.red, fontSize: 12, lineHeight: 18 },
  retry: { minHeight: 44, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.brand, fontSize: 13, fontWeight: fontWeights.bold },
  primary: { minHeight: sizing.button, marginTop: spacing.xl, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: fontWeights.bold },
  disabled: { opacity: 0.5 },
});
