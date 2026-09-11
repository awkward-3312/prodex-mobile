import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './motion';
import { colors, fontWeights, radii, spacing, surfaces } from '../theme';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  onPress: () => void;
};

/** Neutral surface with a single accent icon — brand/category color stays on the icon only, never the whole tile, so real shortcuts don't read as decorative ecommerce tiles. */
export function QuickAction({ label, icon, color, backgroundColor, onPress }: Props) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
    >
      <View style={[styles.iconWrap, { backgroundColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  action: { ...surfaces.compactCard, width: '48%', minHeight: 76, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, fontSize: 13, fontWeight: fontWeights.semibold, textAlign: 'center' },
});
