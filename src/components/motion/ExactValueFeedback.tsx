import { useEffect, useRef } from 'react';
import type { TextProps } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { prodexEasing } from './easing';
import { useProdexMotion } from './useProdexMotion';

type Props = TextProps & {
  value: string | number;
  scaleFrom?: number;
};

/**
 * Keeps the rendered value exact while giving each committed change one short,
 * replaceable emphasis. Rapid updates cancel the previous timing instead of
 * queueing a sequence.
 */
export function ExactValueFeedback({ value, scaleFrom = 0.97, style, ...props }: Props) {
  const { reducedMotion, durations } = useProdexMotion();
  const progress = useSharedValue(1);
  const previousValue = useRef(value);

  useEffect(() => {
    if (Object.is(previousValue.current, value)) return;
    previousValue.current = value;
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration: durations.touch, easing: prodexEasing.standard });
  }, [durations.touch, progress, value]);

  useEffect(() => () => cancelAnimation(progress), [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.68 + (0.32 * progress.value),
    transform: [{ scale: reducedMotion ? 1 : scaleFrom + ((1 - scaleFrom) * progress.value) }],
  }));

  return <Animated.Text {...props} style={[style, animatedStyle]}>{value}</Animated.Text>;
}
