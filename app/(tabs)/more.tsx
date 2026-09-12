import { UserAvatar } from '../../src/components/ui/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
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

function MenuRow({ icon, label, onPress, tone = 'default' }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
  const color = tone === 'danger' ? colors.red : colors.ink;
  return (
    <PressableScale accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, tone === 'danger' && styles.rowIconDanger]}><Ionicons name={icon} size={18} color={tone === 'danger' ? colors.red : colors.brand} /></View>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {tone !== 'danger' ? <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} /> : null}
    </PressableScale>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <FadeInView style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </FadeInView>
  );
}

export default function MoreScreen() {
  const { user, tenant, operationalContext, signOut, hasPermission } = useAuth();
  const displayName = user?.name ?? user?.email ?? 'Usuario PRODEX';
  const tenantName = tenant?.company_name ? String(tenant.company_name) : 'Empresa activa';
  const branchName = entityName(operationalContext?.branch) ?? entityName(operationalContext?.inventory_location);
  const appVersion = Constants.expoConfig?.version;

  const canViewClients = hasPermission('Customers_view');
  const canViewCashRegister = hasPermission('Pos_view') || hasPermission('cash_register_report');
  const canViewReports = hasPermission('Reports_sales');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Más" subtitle="Cuenta y sesión" />
        <FadeInView style={styles.account}>
          <UserAvatar size={64} />
          <View style={styles.accountCopy}>
            <Text style={styles.accountLabel}>Sesión activa</Text>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.tenant} numberOfLines={1}>{tenantName}{branchName ? ` · ${branchName}` : ''}</Text>
          </View>
        </FadeInView>

        {(canViewClients || canViewCashRegister || canViewReports) && (
          <Section title="OPERACIÓN">
            {canViewClients ? <MenuRow icon="people-outline" label="Clientes" onPress={() => router.push('/clients')} /> : null}
            {canViewCashRegister ? <MenuRow icon="cash-outline" label="Caja" onPress={() => router.push('/cash-register')} /> : null}
          </Section>
        )}

        {canViewReports && (
          <Section title="GESTIÓN">
            <MenuRow icon="bar-chart-outline" label="Reportes" onPress={() => router.push('/reports')} />
          </Section>
        )}

        <Section title="CUENTA">
          <MenuRow icon="log-out-outline" label="Cerrar sesión" onPress={signOut} tone="danger" />
        </Section>

        {appVersion ? <Text style={styles.version}>PRODEX Mobile v{appVersion}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  account: { ...surfaces.card, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, marginTop: spacing.md },
  accountCopy: { flex: 1, minWidth: 0 },
  accountLabel: { color: colors.brand, fontSize: typography.label, fontWeight: fontWeights.bold },
  name: { marginTop: 2, color: colors.ink, fontSize: 18, fontWeight: fontWeights.bold },
  tenant: { marginTop: 2, color: colors.inkMuted, fontSize: typography.caption },
  section: { marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.sm, color: colors.inkMuted, fontSize: 11, fontWeight: fontWeights.bold, letterSpacing: 0.4 },
  sectionBody: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowIcon: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  rowIconDanger: { backgroundColor: colors.redSoft },
  rowLabel: { flex: 1, fontSize: typography.body, fontWeight: fontWeights.semibold },
  version: { marginTop: spacing.lg, color: colors.inkMuted, fontSize: 11, textAlign: 'center' },
});
