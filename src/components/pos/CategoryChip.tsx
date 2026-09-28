import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { cancelAnimation, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PressableScale } from '../motion';
import { useProdexMotion } from '../motion/useProdexMotion';
import { colors, fontWeights, radii, spacing, typography } from '../../theme';
import { prodexEasing } from '../motion/easing';

type Props = { label: string; selected: boolean; onPress: () => void; motionEnabled?: boolean };

function StaticCategoryChip({ label, selected, onPress }: Omit<Props, 'motionEnabled'>) {
  return (
    <PressableScale accessibilityLabel={`Filtrar por ${label}`} accessibilityRole="button" accessibilityState={{ selected }} hitSlop={{ top: 4, bottom: 4 }} onPress={onPress} style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </PressableScale>
  );
}

function MotionCategoryChip({ label, selected, onPress }: Omit<Props, 'motionEnabled'>) {
  const { durations } = useProdexMotion();
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    cancelAnimation(selection);
    selection.value = withTiming(selected ? 1 : 0, { duration: durations.state, easing: prodexEasing.standard });
  }, [durations.state, selected, selection]);

  useEffect(() => () => cancelAnimation(selection), [selection]);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selection.value, [0, 1], [colors.surface, colors.accent]),
    borderColor: interpolateColor(selection.value, [0, 1], [colors.line, colors.accentDark]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value, [0, 1], [colors.inkMuted, colors.onAccent]),
  }));

  return (
    <PressableScale accessibilityLabel={`Filtrar por ${label}`} accessibilityRole="button" accessibilityState={{ selected }} hitSlop={{ top: 4, bottom: 4 }} onPress={onPress} style={[styles.chip, chipStyle]}>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </PressableScale>
  );
}

export function CategoryChip({ motionEnabled = false, ...props }: Props) {
  return motionEnabled ? <MotionCategoryChip {...props} /> : <StaticCategoryChip {...props} />;
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  selected: { backgroundColor: colors.accent, borderColor: colors.accentDark },
  label: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.semibold },
  selectedLabel: { color: colors.onAccent },
});
