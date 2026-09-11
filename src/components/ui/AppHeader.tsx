import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../motion';
import { colors, fontWeights, radii, sizing, spacing, typography } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onBack?: () => void;
  action?: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    tone?: 'default' | 'warning';
  };
};

export function AppHeader({ title, subtitle, icon, onBack, action }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <PressableScale accessibilityLabel="Volver" accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </PressableScale>
      ) : icon ? (
        <View style={styles.iconBadge}><Ionicons name={icon} size={20} color={colors.ink} /></View>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <PressableScale accessibilityLabel={action.label} accessibilityRole="button" onPress={action.onPress} style={[styles.iconButton, action.tone === 'warning' && styles.warning]}>
          <Ionicons name={action.icon} size={21} color={action.tone === 'warning' ? colors.amber : colors.inkMuted} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold, lineHeight: 26 },
  subtitle: { marginTop: 2, color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.medium, lineHeight: 16 },
  iconButton: { width: sizing.iconButton, height: sizing.iconButton, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  iconBadge: { width: sizing.iconButton, height: sizing.iconButton, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  warning: { backgroundColor: colors.amberSoft, borderColor: colors.amberSoft },
});
