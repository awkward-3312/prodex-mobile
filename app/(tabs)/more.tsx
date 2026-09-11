import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../src/theme';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function entityName(value: unknown) {
  return isRecord(value) && typeof value.name === 'string' ? value.name : null;
}

export default function MoreScreen() {
  const { user, tenant, operationalContext, signOut } = useAuth();
  const displayName = user?.name ?? user?.email ?? 'Usuario PRODEX';
  const tenantName = tenant?.company_name ? String(tenant.company_name) : 'Empresa activa';
  const branchName = entityName(operationalContext?.branch) ?? entityName(operationalContext?.inventory_location);
  const appVersion = Constants.expoConfig?.version;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Más" subtitle="Cuenta y sesión" icon="menu-outline" />
        <FadeInView style={styles.account}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountLabel}>Sesión activa</Text>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.tenant} numberOfLines={1}>{tenantName}{branchName ? ` · ${branchName}` : ''}</Text>
          </View>
        </FadeInView>
        <PressableScale accessibilityLabel="Cerrar sesión" accessibilityRole="button" onPress={signOut} style={styles.logout}><Ionicons name="log-out-outline" size={18} color={colors.red} /><Text style={styles.logoutText}>Cerrar sesión</Text></PressableScale>
        {appVersion ? <Text style={styles.version}>PRODEX Mobile v{appVersion}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  account: { ...surfaces.card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  avatarText: { color: colors.brandDark, fontSize: typography.body, fontWeight: fontWeights.heavy },
  accountCopy: { flex: 1, minWidth: 0 },
  accountLabel: { color: colors.inkMuted, fontSize: typography.label, fontWeight: fontWeights.bold },
  name: { marginTop: 2, color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.bold },
  tenant: { marginTop: 2, color: colors.inkMuted, fontSize: typography.caption },
  logout: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, borderRadius: radii.md, backgroundColor: colors.redSoft },
  logoutText: { color: colors.red, fontSize: typography.button, fontWeight: fontWeights.semibold },
  version: { marginTop: spacing.lg, color: colors.inkMuted, fontSize: 11, textAlign: 'center' },
});
