import { colors, motion } from '../theme';

export type RootRouteName =
  | 'login'
  | '(tabs)'
  | 'clients/index'
  | 'clients/[id]'
  | 'clients/manage'
  | 'sales/[id]'
  | 'cash-register/index'
  | 'cash-register/open'
  | 'cash-register/close'
  | 'reports/index'
  | 'pos/checkout'
  | 'pos/scanner';

export const rootRoutes: RootRouteName[] = [
  'login',
  '(tabs)',
  'clients/index',
  'clients/[id]',
  'clients/manage',
  'sales/[id]',
  'cash-register/index',
  'cash-register/open',
  'cash-register/close',
  'reports/index',
  'pos/checkout',
  'pos/scanner',
];

export function getRootStackOptions(reducedMotion: boolean) {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: colors.canvas },
    presentation: 'card' as const,
    animation: reducedMotion ? 'fade' as const : 'default' as const,
    animationDuration: reducedMotion ? motion.duration.touch : undefined,
    gestureEnabled: true,
    gestureDirection: 'horizontal' as const,
  };
}

export function getRootRouteOptions(route: RootRouteName, reducedMotion: boolean) {
  if (route === 'login' || route === '(tabs)') {
    return {
      animation: 'fade' as const,
      animationDuration: reducedMotion ? motion.duration.touch : motion.duration.state,
      gestureEnabled: false,
    };
  }

  if (route === 'pos/scanner') {
    return {
      presentation: 'fullScreenModal' as const,
      animation: 'fade' as const,
      gestureEnabled: false,
    };
  }

  if (route === 'clients/manage') {
    return {
      presentation: 'modal' as const,
      animation: reducedMotion ? 'fade' as const : 'slide_from_bottom' as const,
      gestureEnabled: true,
    };
  }

  return {
    presentation: 'card' as const,
    animation: reducedMotion ? 'fade' as const : 'default' as const,
  };
}
