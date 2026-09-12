export const colors = {
  brand: '#087F62',
  brandDark: '#08634C',
  brandSoft: '#DDF5EC',
  ink: '#193C38',
  inkMuted: '#637873',
  canvas: '#F3F7F5',
  surface: '#FFFFFF',
  line: '#DFE9E4',
  blue: '#2574D8',
  blueSoft: '#E7F0FF',
  teal: '#087E78',
  tealSoft: '#DFF7F4',
  amber: '#986407',
  amberSoft: '#FFF3D6',
  red: '#B43F48',
  redSoft: '#FCE7E7',
  purple: '#7758C7',
  purpleSoft: '#F0EBFF',
  white: '#FFFFFF',
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
    shadowColor: '#17324D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
} as const;

export const sizing = {
  headerAvatar: 46,
  touch: 44,
  input: 52,
  button: 52,
  iconButton: 44,
} as const;

export const motion = {
  duration: {
    fast: 140,
    normal: 210,
    slow: 280,
  },
  pressScale: 0.98,
  pressScalePrimary: 0.99,
  spring: {
    damping: 18,
    stiffness: 260,
    mass: 0.7,
  },
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
  positive: colors.brand,
  info: colors.blue,
  inventory: colors.teal,
  warning: colors.amber,
  critical: colors.red,
} as const;
