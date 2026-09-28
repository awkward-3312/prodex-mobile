import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { PressableScale } from './motion';
import { colors, fontWeights, radii, spacing, surfaces } from '../theme';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function QuickAction({ label, icon, onPress, primary = false, style }: Props) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, primary && styles.actionPrimary, style]}
    >
      <View style={[styles.iconWrap, primary ? styles.iconWrapPrimary : styles.iconWrapDefault]}>
        <Ionicons name={icon} size={20} color={primary ? colors.onAccent : colors.accentDark} />
      </View>
      <Text style={[styles.label, primary && styles.labelPrimary]} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  action: { ...surfaces.compactCard, flex: 1, minHeight: 84, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  actionPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  iconWrap: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  iconWrapDefault: { backgroundColor: colors.brandSoft },
  iconWrapPrimary: { backgroundColor: colors.accent },
  label: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.semibold, textAlign: 'center' },
  labelPrimary: { color: colors.white },
});
