import { BrandSignature } from '../src/components/ui/BrandSignature';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../src/components/motion';
import { useAuth } from '../src/context/AuthContext';
import { colors, fontWeights, motion, radii, sizing, spacing } from '../src/theme';

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
            <Text style={styles.subtitle}>Accede a tu operación y continúa donde lo dejaste.</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Espacio de trabajo</Text>
              <View style={styles.inputRow}>
                <Ionicons name="business-outline" size={18} color={colors.inkMuted} style={styles.inputIcon} />
                <TextInput accessibilityLabel="Espacio de trabajo" autoCapitalize="none" autoCorrect={false} value={workspace} onChangeText={(value) => { setWorkspace(value); setLoginError(''); }} placeholder="Identificador de tu empresa" placeholderTextColor={colors.inkMuted} onFocus={() => setFocusedField("workspace")} onBlur={() => setFocusedField(null)} style={styles.inputWithIcon} returnKeyType="next" />
              </View>

              <Text style={[styles.label, styles.labelSpaced]}>Correo electrónico</Text>
              <View style={[styles.inputRow, focusedField === "email" && styles.focusedInput]}>
                <Ionicons name="mail-outline" size={18} color={colors.inkMuted} style={styles.inputIcon} />
                <TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={(value) => { setEmail(value); setLoginError(''); }} placeholder="nombre@empresa.com" placeholderTextColor={colors.inkMuted} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} style={styles.inputWithIcon} returnKeyType="next" />
              </View>

              <Text style={[styles.label, styles.labelSpaced]}>Contraseña</Text>
              <View style={[styles.inputRow, focusedField === "password" && styles.focusedInput, !!loginError && styles.erroredInput]}>
                <Ionicons name="lock-closed-outline" size={18} color={loginError ? colors.red : colors.inkMuted} style={styles.inputIcon} />
                <TextInput accessibilityLabel="Contraseña" autoCapitalize="none" secureTextEntry={!showPassword} value={password} onChangeText={(value) => { setPassword(value); setLoginError(''); }} placeholder="Tu contraseña" placeholderTextColor={colors.inkMuted} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} style={styles.passwordInput} returnKeyType="done" onSubmitEditing={submit} />
                <PressableScale accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} accessibilityRole="button" onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.inkMuted} />
                </PressableScale>
              </View>

              {(formError || loginError) && (
                <FadeInView style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.red} />
                  <Text accessibilityRole="alert" style={styles.error}>{formError || loginError}</Text>
                </FadeInView>
              )}
              {session && error && <PressableScale accessibilityLabel="Reintentar restauración de sesión" accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></PressableScale>}

              <PressableScale accessibilityLabel="Iniciar sesión" accessibilityRole="button" accessibilityState={{ disabled: processing }} disabled={processing} onPress={submit} scaleTo={motion.pressScalePrimary} style={[styles.primary, processing && styles.disabled]}>
                <Text style={styles.primaryText}>{processing ? 'Conectando...' : 'Iniciar sesión'}</Text>
              </PressableScale>
            </View>
            <Text style={styles.footer}>Acceso seguro · Tus datos están protegidos</Text>
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
  welcomeBadge: { alignSelf: 'flex-start', marginTop: spacing.xl, paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.brandSoft, borderRadius: radii.pill },
  welcomeBadgeText: { fontSize: 10, letterSpacing: 1.2, fontWeight: fontWeights.bold, color: colors.brandDark },
  title: { marginTop: spacing.md, color: colors.ink, fontSize: 28, letterSpacing: -0.8, fontWeight: fontWeights.bold },
  subtitle: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 14, lineHeight: 20 },
  form: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  label: { marginBottom: spacing.xs, color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.semibold },
  labelSpaced: { marginTop: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', minHeight: sizing.input, borderRadius: radii.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line },
  inputIcon: { marginLeft: spacing.md },
  inputWithIcon: { flex: 1, minHeight: sizing.input, paddingHorizontal: spacing.sm, color: colors.ink, fontSize: 14 },
  focusedInput: { borderColor: colors.brand, backgroundColor: colors.surface },
  erroredInput: { borderColor: colors.red, backgroundColor: colors.redSoft },
  passwordInput: { flex: 1, minHeight: 50, paddingHorizontal: spacing.sm, color: colors.ink, fontSize: 14 },
  passwordToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  error: { flex: 1, color: colors.red, fontSize: 12, lineHeight: 17, fontWeight: fontWeights.medium },
  retry: { minHeight: 44, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.brand, fontSize: 13, fontWeight: fontWeights.bold },
  primary: { minHeight: sizing.button, marginTop: spacing.xl, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: fontWeights.bold },
  disabled: { opacity: 0.5 },
  footer: { marginTop: spacing.xl, color: colors.inkMuted, fontSize: 11, textAlign: 'center' },
});
