import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '../../theme';
import { prodexEasing } from './easing';
import { useProdexMotion } from './useProdexMotion';

type Props = Omit<ViewProps, 'children' | 'style'> & {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeInView({ children, delay = 0, distance = motion.distance.content, duration = motion.duration.content, style, ...viewProps }: Props) {
  const { reducedMotion, durations, distances } = useProdexMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reducedMotion ? distances.content : distance);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const effectiveDuration = reducedMotion ? durations.touch : duration;
    const start = () => {
      if (!active) return;
      opacity.value = withTiming(1, { duration: effectiveDuration, easing: prodexEasing.enter });
      translateY.value = withTiming(0, { duration: effectiveDuration, easing: prodexEasing.enter });
    };

    if (!reducedMotion && delay > 0) timeout = setTimeout(start, delay);
    else start();

    return () => {
      active = false;
      if (timeout !== undefined) clearTimeout(timeout);
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [delay, duration, durations.touch, opacity, reducedMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View {...viewProps} style={[style, animatedStyle]}>{children}</Animated.View>;
}
