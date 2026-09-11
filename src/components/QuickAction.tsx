import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './motion';
import { colors, radii, spacing } from '../theme';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  onPress?: () => void;
};

export function QuickAction({ label, icon, color, backgroundColor, onPress }: Props) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, { backgroundColor }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={25} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  action: { width: '48%', minHeight: 76, padding: spacing.md, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
