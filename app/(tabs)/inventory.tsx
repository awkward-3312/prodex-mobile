import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../../src/components/ui/AppHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, radii, spacing, surfaces, typography } from '../../src/theme';

const filters = ['Todos', 'Bajo stock', 'Sin stock'];

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppHeader title="Inventario" subtitle="Existencias y alertas de reposición" icon="cube-outline" />
        <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={colors.inkMuted} /><TextInput editable={false} pointerEvents="none" placeholder="Buscar producto, SKU o código" placeholderTextColor={colors.inkMuted} style={styles.searchInput} /></View>
        <View style={styles.filters}>{filters.map((filter, index) => <View key={filter} style={[styles.filter, index === 0 && styles.filterActive]}><Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{filter}</Text></View>)}</View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Productos</Text><Text style={styles.summaryValue}>--</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Alertas</Text><Text style={[styles.summaryValue, { color: colors.amber }]}>--</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Existencias</Text>
        <View style={styles.listCard}><EmptyState icon="cube-outline" title="Inventario pendiente de integración" message="La vista ya está preparada; los registros aparecerán cuando conectemos el módulo real." compact /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  searchBox: { ...surfaces.input, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.ink, fontSize: typography.body },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  filter: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  summaryCard: { ...surfaces.card, flex: 1, padding: spacing.md },
  summaryLabel: { color: colors.inkMuted, fontSize: typography.label, fontWeight: '800' },
  summaryValue: { marginTop: spacing.xs, color: colors.ink, fontSize: typography.metric, fontWeight: '800' },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  listCard: { ...surfaces.card, overflow: 'hidden' },
});
