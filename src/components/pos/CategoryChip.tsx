import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type Props = { label: string; selected: boolean; onPress: () => void };

export function CategoryChip({ label, selected, onPress }: Props) {
  return (
    <Pressable accessibilityLabel={`Filtrar por ${label}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand },
  label: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  selectedLabel: { color: colors.white },
  pressed: { opacity: 0.75 },
});
