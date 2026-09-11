export const colors = {
  brand: '#0D8B68',
  brandDark: '#08634C',
  brandSoft: '#DDF5EC',
  ink: '#17324D',
  inkMuted: '#66788A',
  canvas: '#F6F8F7',
  surface: '#FFFFFF',
  line: '#E5EBE8',
  blue: '#2574D8',
  blueSoft: '#E7F0FF',
  teal: '#0FA7A0',
  tealSoft: '#DFF7F4',
  amber: '#D98E04',
  amberSoft: '#FFF3D6',
  red: '#C94C4C',
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
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const typography = {
  display: 28,
  title: 21,
  subtitle: 16,
  body: 14,
  caption: 12,
  metric: 24,
  button: 13,
  label: 11,
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
  touch: 44,
  input: 48,
  button: 48,
  iconButton: 44,
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
