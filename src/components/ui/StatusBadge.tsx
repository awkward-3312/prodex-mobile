import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fontWeights, radii, spacing } from '../../theme';

export type StatusTone = 'positive' | 'warning' | 'critical';

const TONES: Record<StatusTone, { background: string; foreground: string }> = {
  positive: { background: colors.brandSoft, foreground: colors.brand },
  warning: { background: colors.amberSoft, foreground: colors.amber },
  critical: { background: colors.redSoft, foreground: colors.red },
};

type Props = { label: string; tone: StatusTone; style?: StyleProp<ViewStyle> };

/** Shared badge shell for stock exceptions (ProductCard, InventoryRow) and payment status (SaleRow) — one pill treatment, semantic tones only, never used to convey status by color alone. */
export function StatusBadge({ label, tone, style }: Props) {
  const colorSet = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colorSet.background }, style]}>
      <Text style={[styles.text, { color: colorSet.foreground }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill },
  text: { fontSize: 11, fontWeight: fontWeights.semibold },
});
