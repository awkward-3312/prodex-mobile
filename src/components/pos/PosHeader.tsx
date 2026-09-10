import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appConfig } from '../../config/app';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  onOptionsPress: () => void;
};

export function PosHeader({ onOptionsPress }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>Punto de venta</Text>
        <View style={styles.location}><Ionicons name="business-outline" size={14} color={colors.brand} /><Text style={styles.locationText}>{appConfig.activeLocation}</Text></View>
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
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  locationText: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: '600' },
  options: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  pressed: { opacity: 0.7 },
});
