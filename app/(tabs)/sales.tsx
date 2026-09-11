import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, radii, spacing, surfaces, typography } from '../../src/theme';

export default function SalesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Ventas" subtitle="Historial y estados de cobro" icon="receipt-outline" />
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Total reciente</Text>
            <Text style={styles.heroValue}>--</Text>
          </View>
          <View style={styles.heroIcon}><Ionicons name="analytics-outline" size={22} color={colors.brand} /></View>
        </View>
        <View style={styles.filterRow}>
          {['Todas', 'Pagadas', 'Pendientes'].map((label, index) => <View key={label} style={[styles.filter, index === 0 && styles.filterActive]}><Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{label}</Text></View>)}
        </View>
        <Text style={styles.sectionTitle}>Ventas recientes</Text>
        <View style={styles.listCard}><EmptyState icon="receipt-outline" title="Ventas pendientes de integración" message="La estructura visual está lista para conectar el historial real más adelante." compact /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: { ...surfaces.card, minHeight: 98, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  heroLabel: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800' },
  heroValue: { marginTop: spacing.xs, color: colors.ink, fontSize: 25, fontWeight: '800' },
  heroIcon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  filter: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  listCard: { ...surfaces.card, overflow: 'hidden' },
});
