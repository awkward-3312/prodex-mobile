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
      <View style={styles.bottom}><Text style={styles.label}>{label}</Text><Ionicons name="arrow-forward" size={16} color={colors.inkMuted} /></View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  action: { ...surfaces.compactCard, flexBasis: '46%', flexGrow: 1, minHeight: 126, padding: spacing.lg, alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: fontWeights.semibold },
});
