/** Colors sampled from the official PRODEX PNG artwork. */
const palette = {
  navy: '#142B3A',
  navyDark: '#102639',
  cyan: '#1DD0C6',
  cyanDark: '#087D78',
  cyanSoft: '#E2F8F6',
} as const;

export const colors = {
  ...palette,
  brand: palette.navy,
  brandDark: palette.navyDark,
  brandSoft: palette.cyanSoft,
  accent: palette.cyan,
  accentDark: palette.cyanDark,
  accentSoft: palette.cyanSoft,
  onAccent: palette.navyDark,
  ink: palette.navy,
  inkMuted: '#586E7C',
  inkOnDark: '#C4D4DE',
  canvas: '#F4F7FA',
  surface: '#FFFFFF',
  line: '#DCE5EB',
  // Compatibility aliases for existing contracts; presentation stays cyan.
  blue: palette.cyanDark,
  blueSoft: palette.cyanSoft,
  teal: palette.cyanDark,
  tealSoft: palette.cyanSoft,
  purple: palette.cyanDark,
  purpleSoft: palette.cyanSoft,
  success: '#23764B',
  successSoft: '#E8F5ED',
  green: '#23764B',
  greenSoft: '#E8F5ED',
  amber: '#986407',
  amberSoft: '#FFF3D6',
  red: '#B43F48',
  redSoft: '#FCE7E7',
  white: '#FFFFFF',
  backdrop: 'rgba(16, 38, 57, 0.46)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  xs: 8,
  sm: 14,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const typography = {
  hero: 34,
  display: 28,
  title: 24,
  subtitle: 16,
  body: 14,
  caption: 12,
  metric: 24,
  button: 14,
  label: 11,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const shadows = {
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  /** Heavier lift for sheets/modals/dialogs sitting above the whole screen. */
  elevated: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
} as const;

export const sizing = {
  headerAvatar: 46,
  touch: 44,
  input: 52,
  button: 52,
  iconButton: 44,
} as const;

const motionSprings = {
  press: {
    damping: 18,
    stiffness: 260,
    mass: 0.7,
  },
  selection: {
    damping: 22,
    stiffness: 320,
    mass: 0.65,
  },
  sheet: {
    damping: 28,
    stiffness: 300,
    mass: 0.9,
  },
  success: {
    damping: 16,
    stiffness: 240,
    mass: 0.75,
  },
} as const;

export const motion = {
  duration: {
    none: 0,
    touch: 140,
    state: 180,
    content: 210,
    overlay: 280,
    exit: 160,
    // Compatibility aliases for existing consumers.
    fast: 140,
    normal: 210,
    slow: 280,
  },
  distance: {
    inline: 4,
    content: 8,
    overlay: 18,
  },
  scale: {
    press: 0.98,
    pressPrimary: 0.99,
    feedback: 1.035,
    emphasis: 1.08,
  },
  opacity: {
    inactive: 0.8,
    press: 0.86,
    disabled: 0.55,
  },
  stagger: {
    group: 24,
    list: 32,
    maxItems: 8,
  },
  gesture: {
    sheet: {
      activationDistance: 8,
      horizontalTolerance: 24,
      dismissDistance: 96,
      dismissVelocity: 900,
    },
  },
  /** Cubic Bézier control points converted to Reanimated easing functions by the motion layer. */
  easing: {
    standard: [0.2, 0, 0, 1],
    enter: [0, 0, 0, 1],
    exit: [0.4, 0, 1, 1],
    emphasis: [0.2, 0, 0, 1],
  },
  springs: motionSprings,
  // Compatibility aliases for existing consumers.
  pressScale: 0.98,
  pressScalePrimary: 0.99,
  spring: motionSprings.press,
} as const;

export const surfaces = {
  card: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  compactCard: {
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    minHeight: sizing.input,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
} as const;

export const semantic = {
  positive: colors.success,
  info: colors.accentDark,
  inventory: colors.accentDark,
  warning: colors.amber,
  critical: colors.red,
} as const;
