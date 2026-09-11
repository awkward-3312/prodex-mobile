import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '../motion';
import { colors, fontWeights, radii, spacing, typography } from '../../theme';

type Props = { label: string; selected: boolean; onPress: () => void };

export function CategoryChip({ label, selected, onPress }: Props) {
  return (
    <PressableScale accessibilityLabel={`Filtrar por ${label}`} accessibilityRole="button" accessibilityState={{ selected }} hitSlop={{ top: 4, bottom: 4 }} onPress={onPress} style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand },
  label: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold },
  selectedLabel: { color: colors.white },
});
