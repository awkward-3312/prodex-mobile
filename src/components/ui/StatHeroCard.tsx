import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fontWeights, radii, shadows, spacing, typography } from '../../theme';

export type StatHeroVariant = 'soft' | 'dark';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: StatHeroVariant;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single "big number" hero used for the day's/period's headline stat.
 * Replaces three near-identical, independently-styled hero cards
 * (Dashboard, Reports, Cash register) with one component and two
 * deliberate tones instead of accidental drift between them.
 */
export function StatHeroCard({ title, value, subtitle, icon, variant = 'soft', style }: Props) {
  const isDark = variant === 'dark';
  return (
    <View style={[styles.base, isDark ? styles.dark : styles.soft, style]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, isDark ? styles.titleDark : styles.titleSoft]} numberOfLines={1}>{title}</Text>
        {icon ? (
          <View style={[styles.iconBadge, isDark ? styles.iconBadgeDark : styles.iconBadgeSoft]}>
            <Ionicons name={icon} size={16} color={isDark ? colors.accent : colors.brand} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, isDark ? styles.valueDark : styles.valueSoft]} numberOfLines={1}>{value}</Text>
      {subtitle ? <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleSoft]} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.lg, padding: spacing.lg },
  soft: { backgroundColor: colors.accentSoft, borderTopWidth: 3, borderTopColor: colors.accent },
  dark: { backgroundColor: colors.navyDark, borderTopWidth: 3, borderTopColor: colors.accent, ...shadows.elevated },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.caption, fontWeight: fontWeights.semibold },
  titleSoft: { color: colors.brandDark },
  titleDark: { color: 'rgba(255,255,255,0.72)' },
  iconBadge: { width: 30, height: 30, borderRadius: radii.xs, alignItems: 'center', justifyContent: 'center' },
  iconBadgeSoft: { backgroundColor: colors.surface },
  iconBadgeDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  value: { marginTop: spacing.sm, fontSize: typography.hero, fontWeight: fontWeights.heavy, letterSpacing: -0.8 },
  valueSoft: { color: colors.brandDark },
  valueDark: { color: colors.white },
  subtitle: { marginTop: 2, fontSize: typography.caption, fontWeight: fontWeights.medium },
  subtitleSoft: { color: colors.ink },
  subtitleDark: { color: 'rgba(255,255,255,0.72)' },
});
