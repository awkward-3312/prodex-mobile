import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor }, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={25} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { width: '48%', minHeight: 76, padding: spacing.md, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  iconWrap: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
