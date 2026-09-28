import { Easing } from 'react-native-reanimated';

import { motion } from '../../theme';

const bezier = (curve: readonly [number, number, number, number]) => Easing.bezier(...curve);

export const prodexEasing = {
  standard: bezier(motion.easing.standard),
  enter: bezier(motion.easing.enter),
  exit: bezier(motion.easing.exit),
  emphasis: bezier(motion.easing.emphasis),
} as const;
