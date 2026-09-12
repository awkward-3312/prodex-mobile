import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FadeInView, PressableScale } from '../motion';
import { colors, fontWeights, radii, sizing, spacing, typography } from '../../theme';

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
    <FadeInView style={[styles.wrap, compact && styles.compact]} distance={6}>
      <View style={styles.icon}><Ionicons name={icon} size={compact ? 22 : 28} color={colors.brand} /></View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <PressableScale accessibilityLabel={actionLabel} accessibilityRole="button" onPress={onAction} style={styles.action}><Text style={styles.actionText}>{actionLabel}</Text></PressableScale> : null}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  compact: { paddingVertical: spacing.xl },
  icon: { width: 76, height: 76, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderWidth: 5, borderColor: colors.surface },
  title: { marginTop: spacing.md, color: colors.ink, fontSize: typography.subtitle, fontWeight: fontWeights.bold, textAlign: 'center' },
  message: { maxWidth: 300, marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
  action: { minHeight: sizing.touch, marginTop: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  actionText: { color: colors.white, fontSize: typography.button, fontWeight: fontWeights.semibold },
});
