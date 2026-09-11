import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/context/AuthContext';
import { colors, radii, spacing, typography } from '../../src/theme';

export default function MoreScreen() {
  const { user, tenant, signOut } = useAuth();
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}><Text style={styles.title}>Más opciones</Text><View style={styles.account}><Text style={styles.accountLabel}>Sesión activa</Text><Text style={styles.name}>{user?.name ?? user?.email ?? 'Usuario PRODEX'}</Text><Text style={styles.tenant}>{tenant?.company_name ? String(tenant.company_name) : 'Empresa activa'}</Text></View><Pressable accessibilityLabel="Cerrar sesión" accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Text style={styles.logoutText}>Cerrar sesión</Text></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  account: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  accountLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  name: { marginTop: spacing.sm, color: colors.ink, fontSize: 16, fontWeight: '800' },
  tenant: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 13 },
  logout: { minHeight: 48, marginTop: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redSoft },
  logoutText: { color: colors.red, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
