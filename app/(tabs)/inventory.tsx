import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, spacing, surfaces, typography } from '../../src/theme';

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Inventario" subtitle="Existencias y alertas de reposición" icon="cube-outline" />
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Productos</Text><Text style={styles.summaryValue}>--</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Alertas</Text><Text style={[styles.summaryValue, { color: colors.amber }]}>--</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Existencias</Text>
        <View style={styles.listCard}><EmptyState icon="cube-outline" title="Inventario pendiente de integración" message="La búsqueda, los filtros y los registros aparecerán aquí cuando conectemos el módulo real." compact /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  summaryCard: { ...surfaces.card, flex: 1, padding: spacing.md },
  summaryLabel: { color: colors.inkMuted, fontSize: typography.label, fontWeight: '800' },
  summaryValue: { marginTop: spacing.xs, color: colors.ink, fontSize: typography.metric, fontWeight: '800' },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  listCard: { ...surfaces.card, overflow: 'hidden' },
});
