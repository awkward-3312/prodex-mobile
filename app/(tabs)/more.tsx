import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../src/components/motion';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontWeights, radii, spacing, surfaces, typography } from '../../src/theme';

const groups = [
  { title: 'Operación', items: [{ label: 'Configuración del POS', icon: 'settings-outline' as const }, { label: 'Caja y turnos', icon: 'briefcase-outline' as const }] },
  { title: 'Soporte', items: [{ label: 'Ayuda', icon: 'help-circle-outline' as const }, { label: 'Acerca de PRODEX', icon: 'information-circle-outline' as const }] },
];

export default function MoreScreen() {
  const { user, tenant, signOut } = useAuth();
  const displayName = user?.name ?? user?.email ?? 'Usuario PRODEX';
  const tenantName = tenant?.company_name ? String(tenant.company_name) : 'Empresa activa';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Más" subtitle="Cuenta, soporte y configuración" icon="menu-outline" />
        <FadeInView style={styles.account}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.accountCopy}><Text style={styles.accountLabel}>Sesión activa</Text><Text style={styles.name} numberOfLines={1}>{displayName}</Text><Text style={styles.tenant} numberOfLines={1}>{tenantName}</Text></View>
        </FadeInView>
        {groups.map((group, groupIndex) => <FadeInView key={group.title} delay={groupIndex * 35} style={styles.group}><Text style={styles.groupTitle}>{group.title}</Text><View style={styles.groupCard}>{group.items.map((item) => <PressableScale key={item.label} accessibilityLabel={item.label} accessibilityRole="button" style={styles.option}><View style={styles.optionIcon}><Ionicons name={item.icon} size={18} color={colors.inkMuted} /></View><Text style={styles.optionLabel}>{item.label}</Text><Ionicons name="chevron-forward" size={17} color={colors.inkMuted} /></PressableScale>)}</View></FadeInView>)}
        <PressableScale accessibilityLabel="Cerrar sesión" accessibilityRole="button" onPress={signOut} style={styles.logout}><Ionicons name="log-out-outline" size={18} color={colors.red} /><Text style={styles.logoutText}>Cerrar sesión</Text></PressableScale>
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
  group: { marginTop: spacing.xl },
  groupTitle: { marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  groupCard: { ...surfaces.card, overflow: 'hidden' },
  option: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  optionIcon: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  optionLabel: { flex: 1, color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold },
  logout: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, borderRadius: radii.md, backgroundColor: colors.redSoft },
  logoutText: { color: colors.red, fontSize: typography.button, fontWeight: fontWeights.semibold },
});
