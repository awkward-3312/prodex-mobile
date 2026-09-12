import type { ReactNode } from 'react';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { motion } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

export function PressableScale({ children, disabled, onPressIn, onPressOut, scaleTo = motion.pressScale, style, ...props }: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.55 : opacity.value,
  }));

  const animateTo = (nextValue: number) => {
    scale.value = reducedMotion
      ? withTiming(1, { duration: motion.duration.fast })
      : withSpring(nextValue, motion.spring);
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      animateTo(scaleTo);
      opacity.value = withTiming(0.86, { duration: motion.duration.fast });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1);
    opacity.value = withTiming(1, { duration: motion.duration.fast });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
