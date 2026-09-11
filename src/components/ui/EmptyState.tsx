import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, sizing, spacing, typography } from '../../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({ icon, title, message, actionLabel, onAction, compact = false }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.icon}><Ionicons name={icon} size={compact ? 22 : 28} color={colors.brand} /></View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <Pressable accessibilityLabel={actionLabel} accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={styles.actionText}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  compact: { paddingVertical: spacing.xl },
  icon: { width: 56, height: 56, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  title: { marginTop: spacing.md, color: colors.ink, fontSize: typography.subtitle, fontWeight: '800', textAlign: 'center' },
  message: { maxWidth: 300, marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
  action: { minHeight: sizing.touch, marginTop: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  actionText: { color: colors.white, fontSize: typography.button, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
