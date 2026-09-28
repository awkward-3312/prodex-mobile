import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { prodexEasing } from '../motion/easing';
import { useProdexMotion } from '../motion/useProdexMotion';
import { colors, fontWeights, motion, radii } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function useTabSelectionProgress(focused: boolean) {
  const { durations } = useProdexMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: durations.state,
      easing: prodexEasing.standard,
    });
  }, [durations.state, focused, progress]);

  return progress;
}

export function ProdexTabItem({ activeName, focused, inactiveName, label }: { activeName: IconName; focused: boolean; inactiveName: IconName; label: string }) {
  const { scales } = useProdexMotion();
  const progress = useTabSelectionProgress(focused);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: motion.opacity.inactive + progress.value * (1 - motion.opacity.inactive),
    transform: [{ scale: 1 + progress.value * (scales.feedback - 1) }],
  }));
  const pillStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inkMuted, colors.brand]),
    opacity: motion.opacity.inactive + progress.value * (1 - motion.opacity.inactive),
  }));

  return (
    <Animated.View accessibilityElementsHidden accessible={false} importantForAccessibility="no-hide-descendants" style={styles.item} testID="prodex-tab-item">
      <Animated.View style={[styles.iconSlot, iconStyle]} testID="prodex-tab-icon">
        <Animated.View style={[styles.pill, pillStyle]} testID="prodex-tab-pill" />
        <Animated.View style={[styles.glyph, inactiveIconStyle]} testID="prodex-tab-icon-inactive">
          <Ionicons name={inactiveName} size={23} color={colors.inkMuted} />
        </Animated.View>
        <Animated.View style={[styles.glyph, activeIconStyle]} testID="prodex-tab-icon-active">
          <Ionicons name={activeName} size={23} color={colors.brand} />
        </Animated.View>
      </Animated.View>
      <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]} testID="prodex-tab-label">{label}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: { minWidth: 56, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  iconSlot: { width: 46, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFill, borderRadius: radii.pill, backgroundColor: colors.accent },
  glyph: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  label: { maxWidth: 72, marginTop: 1, color: colors.inkMuted, fontSize: 11, lineHeight: 14, fontWeight: fontWeights.semibold, textAlign: 'center' },
});
