import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '../../theme';

const reducedDurations = {
  ...motion.duration,
  state: motion.duration.touch,
  content: motion.duration.touch,
  overlay: motion.duration.touch,
  exit: motion.duration.touch,
  normal: motion.duration.touch,
  slow: motion.duration.touch,
} as const;

const reducedDistances = {
  inline: 0,
  content: 0,
  overlay: 0,
} as const;

const reducedScales = {
  press: 1,
  pressPrimary: 1,
  feedback: 1,
  emphasis: 1,
} as const;

const reducedStagger = {
  group: 0,
  list: 0,
  maxItems: motion.stagger.maxItems,
} as const;

/**
 * Central interpretation of the OS Reduced Motion preference. Consumers get
 * semantic values that keep short fades while removing translation, scale,
 * spring and stagger effects. `useReducedMotion` is safe on native and web;
 * a missing preference is treated as motion enabled.
 */
export function useProdexMotion() {
  const reducedMotion = useReducedMotion() ?? false;

  return useMemo(() => ({
    reducedMotion,
    durations: reducedMotion ? reducedDurations : motion.duration,
    distances: reducedMotion ? reducedDistances : motion.distance,
    scales: reducedMotion ? reducedScales : motion.scale,
    stagger: reducedMotion ? reducedStagger : motion.stagger,
  }), [reducedMotion]);
}
