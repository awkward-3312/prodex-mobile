import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing, typography } from '../theme';

type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

export function PlaceholderScreen({ title, description, icon, tone }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: tone }]}><Ionicons name={icon} size={32} color={colors.brand} /></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.status}><View style={styles.dot} /><Text style={styles.statusText}>Módulo en preparación</Text></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  icon: { width: 76, height: 76, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  title: { marginTop: spacing.xl, color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  description: { maxWidth: 280, marginTop: spacing.sm, color: colors.inkMuted, fontSize: typography.body, lineHeight: 21, textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surface, ...shadows.card },
  dot: { width: 7, height: 7, borderRadius: radii.pill, backgroundColor: colors.amber },
  statusText: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: '700' },
});
