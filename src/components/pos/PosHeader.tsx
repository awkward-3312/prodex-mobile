import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { colors, fontWeights, radii, sizing, spacing, typography } from '../../theme';

type Props = {
  onOptionsPress: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function entityName(value: unknown) {
  return isRecord(value) && typeof value.name === 'string' ? value.name : null;
}

function locationLabel(operationalContext: unknown) {
  if (!isRecord(operationalContext)) return 'Contexto operativo no disponible';
  return [entityName(operationalContext.branch), entityName(operationalContext.inventory_location), entityName(operationalContext.cash_drawer)].filter(Boolean).join(' · ') || 'Contexto operativo no disponible';
}

export function PosHeader({ onOptionsPress }: Props) {
  const { operationalContext } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>Punto de venta</Text>
        <View style={styles.location}><Ionicons name="business-outline" size={14} color={colors.brand} /><Text style={styles.locationText} numberOfLines={1}>{locationLabel(operationalContext)}</Text></View>
      </View>
      <Pressable accessibilityLabel="Opciones del punto de venta" accessibilityRole="button" onPress={onOptionsPress} style={({ pressed }) => [styles.options, pressed && styles.pressed]}>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.sm },
  copy: { flex: 1, paddingRight: spacing.md },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  locationText: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold },
  options: { width: sizing.iconButton, height: sizing.iconButton, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.7 },
});
