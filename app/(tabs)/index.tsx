import { UserAvatar } from '../../src/components/ui/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuickAction } from '../../src/components/QuickAction';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontWeights, radii, spacing, typography } from '../../src/theme';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function entityName(value: unknown) {
  return isRecord(value) && typeof value.name === 'string' ? value.name : null;
}

export default function DashboardScreen() {
  const { user, tenant, operationalContext } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  const greeting = firstName ? `Buenos días, ${firstName}` : 'Buenos días';
  const companyName = tenant?.company_name ? String(tenant.company_name) : 'Empresa activa';
  const branchName = entityName(operationalContext?.branch) ?? entityName(operationalContext?.inventory_location) ?? 'Ubicación activa';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Inicio" subtitle={greeting} trailing={<UserAvatar />} />

        <View style={styles.locationRow}>
          <Ionicons name="business-outline" size={16} color={colors.ink} />
          <View style={styles.locationCopy}>
            <Text style={styles.company} numberOfLines={1}>{companyName}</Text>
            <Text style={styles.location} numberOfLines={1}>{branchName}</Text>
          </View>
        </View>

        <Text style={styles.actionsTitle}>Accesos rápidos</Text>
        <View style={styles.actionsGrid}>
          <QuickAction label="Nueva venta" icon="cart-outline" color={colors.brand} backgroundColor={colors.brandSoft} onPress={() => router.push('/(tabs)/pos')} />
          <QuickAction label="Escanear código" icon="scan-outline" color={colors.blue} backgroundColor={colors.blueSoft} onPress={() => router.push('/pos/scanner')} />
          <QuickAction label="Inventario" icon="cube-outline" color={colors.teal} backgroundColor={colors.tealSoft} onPress={() => router.push('/(tabs)/inventory')} />
          <QuickAction label="Ventas" icon="receipt-outline" color={colors.amber} backgroundColor={colors.amberSoft} onPress={() => router.push('/(tabs)/sales')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  locationCopy: { flex: 1, minWidth: 0 },
  company: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.bold, lineHeight: 18 },
  location: { marginTop: 2, color: colors.inkMuted, fontSize: 12, fontWeight: fontWeights.medium, lineHeight: 16 },
  actionsTitle: { marginTop: spacing.xl, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
});
