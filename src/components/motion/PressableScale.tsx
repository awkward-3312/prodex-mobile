import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import type { GestureResponderEvent, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';

import { motion } from '../../theme';
import { prodexEasing } from './easing';
import { useProdexMotion } from './useProdexMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle | AnimatedStyle<ViewStyle>>;
};

export const PressableScale = forwardRef<View, Props>(function PressableScale({ children, disabled, onPressIn, onPressOut, scaleTo = motion.pressScale, style, ...props }, ref) {
  const { reducedMotion, durations } = useProdexMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? motion.opacity.disabled : opacity.value,
  }));

  const animateTo = (nextValue: number) => {
    scale.value = reducedMotion
      ? withTiming(1, { duration: durations.touch, easing: prodexEasing.standard })
      : withSpring(nextValue, motion.springs.press);
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      animateTo(scaleTo);
      opacity.value = withTiming(motion.opacity.press, { duration: durations.touch, easing: prodexEasing.standard });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1);
    opacity.value = withTiming(1, { duration: durations.touch, easing: prodexEasing.standard });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      ref={ref}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});
