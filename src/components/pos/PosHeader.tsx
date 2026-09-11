import { UserAvatar } from '../ui/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { colors, fontWeights, spacing, typography } from '../../theme';

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

export function PosHeader() {
  const { operationalContext } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>Punto de venta</Text>
        <View style={styles.location}><Ionicons name="business-outline" size={14} color={colors.brand} /><Text style={styles.locationText} numberOfLines={1}>{locationLabel(operationalContext)}</Text></View>
      </View>
      <UserAvatar />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 76, gap: spacing.md, paddingVertical: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: typography.title, lineHeight: 30, fontWeight: fontWeights.bold },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  locationText: { flexShrink: 1, color: colors.inkMuted, fontSize: typography.caption, lineHeight: 16, fontWeight: fontWeights.medium },
});
